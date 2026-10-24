import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { SubscriptionOperationRepository } from '../../domain/subscription/subscription-operation'
import type {
  RecoverySnapshot,
  RecoverySourceProof,
} from '../../domain/subscription-recovery/recovery-case'

/** Builds fresh evidence from the provider and the local ownership/operation ledger. */
export class RecoverySourceService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly operations: SubscriptionOperationRepository,
    private readonly gateway: PaymentGateway,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async inspect(
    item: RecoverySnapshot,
    ownCancellationExecutionId?: string,
  ): Promise<RecoverySourceProof & { chargeCreatedAt: Date | null }> {
    const subscription = await this.subscriptions.findById(item.subscriptionId)
    const payment = await this.payments.findById(item.paymentId)
    if (
      !subscription ||
      !payment ||
      subscription.consumerId !== item.consumerId ||
      subscription.provider !== this.gateway.provider ||
      subscription.amount.currency !== 'BRL' ||
      subscription.amount.amountInCents !== item.amountInCents ||
      subscription.providerSubscriptionId !== item.providerSubscriptionId ||
      payment.subscriptionId !== item.subscriptionId ||
      payment.consumerId !== item.consumerId ||
      payment.providerPaymentId !== item.providerPaymentId ||
      payment.provider !== this.gateway.provider ||
      payment.amount.amountInCents !== item.amountInCents ||
      payment.amount.currency !== 'BRL' ||
      payment.method.type !== 'CREDIT_CARD'
    )
      throw new ValidationError('A origem da regularização não corresponde à assinatura')

    // Both requests must complete. A failed GET never becomes evidence of nonpayment.
    const startedAt = this.clock()
    const providerSubscription = await this.gateway.getSubscription(item.providerSubscriptionId)
    const charge = await this.gateway.getCardCharge(item.providerPaymentId)
    const cycle = providerSubscription.charges.find(
      (entry) => entry.chargeId === item.providerPaymentId,
    )
    const cycleCreatedAt = cycle?.createdAt
    const now = this.clock()
    if (
      !Number.isFinite(startedAt.getTime()) ||
      !Number.isFinite(now.getTime()) ||
      now < startedAt ||
      now.getTime() - startedAt.getTime() > 60_000 ||
      providerSubscription.providerSubscriptionId !== item.providerSubscriptionId ||
      !providerSubscription.charges.some((entry) => entry.chargeId === item.providerPaymentId) ||
      charge.providerPaymentId !== item.providerPaymentId ||
      charge.amountInCents !== item.amountInCents ||
      charge.status === 'REFUNDED'
    )
      throw new ValidationError('A consulta ao provedor é divergente ou está vencida')
    if (
      cycleCreatedAt &&
      providerSubscription.charges.some(
        (entry) =>
          entry.chargeId !== item.providerPaymentId &&
          entry.status === 'PAID' &&
          entry.createdAt &&
          entry.createdAt >= cycleCreatedAt,
      )
    )
      throw new ValidationError('Há uma renovação posterior paga; a origem exige revisão')

    const active = await this.operations.findActiveForSubscription(item.subscriptionId, now)
    const currentSubscription = await this.subscriptions.findById(item.subscriptionId)
    const currentPayment = await this.payments.findById(item.paymentId)
    if (
      !currentSubscription ||
      !currentPayment ||
      currentSubscription.consumerId !== item.consumerId ||
      currentSubscription.providerSubscriptionId !== item.providerSubscriptionId ||
      (currentPayment.status === 'PAID' && charge.status !== 'PAID')
    )
      throw new ValidationError('A origem mudou durante a conferência do provedor')
    const checkedAt = this.clock()
    if (checkedAt < now || checkedAt.getTime() - startedAt.getTime() > 60_000)
      throw new ValidationError('A consulta ao provedor está vencida')
    return {
      checkedAt: startedAt,
      providerSubscriptionId: providerSubscription.providerSubscriptionId,
      providerPaymentId: charge.providerPaymentId,
      amountInCents: charge.amountInCents,
      subscriptionStatus: providerSubscription.status,
      paymentStatus: charge.status,
      // A prepared debit also blocks D7: it may be starting in another tab now.
      paymentOperationPending: active?.kind === 'RETRY',
      cancellationOperationPending:
        active?.kind === 'CANCEL' &&
        active.state !== 'READY' &&
        active.executionId !== ownCancellationExecutionId,
      automaticCancellationRequested:
        currentSubscription.cancellationRecord?.origin === 'NONPAYMENT' &&
        currentSubscription.cancellationRecord.recoveryCaseId === item.id,
      chargeCreatedAt: cycle?.createdAt ?? null,
    }
  }
}
