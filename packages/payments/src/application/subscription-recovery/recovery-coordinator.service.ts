import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { SubscriptionOperationRepository } from '../../domain/subscription/subscription-operation'
import type { RecoverySourceProof } from '../../domain/subscription-recovery/recovery-case'
import type {
  RecoveryLease,
  SubscriptionRecoveryRepository,
} from '../../domain/subscription-recovery/recovery-repository.port'
import { ConcurrencyConflictError } from '../../infrastructure/persistence/drizzle/concurrency.error'
import type { CancelSubscriptionService } from '../cancel-subscription/cancel-subscription.service'
import type { HandleSubscriptionNotificationService } from '../handle-subscription-notification/handle-subscription-notification.service'
import type { RecoveryNoticeService } from './recovery-notice.service'
import type { RecoverySourceService } from './recovery-source.service'

/** One durable case; scheduling belongs to its stored nextActionAt, never local timers. */
export class RecoveryCoordinatorService {
  constructor(
    private readonly cases: SubscriptionRecoveryRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly operations: SubscriptionOperationRepository,
    private readonly source: Pick<RecoverySourceService, 'inspect'>,
    private readonly notices: RecoveryNoticeService,
    private readonly cancellation: Pick<CancelSubscriptionService, 'executeForRecovery'>,
    private readonly cycles: Pick<HandleSubscriptionNotificationService, 'handleCycle'>,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async process(original: RecoveryLease): Promise<void> {
    let lease = original
    if (this.clock() >= lease.leaseUntil) return
    if (lease.item.state === 'RECOVERED' || lease.item.state === 'CANCELED') {
      await this.closeout(lease)
      await this.cases.saveOwned(lease, this.clock())
      return
    }
    let proof = await this.inspect(lease)
    if (!proof) {
      await this.cases.saveOwned(lease, this.clock())
      return
    }
    if (!(await this.synchronize(lease, proof))) {
      await this.cases.saveOwned(lease, this.clock())
      return
    }
    // Provider/payment evidence may have changed while ingesting the exact cycle.
    if (proof.paymentStatus === 'PAID') {
      proof = await this.inspect(lease)
      if (!proof) {
        await this.cases.saveOwned(lease, this.clock())
        return
      }
    }
    lease.item.applySource(proof, this.clock())
    const subscription = await this.subscriptions.findById(lease.item.toSnapshot().subscriptionId)
    const humanCancellation =
      subscription?.cancelRequestedAt && subscription.cancellationRecord?.origin !== 'NONPAYMENT'
    const observedState = lease.item.toSnapshot().state
    if (humanCancellation && observedState !== 'CANCELED' && observedState !== 'RECOVERED') {
      await this.notices.withdrawWarnings(lease)
      lease.item.defer(this.clock())
      await this.cases.saveOwned(lease, this.clock())
      return
    }
    if (lease.item.state === 'CANCEL_PENDING') {
      if (!(await this.notices.initialHealthy(lease))) {
        await this.cases.saveOwned(lease, this.clock())
        return
      }
      lease = await this.cases.checkpointOwned(lease, this.clock())
      try {
        await this.cancellation.executeForRecovery(lease)
      } catch (error) {
        if (error instanceof ConcurrencyConflictError) throw error
        if (error instanceof ValidationError) lease.item.sourceDiverged(this.clock())
        // A timeout/refusal is handled by a fresh source read below, never by
        // declaring cancellation or blindly repeating the command.
      }
      const confirmed = await this.inspect(lease)
      if (confirmed && (await this.synchronize(lease, confirmed)))
        lease.item.applySource(confirmed, this.clock())
      if (lease.item.state === 'CANCEL_PENDING') lease.item.defer(this.clock())
    }
    if (lease.item.state === 'RECOVERED' || lease.item.state === 'CANCELED')
      await this.closeout(lease)
    else if (lease.item.state === 'OPEN') {
      const step = lease.item.nextStep(this.clock())
      if (step?.kind === 'INITIAL_NOTICE') await this.notices.ensure(lease, 'INITIAL')
      if (step?.kind === 'REMINDER') {
        if (step.day === undefined) throw new ValidationError('Lembrete sem dia')
        if (
          (await this.notices.initialHealthy(lease)) &&
          (await this.notices.withdrawSupersededReminders(lease, step.day))
        )
          await this.notices.ensure(lease, 'REMINDER', step.day)
        else lease.item.defer(this.clock())
      }
    }
    await this.cases.saveOwned(lease, this.clock())
  }

  private async inspect(lease: RecoveryLease): Promise<RecoverySourceProof | null> {
    try {
      return await this.source.inspect(lease.item.toSnapshot())
    } catch (error) {
      if (error instanceof ValidationError) lease.item.sourceDiverged(this.clock())
      else lease.item.sourceUnavailable(this.clock())
      return null
    }
  }

  private async synchronize(lease: RecoveryLease, proof: RecoverySourceProof): Promise<boolean> {
    const item = lease.item.toSnapshot()
    if (proof.paymentStatus === 'PAID') {
      try {
        await this.cycles.handleCycle({
          subscriptionId: item.providerSubscriptionId,
          chargeId: item.providerPaymentId,
        })
      } catch (error) {
        if (error instanceof ConcurrencyConflictError) throw error
        if (error instanceof ValidationError) lease.item.sourceDiverged(this.clock())
        else lease.item.sourceUnavailable(this.clock())
        return false
      }
      const paid = await this.payments.findById(item.paymentId)
      if (
        paid?.status !== 'PAID' ||
        paid.cycleAccess?.kind === 'REVIEW_REQUIRED' ||
        paid.consumerId !== item.consumerId ||
        paid.subscriptionId !== item.subscriptionId
      ) {
        lease.item.sourceDiverged(this.clock())
        return false
      }
    }
    if (proof.subscriptionStatus === 'CANCELED' || proof.subscriptionStatus === 'EXPIRED') {
      const subscription = await this.subscriptions.findById(item.subscriptionId)
      if (!subscription || subscription.consumerId !== item.consumerId)
        throw new ValidationError('Assinatura do caso indisponível')
      if (subscription.status !== 'CANCELED' && subscription.status !== 'EXPIRED') {
        if (proof.subscriptionStatus === 'CANCELED') subscription.cancel(this.clock())
        else subscription.expire('EXTERNAL', this.clock())
        await this.subscriptions.save(subscription)
      }
    }
    return true
  }

  private async closeout(lease: RecoveryLease): Promise<void> {
    const item = lease.item.toSnapshot()
    if (item.state === 'RECOVERED') {
      const subscription = await this.subscriptions.findById(item.subscriptionId)
      const active = await this.operations.findActiveForSubscription(
        item.subscriptionId,
        this.clock(),
      )
      if (active?.kind === 'CANCEL' && active.state !== 'READY')
        throw new ValidationError('Cancelamento ainda incerto')
      if (subscription?.withdrawNonpaymentCancellation(item.id, 'RECOVERED', this.clock())) {
        await this.subscriptions.save(subscription)
        await this.operations.rejectWithdrawnCancellation(
          item.subscriptionId,
          item.id,
          this.clock(),
        )
      }
    }
    await this.notices.withdrawWarnings(lease)
    await this.notices.ensure(lease, item.state === 'RECOVERED' ? 'RECOVERED' : 'CANCELED')
  }
}
