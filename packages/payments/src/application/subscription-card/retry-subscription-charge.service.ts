import { saoPauloDayKey } from '@sistemazero/core/time'
import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionMyReadRepository } from '../../domain/ports/subscription-my-read.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type {
  SubscriptionAggregate,
  SubscriptionCard,
} from '../../domain/subscription/subscription.aggregate'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import {
  createSubscriptionOperation,
  readRetryTerms,
  type SubscriptionOperation,
  type SubscriptionOperationRepository,
  type SubscriptionRetryTerms,
} from '../../domain/subscription/subscription-operation'
import type { HandleSubscriptionNotificationService } from '../handle-subscription-notification/handle-subscription-notification.service'
import { subscriptionCycleAccess } from '../subscription-recovery/subscription-period'
import { SubscriptionOperationInProgressError } from './update-subscription-card.service'

export interface RetrySubscriptionIntentView {
  id: string
  subscriptionId: string
  state: SubscriptionOperation['state']
  expiresAt: string
  chargesNow: true
  amountInCents: string
  currency: 'BRL'
  terms: SubscriptionRetryTerms
  result: string | null
}

function view(operation: SubscriptionOperation): RetrySubscriptionIntentView {
  if (!operation.retryTerms || !operation.amountInCents)
    throw new ValidationError('Intenção incompleta')
  return {
    id: operation.id,
    subscriptionId: operation.subscriptionId,
    state: operation.state,
    expiresAt: operation.expiresAt.toISOString(),
    chargesNow: true,
    amountInCents: operation.amountInCents.toString(),
    currency: 'BRL',
    terms: readRetryTerms(operation.retryTerms),
    result: operation.result,
  }
}

