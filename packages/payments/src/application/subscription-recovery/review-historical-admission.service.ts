import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { verifiedBillingAudience } from '../../domain/subscription-recovery/billing-audience'
import { SubscriptionRecoveryCase } from '../../domain/subscription-recovery/recovery-case'
import type { RecoveryPolicyRepository } from '../../domain/subscription-recovery/recovery-policy-repository.port'
import type { SubscriptionRecoveryRepository } from '../../domain/subscription-recovery/recovery-repository.port'
import {
  type ReviewedAdmissionRepository,
  readReviewedAdmissionAudit,
} from '../../domain/subscription-recovery/reviewed-admission.port'
import type { RecoverySourceService } from './recovery-source.service'

/** One reviewed origin, a fresh notice window. No card/debit/cancellation or retroactive messages. */
export class ReviewHistoricalAdmissionService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly policies: RecoveryPolicyRepository,
    private readonly cases: Pick<
      SubscriptionRecoveryRepository,
      'findByPaymentId' | 'findActiveForSubscription'
    >,
    private readonly reviews: Pick<ReviewedAdmissionRepository, 'findByPaymentId' | 'create'>,
    private readonly source: Pick<RecoverySourceService, 'inspect'>,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  async execute(input: {
    paymentId: string
    expectedVersion: number
    audience: 'kids' | 'adult'
    actorId: string
    requestId: string
  }) {
    const actorId = input.actorId?.trim()
    if (
      !actorId ||
      actorId.length > 200 ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.requestId) ||
      !['kids', 'adult'].includes(input.audience)
    )
      throw new ValidationError('Revisão histórica inválida')
    const requestId = input.requestId.toLowerCase()
    const prior = await this.reviews.findByPaymentId(input.paymentId)
    if (prior) {
      if (
        prior.actorId === actorId &&
        prior.requestId === requestId &&
        prior.audience === input.audience
      )
        return { caseId: prior.caseId, admitted: true as const }
      throw new ValidationError('A cobrança já tem uma revisão registrada. Atualize a lista.')
    }
    const payment = await this.payments.findById(input.paymentId)
    const subscription = payment?.subscriptionId
      ? await this.subscriptions.findById(payment.subscriptionId)
      : null
    if (
      !payment ||
      !subscription ||
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      payment.toSnapshot().version !== input.expectedVersion ||
      payment.status !== 'FAILED' ||
      payment.method.type !== 'CREDIT_CARD' ||
      !payment.providerPaymentId ||
      subscription.status !== 'ACTIVE' ||
      subscription.cancelRequestedAt ||
      subscription.cyclesCompleted < 1 ||
      !subscription.providerSubscriptionId
    )
      throw new ValidationError('A cobrança mudou ou não aceita entrada na regularização')
    const audience = verifiedBillingAudience(subscription.metadata)
    if (audience && audience !== input.audience)
      throw new ValidationError('O público diverge da compra comprovada')
    if (
      (await this.cases.findByPaymentId(payment.id)) ||
      (await this.cases.findActiveForSubscription(subscription.id))
    )
      throw new ValidationError('A assinatura já tem acompanhamento. Atualize a lista.')
    const configuration = await this.policies.get()
    const openedAt = new Date(this.clock())
    if (
      !configuration?.enabled ||
      !configuration.activatedAt ||
      configuration.activatedAt > openedAt
    )
      throw new ValidationError('A política de regularização ainda não está ativa')
    const candidate = SubscriptionRecoveryCase.open({
      subscriptionId: subscription.id,
      consumerId: subscription.consumerId,
      providerSubscriptionId: subscription.providerSubscriptionId,
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId,
      amountInCents: payment.amount.amountInCents,
      audience: input.audience,
      policy: configuration.policy,
      firstFailureAt: payment.toSnapshot().updatedAt,
      now: openedAt,
    })
    const proof = await this.source.inspect(candidate.toSnapshot())
    const now = new Date(this.clock())
    if (
      proof.subscriptionStatus !== 'ACTIVE' ||
      proof.paymentStatus !== 'FAILED' ||
      proof.paymentOperationPending ||
      proof.cancellationOperationPending ||
      proof.hasLaterCharge !== false ||
      !proof.chargeCreatedAt ||
      !Number.isFinite(proof.chargeCreatedAt.getTime()) ||
      proof.chargeCreatedAt > proof.checkedAt ||
      now < proof.checkedAt ||
      now.getTime() - proof.checkedAt.getTime() > 60_000
    )
      throw new ValidationError(
        'A operadora não confirma uma origem atual e inequívoca. Nenhum acompanhamento foi aberto.',
      )
    const item = SubscriptionRecoveryCase.open({
      ...candidate.toSnapshot(),
      firstFailureAt: proof.chargeCreatedAt,
      now,
    })
    const audit = readReviewedAdmissionAudit({
      caseId: item.id,
      paymentId: payment.id,
      actorId,
      requestId,
      audience: input.audience,
      policyVersion: configuration.policy.version,
      paymentVersion: input.expectedVersion,
      sourceObservedAt: proof.checkedAt,
      sourceChargeCreatedAt: proof.chargeCreatedAt,
      approvedAt: now,
    })
    const caseId = await this.reviews.create(item, audit)
    return { caseId, admitted: true as const }
  }
}
