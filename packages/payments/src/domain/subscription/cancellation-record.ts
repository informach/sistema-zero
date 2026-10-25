import { ValidationError } from '../shared/errors'

export type CancellationOrigin =
  | 'CUSTOMER'
  | 'ADMIN'
  | 'CONSUMER'
  | 'NONPAYMENT'
  | 'EXTERNAL'
  | 'SCHEDULE_COMPLETED'
export type CancellationContext =
  | { origin: 'CUSTOMER' | 'ADMIN' | 'CONSUMER'; actorId: string }
  | { origin: 'NONPAYMENT'; actorId: 'system:subscription-recovery'; recoveryCaseId: string }
export interface CancellationRecordSnapshot {
  id: string
  origin: CancellationOrigin
  actorId: string | null
  recoveryCaseId: string | null
  requestedAt: Date | null
  recordedAt: Date
  confirmedAt: Date | null
  endedStatus: 'CANCELED' | 'EXPIRED' | null
  withdrawnAt: Date | null
  withdrawalReason: 'RECOVERED' | 'OPERATOR_REVIEW' | null
  supersedesId: string | null
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const origins: readonly CancellationOrigin[] = [
  'CUSTOMER',
  'ADMIN',
  'CONSUMER',
  'NONPAYMENT',
  'EXTERNAL',
  'SCHEDULE_COMPLETED',
]
const validDate = (value: Date) => value instanceof Date && Number.isFinite(value.getTime())
const validActor = (value: string | null) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 128 &&
  Array.from(value).every(
    (character) => character.charCodeAt(0) > 0x20 && character.charCodeAt(0) !== 0x7f,
  )

/** Immutable evidence of an authorized request or a separately observed ending. */
export class CancellationRecord {
  private constructor(private readonly data: CancellationRecordSnapshot) {}

  static request(
    context: CancellationContext,
    now: Date,
    supersedesId: string | null = null,
  ): CancellationRecord {
    return CancellationRecord.restore({
      id: crypto.randomUUID(),
      origin: context.origin,
      actorId: context.actorId,
      recoveryCaseId: context.origin === 'NONPAYMENT' ? context.recoveryCaseId : null,
      requestedAt: now,
      recordedAt: now,
      confirmedAt: null,
      endedStatus: null,
      withdrawnAt: null,
      withdrawalReason: null,
      supersedesId,
    })
  }

  static observed(
    origin: 'EXTERNAL' | 'SCHEDULE_COMPLETED',
    status: 'CANCELED' | 'EXPIRED',
    now: Date,
  ): CancellationRecord {
    return CancellationRecord.restore({
      id: crypto.randomUUID(),
      origin,
      actorId: origin === 'SCHEDULE_COMPLETED' ? 'system:subscription-schedule' : null,
      recoveryCaseId: null,
      requestedAt: null,
      recordedAt: now,
      confirmedAt: now,
      endedStatus: status,
      withdrawnAt: null,
      withdrawalReason: null,
      supersedesId: null,
    })
  }

  static restore(snapshot: CancellationRecordSnapshot): CancellationRecord {
    const requested = snapshot.origin !== 'EXTERNAL' && snapshot.origin !== 'SCHEDULE_COMPLETED'
    const fields = [
      'id',
      'origin',
      'actorId',
      'recoveryCaseId',
      'requestedAt',
      'recordedAt',
      'confirmedAt',
      'endedStatus',
      'withdrawnAt',
      'withdrawalReason',
      'supersedesId',
    ]
    if (
      Object.keys(snapshot).some((key) => !fields.includes(key)) ||
      !uuid.test(snapshot.id) ||
      !origins.includes(snapshot.origin) ||
      !validDate(snapshot.recordedAt) ||
      (snapshot.supersedesId !== null &&
        (!uuid.test(snapshot.supersedesId) || snapshot.supersedesId === snapshot.id)) ||
      (requested
        ? !validActor(snapshot.actorId) ||
          snapshot.requestedAt === null ||
          !validDate(snapshot.requestedAt) ||
          snapshot.requestedAt > snapshot.recordedAt
        : snapshot.requestedAt !== null) ||
      (snapshot.origin === 'EXTERNAL' && snapshot.actorId !== null) ||
      (snapshot.origin === 'SCHEDULE_COMPLETED' &&
        (snapshot.actorId !== 'system:subscription-schedule' ||
          snapshot.endedStatus !== 'EXPIRED')) ||
      (snapshot.origin === 'NONPAYMENT'
        ? snapshot.actorId !== 'system:subscription-recovery' ||
          snapshot.recoveryCaseId === null ||
          !uuid.test(snapshot.recoveryCaseId)
        : snapshot.recoveryCaseId !== null) ||
      (snapshot.confirmedAt === null) !== (snapshot.endedStatus === null) ||
      (snapshot.confirmedAt !== null &&
        (!validDate(snapshot.confirmedAt) ||
          snapshot.confirmedAt < snapshot.recordedAt ||
          !['CANCELED', 'EXPIRED'].includes(snapshot.endedStatus!))) ||
      (snapshot.withdrawnAt === null) !== (snapshot.withdrawalReason === null) ||
      (snapshot.withdrawnAt !== null &&
        (snapshot.origin !== 'NONPAYMENT' ||
          !validDate(snapshot.withdrawnAt) ||
          snapshot.withdrawnAt < snapshot.recordedAt ||
          snapshot.confirmedAt !== null ||
          !['RECOVERED', 'OPERATOR_REVIEW'].includes(snapshot.withdrawalReason!))) ||
      (!requested && (snapshot.confirmedAt === null || snapshot.supersedesId !== null))
    )
      throw new ValidationError('Registro de cancelamento inválido')
    return new CancellationRecord(structuredClone(snapshot))
  }

  get id() {
    return this.data.id
  }
  get origin() {
    return this.data.origin
  }
  toSnapshot(): CancellationRecordSnapshot {
    return structuredClone(this.data)
  }

  confirm(status: 'CANCELED' | 'EXPIRED', now: Date): CancellationRecord {
    if (this.data.confirmedAt) {
      if (this.data.endedStatus === status) return this
      throw new ValidationError('Encerramento já confirmado com outro estado')
    }
    if (this.data.withdrawnAt) throw new ValidationError('Pedido retirado não pode ser confirmado')
    return CancellationRecord.restore({ ...this.data, confirmedAt: now, endedStatus: status })
  }

  withdraw(reason: 'RECOVERED' | 'OPERATOR_REVIEW', now: Date): CancellationRecord {
    if (this.data.withdrawnAt) {
      if (this.data.withdrawalReason === reason) return this
      throw new ValidationError('Pedido já retirado por outro motivo')
    }
    return CancellationRecord.restore({ ...this.data, withdrawnAt: now, withdrawalReason: reason })
  }
}
