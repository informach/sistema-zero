import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { SubscriptionOperationRepository } from '../../domain/subscription/subscription-operation'
import type { SubscriptionRecoveryRepository } from '../../domain/subscription-recovery/recovery-repository.port'
import {
  type RecoveryResolutionRepository,
  readRecoveryResolution,
} from '../../domain/subscription-recovery/recovery-resolution.port'
import { subscriptionCycleAccess } from './subscription-period'

/** Reviews a later receipt; never debits, ingests synthetic payment, or alters the failed cycle. */
export class ResolveSupersededRecoveryService {
  constructor(
    private readonly cases: Pick<SubscriptionRecoveryRepository, 'findById'>,
    private readonly resolutions: RecoveryResolutionRepository,
    private readonly payments: PaymentRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly operations: SubscriptionOperationRepository,
    private readonly gateway: PaymentGateway,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    caseId: string
    expectedVersion: number
    actorId: string
    requestId: string
  }) {
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
    const actorId = input.actorId?.trim()
    if (
      !uuid.test(input.caseId) ||
      !uuid.test(input.requestId) ||
      !actorId ||
      actorId.length > 200 ||
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 0
    )
      throw new ValidationError('Revisão do acompanhamento inválida')
    const requestId = input.requestId.toLowerCase()
    const prior = await this.resolutions.findByCaseId(input.caseId)
    if (prior) {
      if (prior.actorId === actorId && prior.requestId === requestId)
        return { caseId: prior.caseId, resolved: true as const }
      throw new ValidationError('Este acompanhamento já tem resolução. Atualize a lista.')
    }
    const item = (await this.cases.findById(input.caseId))?.toSnapshot()
    const subscription = item ? await this.subscriptions.findById(item.subscriptionId) : null
    const original = item ? await this.payments.findById(item.paymentId) : null
    if (
      !item ||
      !subscription ||
      !original ||
      item.version !== input.expectedVersion ||
      ['RECOVERED', 'CANCELED'].includes(item.state) ||
      subscription.status !== 'ACTIVE' ||
      subscription.cancelRequestedAt ||
      subscription.provider !== this.gateway.provider ||
      subscription.consumerId !== item.consumerId ||
      subscription.providerSubscriptionId !== item.providerSubscriptionId ||
      subscription.amount.amountInCents !== item.amountInCents ||
      subscription.amount.currency !== 'BRL' ||
      original.status !== 'FAILED' ||
      original.consumerId !== item.consumerId ||
      original.subscriptionId !== item.subscriptionId ||
      original.provider !== this.gateway.provider ||
      original.providerPaymentId !== item.providerPaymentId ||
      original.method.type !== 'CREDIT_CARD' ||
      original.amount.amountInCents !== item.amountInCents ||
      original.amount.currency !== 'BRL'
    )
      throw new ValidationError('O acompanhamento mudou ou exige outra conferência')
    if (await this.operations.findActiveForSubscription(subscription.id, this.clock()))
      throw new ValidationError(
        'Há uma solicitação financeira pendente; confira seu resultado primeiro',
      )
    const observedAt = new Date(this.clock())
    const source = await this.gateway.getSubscription(item.providerSubscriptionId)
    const originals = source.charges.filter((charge) => charge.chargeId === item.providerPaymentId)
    const originalDate = originals[0]?.createdAt
    if (
      source.providerSubscriptionId !== item.providerSubscriptionId ||
      source.status !== 'ACTIVE' ||
      originals.length !== 1 ||
      !originalDate ||
      !Number.isFinite(originalDate.getTime()) ||
      originalDate > observedAt
    )
      throw new ValidationError('A origem histórica não foi confirmada pela operadora')
    const later = source.charges
      .filter(
        (charge) =>
          charge.status === 'PAID' &&
          charge.createdAt &&
          Number.isFinite(charge.createdAt.getTime()) &&
          charge.createdAt > originalDate &&
          charge.createdAt <= observedAt,
      )
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0]
    if (
      !later?.createdAt ||
      source.charges.filter((charge) => charge.chargeId === later.chargeId).length !== 1
    )
      throw new ValidationError('Nenhum ciclo posterior pago foi identificado de forma inequívoca')
    // Detail queries are read-only; neither response is a debit authorization.
    const oldCharge = await this.gateway.getCardCharge(item.providerPaymentId)
    const paidCharge = await this.gateway.getCardCharge(later.chargeId)
    const paid = await this.payments.findByProviderPaymentId(this.gateway.provider, later.chargeId)
    const access = subscriptionCycleAccess({
      providerSubscription: source,
      providerSubscriptionId: item.providerSubscriptionId,
      providerPaymentId: later.chargeId,
      intervalMonths: subscription.intervalMonths,
      observedAt,
    })
    if (
      oldCharge.providerPaymentId !== item.providerPaymentId ||
      oldCharge.status !== 'FAILED' ||
      oldCharge.amountInCents !== item.amountInCents ||
      paidCharge.providerPaymentId !== later.chargeId ||
      paidCharge.status !== 'PAID' ||
      paidCharge.amountInCents !== item.amountInCents ||
      !paid ||
      paid.id === item.paymentId ||
      paid.status !== 'PAID' ||
      paid.method.type !== 'CREDIT_CARD' ||
      paid.consumerId !== item.consumerId ||
      paid.subscriptionId !== item.subscriptionId ||
      paid.amount.currency !== 'BRL' ||
      paid.amount.amountInCents !== item.amountInCents ||
      access.kind !== 'VERIFIED_PERIOD' ||
      paid.cycleAccess?.kind !== 'VERIFIED_PERIOD' ||
      paid.cycleAccess.period.startsAt !== access.period.startsAt ||
      paid.cycleAccess.period.endsAt !== access.period.endsAt
    )
      throw new ValidationError(
        'O recibo posterior e seu período precisam estar conciliados antes desta resolução',
      )
    const audit = readRecoveryResolution({
      caseId: item.id,
      actorId,
      requestId,
      paymentId: paid.id,
      paymentVersion: paid.toSnapshot().version,
      subscriptionVersion: subscription.toSnapshot().version,
      originalPaymentVersion: original.toSnapshot().version,
      providerPaymentId: later.chargeId,
      originalChargeCreatedAt: originalDate,
      chargeCreatedAt: later.createdAt,
      periodStartsAt: new Date(access.period.startsAt),
      periodEndsAt: new Date(access.period.endsAt),
      observedAt,
      resolvedAt: this.clock(),
    })
    await this.resolutions.resolve(audit, input.expectedVersion)
    return { caseId: item.id, resolved: true as const }
  }
}
