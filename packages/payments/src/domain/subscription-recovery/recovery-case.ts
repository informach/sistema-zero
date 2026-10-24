import { AggregateRoot } from '../shared/aggregate-root'
import { DomainEvent } from '../shared/domain-event'
import { ValidationError } from '../shared/errors'
import { DAY_MS, type RecoveryPolicy, snapshotRecoveryPolicy } from './recovery-policy'

export type RecoveryState =
  | 'OPEN'
  | 'PAYMENT_PENDING'
  | 'CANCEL_PENDING'
  | 'RECOVERED'
  | 'CANCELED'
  | 'MANUAL_REVIEW'
export type RecoveryReason =
  | 'PAID'
  | 'SUBSEQUENT_CYCLE_PAID'
  | 'EXTERNAL_CANCELLATION'
  | 'UNPAID_AFTER_NOTICE'
  | 'PAYMENT_UNCERTAIN'
  | 'CONTACT_FAILED'
  | 'PROVIDER_DIVERGENCE'
export interface RecoverySnapshot {
  id: string
  version: number
  subscriptionId: string
  consumerId: string
  providerSubscriptionId: string
  paymentId: string
  providerPaymentId: string
  audience: 'kids' | 'adult'
  amountInCents: bigint
  policy: RecoveryPolicy
  state: RecoveryState
  reason: RecoveryReason | null
  firstFailureAt: Date
  openedAt: Date
  initialNoticeId: string | null
  initialNoticeAcceptedAt: Date | null
  deadlineAt: Date | null
  lastReminderDay: number
  lastProviderCheckAt: Date | null
  nextActionAt: Date | null
  closedAt: Date | null
}

/** A prova é obtida na aplicação, por GET novo; nunca vem da tela ou de texto de recusa. */
export interface RecoverySourceProof {
  checkedAt: Date
  providerSubscriptionId: string
  providerPaymentId: string
  amountInCents: bigint
  subscriptionStatus: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PENDING'
  paymentStatus: 'PAID' | 'FAILED' | 'PENDING' | 'EXPIRED'
  paymentOperationPending: boolean
  cancellationOperationPending: boolean
  /** True only when the local audited request belongs to this exact case. */
  automaticCancellationRequested?: boolean
}

class RecoveryChangedEvent extends DomainEvent {
  readonly eventName = 'subscription.recovery.changed'
  constructor(
    id: string,
    private readonly payload: {
      consumerId: string
      subscriptionId: string
      state: RecoveryState
      reason: RecoveryReason | null
    },
  ) {
    super(id)
  }
  toPayload(): Record<string, unknown> {
    return { caseId: this.aggregateId, ...this.payload }
  }
}

function validDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}

/** Relógio persistível. Um aviso/tentativa não altera o acesso nem dispara débito. */
export class SubscriptionRecoveryCase extends AggregateRoot<string> {
  private constructor(
    private readonly data: RecoverySnapshot,
    readonly isNew: boolean,
  ) {
    super(data.id)
  }

  static open(
    input: Pick<
      RecoverySnapshot,
      | 'subscriptionId'
      | 'consumerId'
      | 'providerSubscriptionId'
      | 'paymentId'
      | 'providerPaymentId'
      | 'audience'
      | 'amountInCents'
      | 'firstFailureAt'
      | 'policy'
    > & { now: Date },
  ): SubscriptionRecoveryCase {
    if (
      !validDate(input.now) ||
      !validDate(input.firstFailureAt) ||
      input.firstFailureAt > input.now ||
      input.amountInCents <= 0n ||
      !input.subscriptionId ||
      !input.consumerId ||
      !input.providerSubscriptionId ||
      !input.paymentId ||
      !input.providerPaymentId ||
      !['kids', 'adult'].includes(input.audience)
    )
      throw new ValidationError('Origem da regularização inválida')
    const data: RecoverySnapshot = {
      id: crypto.randomUUID(),
      version: 0,
      subscriptionId: input.subscriptionId,
      consumerId: input.consumerId,
      providerSubscriptionId: input.providerSubscriptionId,
      paymentId: input.paymentId,
      providerPaymentId: input.providerPaymentId,
      audience: input.audience,
      amountInCents: input.amountInCents,
      policy: snapshotRecoveryPolicy(input.policy),
      state: 'OPEN',
      reason: null,
      firstFailureAt: new Date(input.firstFailureAt),
      openedAt: new Date(input.now),
      initialNoticeId: null,
      initialNoticeAcceptedAt: null,
      deadlineAt: null,
      lastReminderDay: 0,
      lastProviderCheckAt: null,
      nextActionAt: new Date(input.now),
      closedAt: null,
    }
    return new SubscriptionRecoveryCase(data, true)
  }

