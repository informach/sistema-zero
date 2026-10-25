import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { subscriptionCycleAccess } from './subscription-period'

/** Re-observes an already paid cycle. No arbitrary dates, new debit or duplicate paid event. */
export class ConfirmSubscriptionPeriodService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly gateway: PaymentGateway,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    paymentId: string
    expectedVersion: number
    actorId: string
    requestId: string
  }) {
    const payment = await this.payments.findById(input.paymentId)
    if (!payment) throw new ValidationError('Pagamento não encontrado para conferência')
    const snapshot = payment.toSnapshot()
    if (
      snapshot.periodConfirmation?.requestId === input.requestId &&
      snapshot.periodConfirmation.actorId === input.actorId
    )
      return { paymentId: payment.id, version: snapshot.version, confirmed: true as const }
    if (
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      snapshot.version !== input.expectedVersion ||
      payment.status !== 'PAID' ||
      payment.method.type !== 'CREDIT_CARD' ||
      payment.provider !== this.gateway.provider ||
      payment.amount.currency !== 'BRL' ||
      !payment.subscriptionId ||
      !payment.providerPaymentId ||
      payment.cycleAccess?.kind !== 'REVIEW_REQUIRED'
    )
      throw new ValidationError('O pagamento mudou ou não tem período pendente. Atualize a lista.')
    const subscription = await this.subscriptions.findById(payment.subscriptionId)
    if (
      !subscription?.providerSubscriptionId ||
      subscription.provider !== payment.provider ||
      subscription.consumerId !== payment.consumerId ||
      subscription.amount.currency !== payment.amount.currency ||
      subscription.amount.amountInCents !== payment.amount.amountInCents
    )
      throw new ValidationError('A origem do período não corresponde à assinatura')
    const started = new Date(this.clock())
    let proof: ReturnType<typeof subscriptionCycleAccess>
    try {
      const source = await this.gateway.getSubscription(subscription.providerSubscriptionId)
      const charge = await this.gateway.getCardCharge(payment.providerPaymentId)
      if (
        charge.providerPaymentId !== payment.providerPaymentId ||
        charge.status !== 'PAID' ||
        charge.amountInCents !== payment.amount.amountInCents
      )
        throw new Error('Divergent source')
      proof = subscriptionCycleAccess({
        providerSubscription: source,
        providerSubscriptionId: subscription.providerSubscriptionId,
        providerPaymentId: payment.providerPaymentId,
        intervalMonths: subscription.intervalMonths,
        observedAt: this.clock(),
      })
    } catch {
      throw new ValidationError(
        'Não foi possível confirmar o período na operadora. Nenhuma concessão foi realizada.',
      )
    }
    if (proof.kind !== 'VERIFIED_PERIOD')
      throw new ValidationError('A operadora ainda não confirma o período original')
    const fresh = await this.subscriptions.findById(subscription.id)
    if (
      !fresh ||
      fresh.providerSubscriptionId !== subscription.providerSubscriptionId ||
      fresh.consumerId !== subscription.consumerId ||
      fresh.amount.amountInCents !== subscription.amount.amountInCents ||
      fresh.intervalMonths !== subscription.intervalMonths
    )
      throw new ValidationError('A assinatura mudou durante a conferência')
    payment.confirmSubscriptionPeriod(proof.period, this.clock(), {
      actorId: input.actorId,
      requestId: input.requestId,
      providerSubscriptionId: subscription.providerSubscriptionId,
      sourceObservedAt: started,
    })
    await this.payments.save(payment)
    return { paymentId: payment.id, version: snapshot.version + 1, confirmed: true as const }
  }
}