/** One explicit consent, one original charge. An uncertain POST is never repeated. */
export class RetrySubscriptionChargeService {
  constructor(
    private readonly mine: SubscriptionMyReadRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly operations: SubscriptionOperationRepository,
    private readonly gateway: PaymentGateway,
    private readonly cycles: HandleSubscriptionNotificationService,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createIntent(
    email: string,
    subscriptionId: string,
    paymentId: string,
  ): Promise<RetrySubscriptionIntentView> {
    const subscription = await this.owned(email, subscriptionId)
    const payment = await this.payments.findById(paymentId)
    if (
      !payment ||
      payment.subscriptionId !== subscriptionId ||
      payment.consumerId !== subscription.consumerId ||
      payment.provider !== this.gateway.provider ||
      payment.method.type !== 'CREDIT_CARD' ||
      payment.amount.currency !== 'BRL' ||
      payment.amount.amountInCents !== subscription.amount.amountInCents ||
      payment.status !== 'FAILED' ||
      !payment.providerPaymentId
    )
      throw new ValidationError('Cobrança não permite regularização')
    const terms = await this.inspect(subscription, payment.providerPaymentId)
    const operation = createSubscriptionOperation({
      subscriptionId,
      consumerId: subscription.consumerId,
      providerSubscriptionId: this.active(subscription),
      kind: 'RETRY',
      providerPaymentId: payment.providerPaymentId,
      amountInCents: payment.amount.amountInCents,
      retryTerms: terms,
      now: this.clock(),
    })
    if (!(await this.operations.create(operation))) throw new SubscriptionOperationInProgressError()
    return view(operation)
  }

  async getIntent(
    email: string,
    subscriptionId: string,
    id: string,
  ): Promise<RetrySubscriptionIntentView> {
    await this.owned(email, subscriptionId)
    return view(await this.intent(subscriptionId, id))
  }

  async execute(
    email: string,
    subscriptionId: string,
    id: string,
    input: {
      paymentToken: string
      card: SubscriptionCard
      consent: true
    },
  ): Promise<RetrySubscriptionIntentView> {
    if (
      input.consent !== true ||
      !input.paymentToken ||
      input.paymentToken.length > 255 ||
      !/^[a-z][a-z0-9-]{1,31}$/.test(input.card.brand) ||
      !/^\d{4}$/.test(input.card.last4)
    )
      throw new ValidationError('Confirme a cobrança e os dados do cartão')
    const subscription = await this.owned(email, subscriptionId)
    const original = await this.intent(subscriptionId, id)
    if (original.state !== 'READY') return view(original)
    if (
      original.consumerId !== subscription.consumerId ||
      original.providerSubscriptionId !== this.active(subscription)
    )
      throw new ValidationError('A assinatura mudou; confira a cobrança novamente')
    const operation = await this.operations.start(id, subscriptionId, this.clock())
    if (!operation?.executionId || !operation.providerPaymentId)
      throw new SubscriptionOperationInProgressError()
    let externalStarted = false
    try {
      const terms = await this.inspect(subscription, operation.providerPaymentId)
      if (JSON.stringify(terms) !== JSON.stringify(operation.retryTerms))
        throw new ValidationError('O período ou a próxima cobrança mudou')
      const fresh = await this.subscriptions.findById(subscriptionId)
      const fence = await this.operations.findById(id)
      const now = this.clock()
      if (
        !fresh ||
        this.active(fresh) !== operation.providerSubscriptionId ||
        fresh.consumerId !== operation.consumerId ||
        fresh.amount.amountInCents !== operation.amountInCents ||
        !fence ||
        fence.state !== 'EXECUTING' ||
        fence.executionId !== operation.executionId ||
        !operation.startedAt ||
        now < operation.startedAt ||
        now.getTime() - operation.startedAt.getTime() > 30_000 ||
        now >= operation.expiresAt
      )
        throw new ValidationError('A autorização mudou ou venceu')
      const customer = fresh.customer
      if (!customer?.phone) throw new ValidationError('Dados do titular incompletos')
      externalStarted = true
      await this.gateway.retrySubscriptionCharge({
        providerPaymentId: operation.providerPaymentId,
        paymentToken: input.paymentToken,
        customer: {
          name: customer.name,
          cpf: customer.document.value,
          email: customer.email,
          phone: customer.phone,
        },
        billingAddress: customer.address,
      })
      // The provider's accepted POST is not proof that money was received.
      await this.cycles.handleCycle({
        subscriptionId: operation.providerSubscriptionId,
        chargeId: operation.providerPaymentId,
      })
      const confirmed = await this.payments.findByProviderPaymentId(
        this.gateway.provider,
        operation.providerPaymentId,
      )
      if (
        confirmed?.subscriptionId !== subscriptionId ||
        confirmed.status !== 'PAID' ||
        confirmed.cycleAccess?.kind !== 'VERIFIED_PERIOD'
      )
        throw new ValidationError('Cobrança aguardando confirmação')
      const latest = await this.subscriptions.findById(subscriptionId)
      if (!latest) throw new SubscriptionNotFoundError(subscriptionId)
      latest.updateCard({ brand: input.card.brand, last4: input.card.last4 })
      await this.subscriptions.save(latest)
      await this.operations.finish(
        id,
        operation.executionId,
        'SUCCEEDED',
        'CHARGE_PAID',
        this.clock(),
      )
    } catch {
      // Once POST may have started, no user/worker may reuse the token or debit.
      try {
        await this.operations.finish(
          id,
          operation.executionId,
          externalStarted ? 'UNKNOWN' : 'REJECTED',
          externalStarted ? 'PAYMENT_CONFIRMATION_REQUIRED' : 'PRECONDITION_CHANGED',
          this.clock(),
        )
      } catch {
        /* EXECUTING remains durable and blocks a second debit. */
      }
    }
    return view(await this.intent(subscriptionId, id))
  }

  private async owned(email: string, id: string): Promise<SubscriptionAggregate> {
    const subscription = await this.mine.findByEmailAndId(email, id)
    if (!subscription) throw new SubscriptionNotFoundError(id)
    return subscription
  }

  private async intent(subscriptionId: string, id: string): Promise<SubscriptionOperation> {
    const operation = await this.operations.findById(id)
    if (!operation || operation.subscriptionId !== subscriptionId || operation.kind !== 'RETRY')
      throw new SubscriptionNotFoundError(subscriptionId)
    return operation
  }

  private active(subscription: SubscriptionAggregate): string {
    if (
      subscription.status !== 'ACTIVE' ||
      subscription.cancelRequestedAt ||
      !subscription.providerSubscriptionId ||
      subscription.provider !== this.gateway.provider ||
      subscription.cyclesCompleted < 1 ||
      subscription.amount.currency !== 'BRL'
    )
      throw new ValidationError('Assinatura não permite regularização')
    return subscription.providerSubscriptionId
  }

  private async inspect(
    subscription: SubscriptionAggregate,
    chargeId: string,
  ): Promise<SubscriptionRetryTerms> {
    const providerId = this.active(subscription)
    const started = this.clock()
    const source = await this.gateway.getSubscription(providerId)
    const charge = await this.gateway.getCardCharge(chargeId)
    const now = this.clock()
    const proof = subscriptionCycleAccess({
      providerSubscription: source,
      providerSubscriptionId: providerId,
      providerPaymentId: chargeId,
      intervalMonths: subscription.intervalMonths,
      observedAt: now,
    })
    if (
      source.status !== 'ACTIVE' ||
      charge.providerPaymentId !== chargeId ||
      charge.status !== 'FAILED' ||
      charge.amountInCents !== subscription.amount.amountInCents ||
      proof.kind !== 'VERIFIED_PERIOD' ||
      now < started ||
      now.getTime() - started.getTime() > 60_000 ||
      source.charges.some(
        (entry) =>
          entry.chargeId !== chargeId &&
          (!entry.createdAt || entry.createdAt >= new Date(proof.period.startsAt)),
      ) ||
      !source.charges.some((entry) => entry.chargeId === chargeId && entry.status === 'FAILED') ||
      !source.nextExecution
    )
      throw new ValidationError('Cobrança exige conferência antes de regularizar')
    const terms = readRetryTerms({ period: proof.period, nextExecution: source.nextExecution })
    if (
      Date.parse(terms.period.endsAt) <= now.getTime() ||
      terms.nextExecution <= saoPauloDayKey(now) ||
      terms.nextExecution !== saoPauloDayKey(new Date(terms.period.endsAt))
    )
      throw new ValidationError(
        'Período anterior encerrado; uma nova contratação exige confirmação separada',
      )
    const fresh = await this.subscriptions.findById(subscription.id)
    const local = await this.payments.findByProviderPaymentId(this.gateway.provider, chargeId)
    if (
      !fresh ||
      this.active(fresh) !== providerId ||
      fresh.consumerId !== subscription.consumerId ||
      fresh.amount.amountInCents !== subscription.amount.amountInCents ||
      !local ||
      local.subscriptionId !== subscription.id ||
      local.consumerId !== subscription.consumerId ||
      local.status !== 'FAILED'
    )
      throw new ValidationError('A cobrança mudou durante a conferência')
    return terms
  }
}
