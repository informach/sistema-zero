import { ValidationError } from '../../../domain/shared/errors'
import {
  CancellationRecord,
  type CancellationRecordSnapshot,
} from '../../../domain/subscription/cancellation-record'

type DateFields = 'requestedAt' | 'recordedAt' | 'confirmedAt' | 'withdrawnAt'
export type CancellationRecordWire = Omit<CancellationRecordSnapshot, DateFields> & {
  requestedAt: string | null
  recordedAt: string
  confirmedAt: string | null
  withdrawnAt: string | null
}
export function cancellationRecordToWire(
  record: CancellationRecordSnapshot | null,
): CancellationRecordWire | null {
  if (!record) return null
  const data = CancellationRecord.restore(record).toSnapshot()
  return {
    ...data,
    requestedAt: data.requestedAt?.toISOString() ?? null,
    recordedAt: data.recordedAt.toISOString(),
    confirmedAt: data.confirmedAt?.toISOString() ?? null,
    withdrawnAt: data.withdrawnAt?.toISOString() ?? null,
  }
}
function decodeDate(value: string): Date {
  if (typeof value !== 'string') throw new ValidationError('Data da auditoria inválida')
  const result = new Date(value)
  if (!Number.isFinite(result.getTime()) || result.toISOString() !== value)
    throw new ValidationError('Data da auditoria inválida')
  return result
}
export function cancellationRecordFromWire(
  record: CancellationRecordWire | null,
): CancellationRecordSnapshot | null {
  if (!record) return null
  return CancellationRecord.restore({
    ...record,
    requestedAt: record.requestedAt === null ? null : decodeDate(record.requestedAt),
    recordedAt: decodeDate(record.recordedAt),
    confirmedAt: record.confirmedAt === null ? null : decodeDate(record.confirmedAt),
    withdrawnAt: record.withdrawnAt === null ? null : decodeDate(record.withdrawnAt),
  }).toSnapshot()
}
