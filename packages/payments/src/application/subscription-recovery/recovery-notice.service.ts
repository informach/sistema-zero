import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type {
  RecoveryMessageReceipt,
  RecoveryMessagingGateway,
} from '../../domain/subscription-recovery/recovery-messaging.port'
import type {
  RecoveryNoticePurpose,
  RecoveryNoticeRepository,
  RecoveryNoticeSnapshot,
} from '../../domain/subscription-recovery/recovery-notice.port'
import type { RecoveryLease } from '../../domain/subscription-recovery/recovery-repository.port'

type NoticeResult = 'ACCEPTED' | 'PENDING' | 'FAILED'
const terminal = new Set(['READ', 'DELIVERED', 'FAILED', 'SUPPRESSED'])
const arrived = new Set(['SENT', 'DELIVERED', 'READ'])

/** Exact envelopes and receipts precede case mutation; the coordinator saves the case once. */
export class RecoveryNoticeService {
  constructor(
    private readonly notices: RecoveryNoticeRepository,
    private readonly messaging: RecoveryMessagingGateway,
    private readonly subscriptions: SubscriptionRepository,
    private readonly billingUrls: { kids: string; adult: string },
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async ensure(
    lease: RecoveryLease,
    purpose: RecoveryNoticePurpose,
    day = 0,
  ): Promise<NoticeResult> {
    if (this.clock() >= lease.leaseUntil) return 'PENDING'
    let notice = (await this.notices.listForCase(lease.item.id)).find(
      (entry) => entry.purpose === purpose && entry.day === day,
    )
    if (!notice) {
      try {
        const request = await this.envelope(lease, purpose)
        notice = await this.notices.prepare(lease, { purpose, day, request, now: this.clock() })
      } catch (error) {
        if (!(error instanceof ValidationError)) throw error
        if (purpose === 'INITIAL' || purpose === 'REMINDER') lease.item.contactFailed(this.clock())
        return 'FAILED'
      }
    }
    let receipt = notice.receipt
    if (!receipt) {
      if (notice.attemptCount >= 5) return this.failed(lease, purpose)
      await this.notices.recordAttempt(lease, notice.id, this.clock())
      try {
        receipt = await this.messaging.send(notice.request)
      } catch {
        lease.item.defer(this.clock())
        return 'PENDING'
      }
      if (this.clock() >= lease.leaseUntil) return 'PENDING'
      await this.notices.recordReceipt(lease, notice.id, receipt, this.clock())
    }
    if (receipt.status === 'FAILED' || receipt.status === 'SUPPRESSED')
      return this.failed(lease, purpose)
    if (purpose === 'INITIAL')
      lease.item.acceptInitialNotice(receipt.id, receipt.acceptedAt, this.clock())
    // Use the attempt's persisted due time; a response can cross the D7 boundary.
    if (purpose === 'REMINDER') lease.item.acceptReminder(day, notice.createdAt)
    return 'ACCEPTED'
  }

  /** A failed/unsent initial email cannot authorize automatic cancellation. */
  async initialHealthy(lease: RecoveryLease): Promise<boolean> {
    const initial = (await this.notices.listForCase(lease.item.id)).find(
      (entry) => entry.purpose === 'INITIAL',
    )
    if (!initial?.receipt || initial.receipt.id !== lease.item.toSnapshot().initialNoticeId) {
      lease.item.contactFailed(this.clock())
      return false
    }
    if (initial.receipt.status === 'FAILED' || initial.receipt.status === 'SUPPRESSED') {
      lease.item.contactFailed(this.clock())
      return false
    }
    if (initial.attemptCount >= 8) {
      lease.item.contactFailed(this.clock())
      return false
    }
    await this.notices.recordAttempt(lease, initial.id, this.clock())
    let receipt: RecoveryMessageReceipt
    try {
      receipt = await this.messaging.get(initial.receipt.id)
    } catch {
      lease.item.defer(this.clock())
      return false
    }
    if (this.clock() >= lease.leaseUntil) return false
    await this.notices.recordReceipt(lease, initial.id, receipt, this.clock())
    const deadlineAt = lease.item.toSnapshot().deadlineAt
    if (
      receipt.status === 'FAILED' ||
      receipt.status === 'SUPPRESSED' ||
      (deadlineAt && this.clock() >= deadlineAt && !arrived.has(receipt.status))
    ) {
      lease.item.contactFailed(this.clock())
      return false
    }
    return true
  }

  /** Also covers an accepted enqueue whose response never reached Payments. */
  async withdrawWarnings(lease: RecoveryLease): Promise<boolean> {
    let complete = true
    for (const notice of await this.notices.listForCase(lease.item.id)) {
      if (notice.purpose !== 'INITIAL' && notice.purpose !== 'REMINDER') continue
      if (notice.receipt && terminal.has(notice.receipt.status)) continue
      if (notice.receipt && arrived.has(notice.receipt.status)) continue
      if (notice.attemptCount >= 10) {
        complete = false
        continue
      }
      if (this.clock() >= lease.leaseUntil) return false
      await this.notices.recordAttempt(lease, notice.id, this.clock())
      try {
        const result = await this.messaging.suppressIntent(notice.request)
        if (this.clock() >= lease.leaseUntil) return false
        await this.notices.recordReceipt(lease, notice.id, result.receipt, this.clock())
        if (
          !result.suppressed &&
          !arrived.has(result.receipt.status) &&
          !terminal.has(result.receipt.status)
        )
          complete = false
      } catch {
        complete = false
      }
    }
    return complete
  }

  private failed(lease: RecoveryLease, purpose: RecoveryNoticePurpose): NoticeResult {
    if (purpose === 'INITIAL' || purpose === 'REMINDER') lease.item.contactFailed(this.clock())
    return 'FAILED'
  }

  private async envelope(
    lease: RecoveryLease,
    purpose: RecoveryNoticePurpose,
  ): Promise<Omit<RecoveryNoticeSnapshot['request'], 'idempotencyKey'>> {
    const item = lease.item.toSnapshot()
    const subscription = await this.subscriptions.findById(item.subscriptionId)
    if (!subscription || subscription.consumerId !== item.consumerId || !subscription.customer)
      throw new ValidationError('Contato da assinatura indisponível')
    if (item.amountInCents > BigInt(Number.MAX_SAFE_INTEGER))
      throw new ValidationError('Valor fora do limite de comunicação')
    const url = new URL(this.billingUrls[item.audience])
    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    )
      throw new ValidationError('Endereço de regularização inválido')
    url.searchParams.set('assinatura', item.subscriptionId)
    url.searchParams.set('regularizacao', item.id)
    const deadline = item.deadlineAt
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        }).format(item.deadlineAt)
      : ''
    return {
      channel: 'email',
      templateKey: `recovery-${item.audience}-${purpose.toLowerCase()}`,
      recipient: { name: subscription.customer.name, email: subscription.customer.email },
      variables: {
        nome: subscription.customer.name,
        produto: subscription.description?.trim() || 'assinatura do Sistema Zero',
        link: url.toString(),
        dias: String(item.policy.windowDays),
        prazo: deadline,
        valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          Number(item.amountInCents) / 100,
        ),
      },
    }
  }
}
