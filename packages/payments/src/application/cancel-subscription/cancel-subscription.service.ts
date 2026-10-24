import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { SubscriptionMyReadRepository } from '../../domain/ports/subscription-my-read.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { DomainError } from '../../domain/shared/errors'
import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import {
  createSubscriptionOperation,
  type SubscriptionOperationRepository,
} from '../../domain/subscription/subscription-operation'
import type { Logger } from '../../infrastructure/logging/logger'
import {
  type MySubscriptionView,
  type SubscriptionView,
  toMySubscriptionView,
  toSubscriptionView,
} from '../mappers/subscription-view'

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
    return this.cancel(subscription)
  }

  /** Cancelamento ADMIN (painel) — **cross-consumer** (não escopado). */
  async executeAdmin(id: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription) throw new SubscriptionNotFoundError(id)
    return this.cancel(subscription)
  }

  /**
   * Cancelamento SELF-SERVICE do assinante ("minhas assinaturas"): escopado pelo
   * E-MAIL das claims (anti-IDOR — id de outro e-mail = inexistente/404). O
   * acesso segue até o fim do ciclo pago + carência (o members expira sozinho —
   * cancelar NÃO revoga na hora).
   */
  async executeForEmail(email: string, id: string): Promise<MySubscriptionView> {
    if (!this.myRead) throw new Error('executeForEmail exige o SubscriptionMyReadRepository')
    const scoped = await this.myRead.findByEmailAndId(email, id)
    if (!scoped) throw new SubscriptionNotFoundError(id)
    await this.cancel(scoped)
    const fresh = await this.subscriptions.findById(scoped.id)
    if (!fresh) throw new SubscriptionNotFoundError(scoped.id)
    return toMySubscriptionView(fresh)
  }

  private async cancel(subscription: SubscriptionAggregate): Promise<SubscriptionView> {
    if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED')
      return toSubscriptionView(subscription)

    // Antes da rede: uma aba com intenção de cartão já aberta perde autoridade.
    if (subscription.requestCancellation()) await this.subscriptions.save(subscription)
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
    } catch {
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
      if (confirmedStatus === 'EXPIRED') fresh.expire()
      else fresh.cancel()
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

export class SubscriptionCancellationPendingError extends DomainError {
  readonly code = 'SUBSCRIPTION_CANCELLATION_PENDING'
  constructor() {
    super(
      'Pedido de cancelamento registrado. Estamos confirmando o encerramento com a operadora; não faça uma nova assinatura enquanto isso.',
    )
  }
}