  static restore(snapshot: RecoverySnapshot): SubscriptionRecoveryCase {
    const copy = structuredClone(snapshot)
    copy.policy = snapshotRecoveryPolicy(copy.policy)
    const noticeFields = [copy.initialNoticeAcceptedAt, copy.initialNoticeId, copy.deadlineAt]
    const hasNotice = noticeFields.every((value) => value !== null)
    const noNotice = noticeFields.every((value) => value === null)
    const terminal = ['RECOVERED', 'CANCELED'].includes(copy.state)
    if (
      !copy.id ||
      !copy.subscriptionId ||
      !copy.consumerId ||
      !copy.providerSubscriptionId ||
      !copy.paymentId ||
      !copy.providerPaymentId ||
      !Number.isSafeInteger(copy.version) ||
      copy.version < 0 ||
      !['kids', 'adult'].includes(copy.audience) ||
      ![
        'OPEN',
        'PAYMENT_PENDING',
        'CANCEL_PENDING',
        'RECOVERED',
        'CANCELED',
        'MANUAL_REVIEW',
      ].includes(copy.state) ||
      !validDate(copy.openedAt) ||
      !validDate(copy.firstFailureAt) ||
      copy.firstFailureAt > copy.openedAt ||
      copy.amountInCents <= 0n ||
      (!hasNotice && !noNotice) ||
      (hasNotice &&
        (!validDate(copy.initialNoticeAcceptedAt!) ||
          !validDate(copy.deadlineAt!) ||
          copy.initialNoticeAcceptedAt! < copy.openedAt ||
          copy.deadlineAt!.getTime() !==
            copy.initialNoticeAcceptedAt!.getTime() + copy.policy.windowDays * DAY_MS)) ||
      (copy.lastReminderDay !== 0 && !copy.policy.reminderDays.includes(copy.lastReminderDay)) ||
      (copy.nextActionAt !== null && !validDate(copy.nextActionAt)) ||
      (copy.lastProviderCheckAt !== null && !validDate(copy.lastProviderCheckAt)) ||
      terminal !== (copy.closedAt !== null) ||
      (copy.closedAt !== null && (!validDate(copy.closedAt) || copy.closedAt < copy.openedAt)) ||
      (terminal || copy.state === 'MANUAL_REVIEW') !== (copy.nextActionAt === null) ||
      (copy.state === 'CANCEL_PENDING' && !hasNotice)
    ) {
      throw new ValidationError('Caso de regularização persistido inválido')
    }
    return new SubscriptionRecoveryCase(copy, false)
  }

  toSnapshot(): RecoverySnapshot {
    return structuredClone(this.data)
  }
  get state(): RecoveryState {
    return this.data.state
  }

