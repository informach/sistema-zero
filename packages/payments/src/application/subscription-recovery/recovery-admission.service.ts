import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { verifiedBillingAudience } from '../../domain/subscription-recovery/billing-audience'
import type {
  RecoveryAdmissionLease,
  RecoveryAdmissionReason,
  RecoveryAdmissionRepository,
} from '../../domain/subscription-recovery/recovery-admission.port'
import { SubscriptionRecoveryCase } from '../../domain/subscription-recovery/recovery-case'
import type { SubscriptionRecoveryRepository } from '../../domain/subscription-recovery/recovery-repository.port'
import type { ReviewedAdmissionRepository } from '../../domain/subscription-recovery/reviewed-admission.port'
import type { RecoverySourceService } from './recovery-source.service'

/** Opening a case never sends a message, charges a card or cancels a subscription. */
export class RecoveryAdmissionService {
  constructor(
    private readonly admissions: RecoveryAdmissionRepository,
    private readonly cases: SubscriptionRecoveryRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly source: Pick<RecoverySourceService, 'inspect'>,
    private readonly reviewedAudiences: Pick<ReviewedAdmissionRepository, 'resolveAudience'>,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async process(lease: RecoveryAdmissionLease): Promise<void> {
    const now = this.clock()
    if (now >= lease.leaseUntil) return
    const finish = (state: 'REVIEW' | 'IGNORED', reason: RecoveryAdmissionReason) =>
      this.admissions.complete(lease, { state, reason, caseId: null }, this.clock())
    // Also covers a case that finished after create but before this admission
    // receipt was saved. A closed origin must never start a second window.
    const prior = await this.cases.findByPaymentId(lease.paymentId)
    if (prior)
      return this.admissions.complete(
        lease,
        { state: 'ADMITTED', reason: null, caseId: prior.id },
        this.clock(),
      )
    const payment = await this.payments.findById(lease.paymentId)
    const subscription = payment?.subscriptionId
      ? await this.subscriptions.findById(payment.subscriptionId)
      : null
    if (
      !payment ||
      !subscription ||
      payment.status !== 'FAILED' ||
      payment.method.type !== 'CREDIT_CARD' ||
      subscription.status !== 'ACTIVE' ||
      subscription.cancelRequestedAt ||
      subscription.cyclesCompleted < 1 ||
      !subscription.providerSubscriptionId ||
      !payment.providerPaymentId
    )
      return finish('IGNORED', 'NO_LONGER_ELIGIBLE')
    if (
      payment.consumerId !== subscription.consumerId ||
      payment.amount.currency !== 'BRL' ||
      payment.amount.amountInCents !== subscription.amount.amountInCents
    )
      return finish('REVIEW', 'PROVIDER_DIVERGENCE')

    const existing = await this.cases.findActiveForSubscription(subscription.id)
    if (existing) {
      if (existing.toSnapshot().paymentId === payment.id)
        return this.admissions.complete(
          lease,
          { state: 'ADMITTED', reason: null, caseId: existing.id },
          this.clock(),
        )
      return finish('IGNORED', 'CASE_EXISTS')
    }
    const audience =
      verifiedBillingAudience(subscription.metadata) ??
      (await this.reviewedAudiences.resolveAudience({
        subscriptionId: subscription.id,
        consumerId: subscription.consumerId,
        providerSubscriptionId: subscription.providerSubscriptionId,
        now: this.clock(),
      }))
    if (!audience) return finish('REVIEW', 'AUDIENCE_UNKNOWN')

    const candidate = SubscriptionRecoveryCase.open({
      subscriptionId: subscription.id,
      consumerId: subscription.consumerId,
      providerSubscriptionId: subscription.providerSubscriptionId,
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId,
      audience,
      amountInCents: payment.amount.amountInCents,
      policy: lease.policy,
      firstFailureAt: payment.toSnapshot().updatedAt,
      now,
    })
    // Failures are retried with a durable finite budget, without making a
    // financial conclusion from network errors or writing provider payloads.
    let proof: Awaited<ReturnType<RecoverySourceService['inspect']>>
    try {
      proof = await this.source.inspect(candidate.toSnapshot())
    } catch (error) {
      if (error instanceof ValidationError) return finish('REVIEW', 'PROVIDER_DIVERGENCE')
      return this.admissions.retry(lease, this.clock())
    }
    if (this.clock() >= lease.leaseUntil) return
    if (proof.subscriptionStatus !== 'ACTIVE' || proof.paymentStatus !== 'FAILED')
      return finish('IGNORED', 'NO_LONGER_ELIGIBLE')
    if (
      !proof.chargeCreatedAt ||
      !Number.isFinite(proof.chargeCreatedAt.getTime()) ||
      proof.chargeCreatedAt > this.clock()
    )
      return finish('REVIEW', 'SOURCE_DATE_UNKNOWN')
    if (proof.chargeCreatedAt < lease.activatedAt) return finish('REVIEW', 'LEGACY_RENEWAL')
    if (proof.paymentOperationPending) return this.admissions.retry(lease, this.clock())
    // Re-read and validate the failed source in the case repository's transaction.
    // A crash between create and complete is recovered above through the same case.
    const created = await this.cases.create(candidate)
    if (!created) return this.admissions.retry(lease, this.clock())
    await this.admissions.complete(
      lease,
      { state: 'ADMITTED', reason: null, caseId: candidate.id },
      this.clock(),
    )
  }
}
