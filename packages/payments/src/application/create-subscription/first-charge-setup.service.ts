import type {
  CreateCardSubscriptionInput,
  PaymentGateway,
} from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { SubscriptionActivationRejectedError } from '../../domain/subscription/activation-rejected.error'
import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import type { Logger } from '../../infrastructure/logging/logger'
import type { HandleSubscriptionNotificationService } from '../handle-subscription-notification/handle-subscription-notification.service'
import { toSubscriptionView } from '../mappers/subscription-view'
import { buildCyclePayment } from '../subscription/cycle-payment'

/** Two-step provider creation persists both identities BEFORE the non-repeatable activation. */
export class FirstChargeSetupService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly cycles: HandleSubscriptionNotificationService,
    private readonly logger: Logger,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async create(subscription: SubscriptionAggregate, input: CreateCardSubscriptionInput) {
    await this.subscriptions.save(subscription)
    const prepared = await this.gateway.prepareCardSubscription(input)
    let stored = await this.required(subscription.id)
    stored.registerProviderSubscription(prepared.providerSubscriptionId)
    stored.registerFirstCharge(prepared.firstChargeId)
    await this.subscriptions.save(stored)
    stored = await this.required(subscription.id)
    const payment = buildCyclePayment({
      subscription: stored,
      chargeId: prepared.firstChargeId,
      status: 'PENDING',
    })
    await this.payments.save(payment)
    // POST is never retried. An ambiguous answer is recovered by GET and the worker.
    try {
      const activated = await this.gateway.activateCardSubscription(
        prepared.providerSubscriptionId,
        input,
      )
      if (
        activated.providerSubscriptionId !== prepared.providerSubscriptionId ||
        (activated.firstChargeId && activated.firstChargeId !== prepared.firstChargeId)
      )
        throw new ValidationError('Provedor retornou outra assinatura/cobrança')
    } catch (error) {
      if (error instanceof SubscriptionActivationRejectedError) {
        stored = await this.required(stored.id)
        if (
          stored.requestCancellation(
            { origin: 'CONSUMER', actorId: 'system:first-charge-rejected' },
            this.clock(),
          )
        )
          await this.subscriptions.save(stored)
      }
      this.logger.warn('subscription.first_charge.activation_requires_reconciliation', {
        subscriptionId: stored.id,
      })
    }
    try {
      await this.resume(stored.id)
    } catch {
      // Durable worker resumes; return the existing payment identity for polling, never charge again.
      this.logger.error('subscription.first_charge.setup_pending', { subscriptionId: stored.id })
    }
    return this.view(await this.required(stored.id))
  }

  async view(subscription: SubscriptionAggregate) {
    const id = subscription.firstChargePricing?.providerChargeId
    if (!id)
      throw new ValidationError(
        'Não foi possível preparar a assinatura. Nenhuma cobrança foi iniciada.',
      )
    const payment = await this.payments.findByProviderPaymentId(this.gateway.provider, id)
    return toSubscriptionView(
      subscription,
      payment
        ? {
            id: payment.id,
            status: payment.status,
            paidAt: payment.paidAt?.toISOString() ?? null,
          }
        : null,
    )
  }

  async resume(id: string): Promise<void> {
    let subscription = await this.required(id)
    const pricing = subscription.firstChargePricing
    const providerId = subscription.providerSubscriptionId
    if (!pricing || pricing.renewalPriceConfirmed || !providerId || !pricing.providerChargeId)
      return
    if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED') return
    const source = await this.gateway.getSubscription(providerId)
    if (source.providerSubscriptionId !== providerId)
      throw new ValidationError('Assinatura divergente no provedor')
    // Record actual money even if renewal setup needs cancellation. Uses authoritative charge GET.
    try {
      await this.cycles.handleCycle({
        subscriptionId: providerId,
        chargeId: pricing.providerChargeId,
      })
    } catch {
      this.logger.error('subscription.first_charge.receipt_reconciliation_pending', {
        subscriptionId: id,
      })
    }
    const firstPayment = await this.payments.findByProviderPaymentId(
      this.gateway.provider,
      pricing.providerChargeId,
    )
    subscription = await this.required(id)
    if (source.status === 'CANCELED' || source.status === 'EXPIRED') {
      source.status === 'CANCELED'
        ? subscription.cancel(this.clock())
        : subscription.expire('EXTERNAL', this.clock())
      await this.subscriptions.save(subscription)
      return
    }
    const overdue = this.clock().getTime() - subscription.createdAt.getTime() >= 86_400_000
    const firstFailed = firstPayment?.status === 'FAILED' || firstPayment?.status === 'EXPIRED'
    if (source.status === 'ACTIVE' && !firstFailed && !subscription.cancelRequestedAt) {
      try {
        if (source.amountInCents !== subscription.amount.amountInCents) {
          await this.gateway.updateSubscriptionAmount(
            providerId,
            subscription.amount,
            subscription.description ?? 'Assinatura',
          )
          const verified = await this.gateway.getSubscription(providerId)
          if (
            verified.providerSubscriptionId !== providerId ||
            verified.status !== 'ACTIVE' ||
            verified.amountInCents !== subscription.amount.amountInCents
          )
            throw new ValidationError('Preço da renovação ainda não confirmado')
        }
        subscription = await this.required(id)
        if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED') return
        // Keep the durable job until the first receipt settles; a declined first charge must
        // never leave a second active subscription when the purchaser retries another card.
        if (firstPayment?.status === 'PAID') subscription.confirmRenewalPrice()
        if (subscription.status === 'PENDING') subscription.activate()
        await this.subscriptions.save(subscription)
        if (firstPayment?.status === 'PAID' || !overdue) return
      } catch (error) {
        if (!overdue) throw error
      }
    }
    if (overdue || firstFailed || subscription.cancelRequestedAt) {
      subscription = await this.required(id)
      if (
        subscription.requestCancellation(
          { origin: 'CONSUMER', actorId: 'system:first-charge-setup' },
          this.clock(),
        )
      )
        await this.subscriptions.save(subscription)
      await this.gateway.cancelSubscription(providerId)
      const canceled = await this.gateway.getSubscription(providerId)
      if (
        canceled.providerSubscriptionId !== providerId ||
        !['CANCELED', 'EXPIRED'].includes(canceled.status)
      )
        throw new ValidationError('Cancelamento preventivo ainda não confirmado')
      subscription = await this.required(id)
      canceled.status === 'CANCELED'
        ? subscription.cancel(this.clock())
        : subscription.expire('EXTERNAL', this.clock())
      await this.subscriptions.save(subscription)
      this.logger.error('subscription.first_charge.renewal_canceled', { subscriptionId: id })
    }
  }

  private async required(id: string) {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription) throw new ValidationError('Assinatura não encontrada')
    return subscription
  }
}