  /** Aceite de entrega é evidência identificada, não prova de leitura do destinatário. */
  acceptInitialNotice(messageId: string, acceptedAt: Date, now: Date): void {
    if (this.data.initialNoticeId) {
      if (this.data.initialNoticeId === messageId) return
      throw new ValidationError('Aviso inicial já registrado; o prazo não pode reiniciar')
    }
    if (
      this.data.state !== 'OPEN' ||
      !messageId ||
      !validDate(acceptedAt) ||
      !validDate(now) ||
      acceptedAt < this.data.openedAt ||
      acceptedAt > now
    )
      throw new ValidationError('Aceite do aviso inicial inválido')
    this.data.initialNoticeId = messageId
    this.data.initialNoticeAcceptedAt = new Date(acceptedAt)
    this.data.deadlineAt = new Date(acceptedAt.getTime() + this.data.policy.windowDays * DAY_MS)
    this.data.nextActionAt = new Date(
      acceptedAt.getTime() +
        (this.data.policy.reminderDays[0] ?? this.data.policy.windowDays) * DAY_MS,
    )
  }

  /** Atraso do scheduler agrupa lembretes; nunca retorna três mensagens acumuladas. */
  nextStep(now: Date): {
    kind: 'INITIAL_NOTICE' | 'RECONCILE' | 'CHECK_CANCELLATION' | 'REMINDER'
    day?: number
  } | null {
    if (!validDate(now)) throw new ValidationError('Relógio da regularização inválido')
    if (['RECOVERED', 'CANCELED', 'MANUAL_REVIEW'].includes(this.data.state)) return null
    if (this.data.state === 'CANCEL_PENDING' || this.data.state === 'PAYMENT_PENDING')
      return { kind: 'RECONCILE' }
    if (!this.data.initialNoticeAcceptedAt || !this.data.deadlineAt)
      return { kind: 'INITIAL_NOTICE' }
    if (now >= this.data.deadlineAt) return { kind: 'CHECK_CANCELLATION' }
    const day = this.data.policy.reminderDays
      .filter(
        (candidate) =>
          candidate > this.data.lastReminderDay &&
          now.getTime() >= this.data.initialNoticeAcceptedAt!.getTime() + candidate * DAY_MS,
      )
      .at(-1)
    return day === undefined ? null : { kind: 'REMINDER', day }
  }

  acceptReminder(day: number, now: Date): void {
    const step = this.nextStep(now)
    if (step?.kind !== 'REMINDER' || step.day !== day)
      throw new ValidationError('Lembrete não é o atual')
    this.data.lastReminderDay = day
    const nextDay =
      this.data.policy.reminderDays.find((candidate) => candidate > day) ??
      this.data.policy.windowDays
    this.data.nextActionAt = new Date(
      this.data.initialNoticeAcceptedAt!.getTime() + nextDay * DAY_MS,
    )
  }

  applySource(proof: RecoverySourceProof, now: Date): void {
    if (
      !validDate(now) ||
      now < this.data.openedAt ||
      !validDate(proof.checkedAt) ||
      proof.checkedAt > now ||
      now.getTime() - proof.checkedAt.getTime() > 60_000 ||
      proof.providerSubscriptionId !== this.data.providerSubscriptionId ||
      proof.providerPaymentId !== this.data.providerPaymentId ||
      proof.amountInCents !== this.data.amountInCents
    )
      throw new ValidationError('Conferência da regularização inválida ou vencida')
    if (['RECOVERED', 'CANCELED', 'MANUAL_REVIEW'].includes(this.data.state)) return
    this.data.lastProviderCheckAt = new Date(proof.checkedAt)
    if (proof.subscriptionStatus === 'CANCELED' || proof.subscriptionStatus === 'EXPIRED') {
      this.transition(
        'CANCELED',
        proof.automaticCancellationRequested ? 'UNPAID_AFTER_NOTICE' : 'EXTERNAL_CANCELLATION',
        now,
      )
    } else if (proof.paymentStatus === 'PAID' && proof.cancellationOperationPending) {
      this.transition('MANUAL_REVIEW', 'PAYMENT_UNCERTAIN', now)
    } else if (proof.paymentStatus === 'PAID') {
      this.transition('RECOVERED', 'PAID', now)
    } else if (proof.subscriptionStatus !== 'ACTIVE') {
      this.transition('MANUAL_REVIEW', 'PROVIDER_DIVERGENCE', now)
    } else if (proof.paymentOperationPending || proof.paymentStatus === 'PENDING') {
      if (this.data.deadlineAt && now >= this.data.deadlineAt)
        this.transition('MANUAL_REVIEW', 'PAYMENT_UNCERTAIN', now)
      else {
        this.transition('PAYMENT_PENDING', null, now)
        this.data.nextActionAt = new Date(now.getTime() + 120_000)
      }
    } else if (this.data.deadlineAt && now >= this.data.deadlineAt) {
      this.transition('CANCEL_PENDING', 'UNPAID_AFTER_NOTICE', now)
      this.data.nextActionAt = new Date(now)
    } else {
      this.transition('OPEN', null, now)
      if (!this.data.initialNoticeAcceptedAt) this.data.nextActionAt = new Date(now)
      else {
        const nextDay =
          this.data.policy.reminderDays.find((day) => day > this.data.lastReminderDay) ??
          this.data.policy.windowDays
        this.data.nextActionAt = new Date(
          this.data.initialNoticeAcceptedAt.getTime() + nextDay * DAY_MS,
        )
      }
    }
  }

