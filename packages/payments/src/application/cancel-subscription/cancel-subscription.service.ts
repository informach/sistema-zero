import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { SubscriptionMyReadRepository } from '../../domain/ports/subscription-my-read.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { DomainError } from '../../domain/shared/errors'
import type { CancellationContext } from '../../domain/subscription/cancellation-record'
import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import {
  createSubscriptionOperation,
  type SubscriptionOperationRepository,
} from '../../domain/subscription/subscription-operation'
import type {
  RecoveryLease,
  SubscriptionRecoveryRepository,
} from '../../domain/subscription-recovery/recovery-repository.port'
import type { Logger } from '../../infrastructure/logging/logger'
import {
  type MySubscriptionView,
  type SubscriptionView,
  toMySubscriptionView,
  toSubscriptionView,
} from '../mappers/subscription-view'
import type { RecoveryNoticeService } from '../subscription-recovery/recovery-notice.service'
import type { RecoverySourceService } from '../subscription-recovery/recovery-source.service'

interface RecoveryCancellationAuthority {
  cases: Pick<SubscriptionRecoveryRepository, 'assertOwned'>
  source: Pick<RecoverySourceService, 'inspect'>
  notices: Pick<RecoveryNoticeService, 'initialHealthy'>
  effectBudgetMs: number
}

/**
 * Caso de uso: cancela uma assinatura. Idempotente: cancelar uma já cancelada é
 * no-op (não chama a Efí de novo).
 */
