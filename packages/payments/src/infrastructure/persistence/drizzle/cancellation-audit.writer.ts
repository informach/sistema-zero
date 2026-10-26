import { eq } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import {
  CancellationRecord,
  type CancellationRecordSnapshot,
} from '../../../domain/subscription/cancellation-record'
import type { Database } from './db'
import { subscriptionCancellationAudit as audit, subscriptionRecoveryCases } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
const sameDate = (left: Date | null, right: Date | null) => left?.getTime() === right?.getTime()

/** Called inside the subscription CAS/outbox transaction, never through a network handler. */
export async function writeCancellationAudit(
  tx: Transaction,
  subscriptionId: string,
  consumerId: string,
  value: CancellationRecordSnapshot,
): Promise<void> {
  const record = CancellationRecord.restore(value).toSnapshot()
  if (record.recoveryCaseId !== null) {
    const [recoveryCase] = await tx
      .select({
        subscriptionId: subscriptionRecoveryCases.subscriptionId,
        consumerId: subscriptionRecoveryCases.consumerId,
      })
      .from(subscriptionRecoveryCases)
      .where(eq(subscriptionRecoveryCases.id, record.recoveryCaseId))
    if (recoveryCase?.subscriptionId !== subscriptionId || recoveryCase.consumerId !== consumerId)
      throw new ValidationError('O caso de regularização não pertence à assinatura')
  }
  const [current] = await tx.select().from(audit).where(eq(audit.id, record.id)).for('update')
  if (!current) {
    await tx.insert(audit).values({ ...record, subscriptionId, consumerId })
  } else {
    if (
      current.subscriptionId !== subscriptionId ||
      current.supersededBy !== null ||
      current.consumerId !== consumerId ||
      current.origin !== record.origin ||
      current.actorId !== record.actorId ||
      current.recoveryCaseId !== record.recoveryCaseId ||
      current.supersedesId !== record.supersedesId ||
      !sameDate(current.requestedAt, record.requestedAt) ||
      !sameDate(current.recordedAt, record.recordedAt) ||
      (current.confirmedAt !== null &&
        (!sameDate(current.confirmedAt, record.confirmedAt) ||
          current.endedStatus !== record.endedStatus)) ||
      (current.withdrawnAt !== null &&
        (!sameDate(current.withdrawnAt, record.withdrawnAt) ||
          current.withdrawalReason !== record.withdrawalReason)) ||
      (current.confirmedAt !== null && record.withdrawnAt !== null) ||
      (current.withdrawnAt !== null && record.confirmedAt !== null)
    )
      throw new ValidationError('A evidência de cancelamento não pode ser substituída')
    await tx
      .update(audit)
      .set({
        confirmedAt: record.confirmedAt,
        endedStatus: record.endedStatus,
        withdrawnAt: record.withdrawnAt,
        withdrawalReason: record.withdrawalReason,
      })
      .where(eq(audit.id, record.id))
  }
  if (record.supersedesId !== null) {
    const [previous] = await tx
      .select()
      .from(audit)
      .where(eq(audit.id, record.supersedesId))
      .for('update')
    if (
      !previous ||
      previous.subscriptionId !== subscriptionId ||
      previous.consumerId !== consumerId ||
      previous.recordedAt > record.recordedAt ||
      previous.confirmedAt !== null ||
      (previous.supersededBy !== null && previous.supersededBy !== record.id)
    )
      throw new ValidationError('Pedido anterior não corresponde à substituição autorizada')
    await tx
      .update(audit)
      .set({ supersededBy: record.id, supersededAt: record.recordedAt })
      .where(eq(audit.id, previous.id))
  }
}