  contactFailed(now: Date): void {
    if (!validDate(now)) throw new ValidationError('Relógio inválido')
    if (['RECOVERED', 'CANCELED'].includes(this.data.state)) return
    this.transition('MANUAL_REVIEW', 'CONTACT_FAILED', now)
  }

  /** Only a reviewed, independently paid later receipt authorizes this distinct closeout. */
  resolveAfterSubsequentPayment(now: Date): void {
    if (
      !validDate(now) ||
      now < this.data.openedAt ||
      ['RECOVERED', 'CANCELED'].includes(this.data.state)
    )
      throw new ValidationError('O acompanhamento não aceita esta resolução')
    this.data.lastProviderCheckAt = new Date(now)
    this.transition('RECOVERED', 'SUBSEQUENT_CYCLE_PAID', now)
  }

  sourceDiverged(now: Date): void {
    if (!validDate(now) || now < this.data.openedAt) throw new ValidationError('Relógio inválido')
    if (['RECOVERED', 'CANCELED', 'MANUAL_REVIEW'].includes(this.data.state)) return
    this.transition('MANUAL_REVIEW', 'PROVIDER_DIVERGENCE', now)
  }

  sourceUnavailable(now: Date): void {
    if (!validDate(now) || now < this.data.openedAt) throw new ValidationError('Relógio inválido')
    if (['RECOVERED', 'CANCELED', 'MANUAL_REVIEW'].includes(this.data.state)) return
    const lastKnown = this.data.lastProviderCheckAt ?? this.data.openedAt
    if (now.getTime() - lastKnown.getTime() >= DAY_MS)
      this.transition('MANUAL_REVIEW', 'PAYMENT_UNCERTAIN', now)
    else this.defer(now)
  }

  /** Persist a bounded next attempt without changing the announced deadline. */
  defer(now: Date, delayMs = 120_000): void {
    if (
      !validDate(now) ||
      now < this.data.openedAt ||
      !Number.isSafeInteger(delayMs) ||
      delayMs < 1_000 ||
      delayMs > 900_000
    )
      throw new ValidationError('Próxima tentativa da regularização inválida')
    if (['RECOVERED', 'CANCELED', 'MANUAL_REVIEW'].includes(this.data.state)) return
    this.data.nextActionAt = new Date(now.getTime() + delayMs)
  }

  private transition(state: RecoveryState, reason: RecoveryReason | null, now: Date): void {
    if (this.data.state === state && this.data.reason === reason) return
    this.data.state = state
    this.data.reason = reason
    if (['RECOVERED', 'CANCELED'].includes(state)) this.data.closedAt = new Date(now)
    if (['RECOVERED', 'CANCELED', 'MANUAL_REVIEW'].includes(state)) this.data.nextActionAt = null
    this.addEvent(
      new RecoveryChangedEvent(this.id, {
        consumerId: this.data.consumerId,
        subscriptionId: this.data.subscriptionId,
        state,
        reason,
      }),
    )
  }
}