export class CancelSubscriptionService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly gateway: PaymentGateway,
    private readonly logger: Logger,
    private readonly operations: SubscriptionOperationRepository,
    /** Leitura escopada por e-mail — exigida SÓ pelo `executeForEmail` (self-service). */
    private readonly myRead?: SubscriptionMyReadRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly reclaimAfterMs = 120_000,
    private readonly recovery?: RecoveryCancellationAuthority,
  ) {}

  /**
   * Cancelamento do CONSUMIDOR — **escopado** (anti-IDOR): só o dono cancela;
   * assinatura de outro é tratada como inexistente (404).
   */
  async execute(consumerId: string, id: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription || subscription.consumerId !== consumerId) {
      throw new SubscriptionNotFoundError(id)
    }
    return this.cancel(subscription, { origin: 'CONSUMER', actorId: consumerId })
  }

  /** Cancelamento ADMIN (painel) — **cross-consumer** (não escopado). */
  async executeAdmin(id: string, actorId: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription) throw new SubscriptionNotFoundError(id)
    return this.cancel(subscription, { origin: 'ADMIN', actorId })
  }

  /** Reconciliation of an already recorded request cannot invent an administrator. */
  async resume(id: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription) throw new SubscriptionNotFoundError(id)
    return this.cancel(subscription, null)
  }

  /** Only a persisted D7 decision and its current case lease authorize this path. */
  async executeForRecovery(lease: RecoveryLease): Promise<SubscriptionView> {
    await this.assertRecoveryAuthority(lease)
    const item = lease.item.toSnapshot()
    const subscription = await this.subscriptions.findById(item.subscriptionId)
    if (!subscription || subscription.consumerId !== item.consumerId)
      throw new SubscriptionNotFoundError(item.subscriptionId)
    return this.cancel(
      subscription,
      { origin: 'NONPAYMENT', actorId: 'system:subscription-recovery', recoveryCaseId: item.id },
      async (executionId) => this.assertRecoveryAuthority(lease, executionId),
      lease.leaseUntil,
    )
  }

  private async assertRecoveryAuthority(lease: RecoveryLease, executionId?: string): Promise<void> {
    const authority = this.recovery
    const item = lease.item.toSnapshot()
    if (
      !authority ||
      item.state !== 'CANCEL_PENDING' ||
      !item.deadlineAt ||
      !item.initialNoticeId ||
      this.clock() < item.deadlineAt
    )
      throw new SubscriptionCancellationPendingError()
    await authority.cases.assertOwned(lease, this.clock(), authority.effectBudgetMs + 30_000)
    if (!(await authority.notices.initialHealthy(lease)))
      throw new SubscriptionCancellationPendingError()
    const proof = await authority.source.inspect(item, executionId)
    if (
      proof.subscriptionStatus !== 'ACTIVE' ||
      proof.paymentStatus !== 'FAILED' ||
      proof.paymentOperationPending ||
      (executionId && proof.cancellationOperationPending) ||
      !proof.chargeCreatedAt
    )
      throw new SubscriptionCancellationPendingError()
    const subscription = await this.subscriptions.findById(item.subscriptionId)
    if (
      !subscription ||
      subscription.consumerId !== item.consumerId ||
      subscription.providerSubscriptionId !== item.providerSubscriptionId ||
      (subscription.cancelRequestedAt &&
        (subscription.cancellationRecord?.origin !== 'NONPAYMENT' ||
          subscription.cancellationRecord.recoveryCaseId !== item.id))
    )
      throw new SubscriptionCancellationPendingError()
    await authority.cases.assertOwned(lease, this.clock(), authority.effectBudgetMs + 30_000)
  }

  /**
   * Cancelamento SELF-SERVICE do assinante ("minhas assinaturas"): escopado pelo
   * E-MAIL das claims (anti-IDOR — id de outro e-mail = inexistente/404). O
   * acesso segue até o fim do ciclo pago + carência (o members expira sozinho —
   * cancelar NÃO revoga na hora).
   */
  async executeForEmail(email: string, id: string, actorId: string): Promise<MySubscriptionView> {
    if (!this.myRead) throw new Error('executeForEmail exige o SubscriptionMyReadRepository')
    const scoped = await this.myRead.findByEmailAndId(email, id)
    if (!scoped) throw new SubscriptionNotFoundError(id)
    await this.cancel(scoped, { origin: 'CUSTOMER', actorId })
    const fresh = await this.subscriptions.findById(scoped.id)
    if (!fresh) throw new SubscriptionNotFoundError(scoped.id)
    return toMySubscriptionView(fresh)
  }

  private async cancel(
    subscription: SubscriptionAggregate,
    context: CancellationContext | null,
    beforeAutomaticEffect?: (executionId: string) => Promise<void>,
    automaticDeadline?: Date,
  ): Promise<SubscriptionView> {
    if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED')
      return toSubscriptionView(subscription)

    // Antes da rede: uma aba com intenção de cartão já aberta perde autoridade.
    if (context && subscription.requestCancellation(context, this.clock()))
      await this.subscriptions.save(subscription)
    // Automatic nonpayment requests belong to the recovery coordinator, which
    // rechecks the charge and deadline. The generic cancellation scan cannot bypass it.
    if (
      !subscription.cancelRequestedAt ||
      !subscription.cancellationRecord ||
      (subscription.cancellationRecord.origin === 'NONPAYMENT' && !beforeAutomaticEffect) ||
      (beforeAutomaticEffect &&
        (subscription.cancellationRecord.origin !== 'NONPAYMENT' ||
          subscription.cancellationRecord.recoveryCaseId !==
            (context?.origin === 'NONPAYMENT' ? context.recoveryCaseId : null)))
    )
      throw new SubscriptionCancellationPendingError()
    if (!subscription.providerSubscriptionId) throw new SubscriptionCancellationPendingError()

    // A cancellation must not race an authorized debit: retry may reactivate a
    // provider subscription. Only unstarted intents can be retired here.
    await this.operations.rejectUnstartedForCancellation(subscription.id, this.clock())
    let active = await this.operations.findActiveForSubscription(subscription.id, this.clock())
    if (!active) {
      const candidate = createSubscriptionOperation({
        subscriptionId: subscription.id,
        consumerId: subscription.consumerId,
        providerSubscriptionId: subscription.providerSubscriptionId,
        kind: 'CANCEL',
        now: this.clock(),
      })
      if (!(await this.operations.create(candidate)))
        throw new SubscriptionCancellationPendingError()
      active = candidate
    }
    if (
      active.kind !== 'CANCEL' ||
      active.consumerId !== subscription.consumerId ||
      active.providerSubscriptionId !== subscription.providerSubscriptionId
    )
      throw new SubscriptionCancellationPendingError()
    const execution =
      active.state === 'READY'
        ? await this.operations.start(active.id, subscription.id, this.clock())
        : await this.operations.resumeCancellation(
            active.id,
            subscription.id,
            this.clock(),
            this.reclaimAfterMs,
          )
    if (!execution?.executionId) throw new SubscriptionCancellationPendingError()

    let confirmedStatus: 'CANCELED' | 'EXPIRED'
    try {
      // On resume, first reconcile the existing effect. Never blindly resend.
      let confirmed = await this.gateway.getSubscription(subscription.providerSubscriptionId)
      if (confirmed.providerSubscriptionId !== subscription.providerSubscriptionId)
        throw new SubscriptionCancellationPendingError()
      if (confirmed.status !== 'CANCELED' && confirmed.status !== 'EXPIRED') {
        if (beforeAutomaticEffect) {
          try {
            await beforeAutomaticEffect(execution.executionId)
          } catch {
            await this.operations.finish(
              execution.id,
              execution.executionId,
              'REJECTED',
              'RECOVERY_AUTHORIZATION_CHANGED',
              this.clock(),
            )
            throw new RecoveryCancellationAuthorizationChangedError()
          }
        }
        const current = await this.operations.findById(execution.id)
        const effectTime = this.clock()
        if (
          current?.state !== 'EXECUTING' ||
          current.executionId !== execution.executionId ||
          !current.startedAt ||
          effectTime < current.startedAt ||
          effectTime.getTime() - current.startedAt.getTime() >= this.reclaimAfterMs ||
          (automaticDeadline &&
            effectTime.getTime() + (this.recovery?.effectBudgetMs ?? 0) >=
              automaticDeadline.getTime())
        )
          throw new RecoveryCancellationAuthorizationChangedError()
        try {
          await this.gateway.cancelSubscription(subscription.providerSubscriptionId)
        } catch {
          /* GET decides whether the PUT was accepted. */
        }
        confirmed = await this.gateway.getSubscription(subscription.providerSubscriptionId)
      }
      if (
        confirmed.providerSubscriptionId !== subscription.providerSubscriptionId ||
        (confirmed.status !== 'CANCELED' && confirmed.status !== 'EXPIRED')
      )
        throw new SubscriptionCancellationPendingError()
      confirmedStatus = confirmed.status
      // Record the source-confirmed result before local lifecycle persistence. A
      // later database failure is resumed from that proof, without another debit.
      await this.operations.finish(
        execution.id,
        execution.executionId,
        'SUCCEEDED',
        confirmedStatus,
        this.clock(),
      )
    } catch (error) {
      if (error instanceof RecoveryCancellationAuthorizationChangedError)
        throw new SubscriptionCancellationPendingError()
      try {
        await this.operations.finish(
          execution.id,
          execution.executionId,
          'UNKNOWN',
          'PROVIDER_UNKNOWN',
          this.clock(),
        )
      } catch {
        /* Durable executing authority remains held. */
      }
      throw new SubscriptionCancellationPendingError()
    }
    // `save` usa a versão carregada; recarregar também preserva ciclos concorrentes.
    const fresh = await this.subscriptions.findById(subscription.id)
    if (!fresh) throw new SubscriptionNotFoundError(subscription.id)
    if (fresh.status !== 'CANCELED' && fresh.status !== 'EXPIRED') {
      if (confirmedStatus === 'EXPIRED') fresh.expire('EXTERNAL', this.clock())
      else fresh.cancel(this.clock())
      await this.subscriptions.save(fresh)
    }

    this.logger.info('subscription.cancellation.confirmed', {
      subscriptionId: subscription.id,
      consumerId: subscription.consumerId,
      status: fresh.status,
    })

    return toSubscriptionView(fresh)
  }
}

class RecoveryCancellationAuthorizationChangedError extends Error {}

export class SubscriptionCancellationPendingError extends DomainError {
  readonly code = 'SUBSCRIPTION_CANCELLATION_PENDING'
  constructor() {
    super(
      'Pedido de cancelamento registrado. Estamos confirmando o encerramento com a operadora; não faça uma nova assinatura enquanto isso.',
    )
  }
}
