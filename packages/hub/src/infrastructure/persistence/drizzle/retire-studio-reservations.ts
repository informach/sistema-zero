import { StudioReservationRetirementSchema } from '@sistemazero/core/studio/publication-reservation'
import { and, eq, inArray, or } from 'drizzle-orm'
import type { Database } from './db'
import { studioPublicationReservations, studioReservationCleanups } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
/** Caller holds the canonical account lock. Terminal transition and attestation commit together. */
export async function retirePendingStudioReservations(
  tx: Transaction,
  accountId: string,
  userIds: readonly string[],
  now: Date,
) {
  const retiredAt = new Date(now.getTime())
  const owners = [...userIds]
  const rows = await tx
    .update(studioPublicationReservations)
    .set({ phase: 'retired', updatedAt: retiredAt })
    .where(
      and(
        eq(studioPublicationReservations.phase, 'reserved'),
        or(
          eq(studioPublicationReservations.accountId, accountId),
          inArray(studioPublicationReservations.authorId, owners),
        ),
      ),
    )
    .returning()
  for (const row of rows) {
    // A legacy/null reference is never upgraded into artifact ownership proof.
    if (!row.accountId || !row.snapshotHash || !row.semanticHash || !row.scopeKey || !row.context)
      continue
    if (
      row.threadId ||
      ![row.scopeKey, row.semanticHash, row.snapshotHash].every((value) =>
        /^[a-f0-9]{64}$/.test(value),
      )
    )
      throw new Error('Incomplete unpublished reservation proof')
    const payload = StudioReservationRetirementSchema.parse({
      version: 1,
      deliveryId: `studio-reservation-cleanup:${row.id}`,
      reservationId: row.id,
      playId: row.playId,
      authorId: row.authorId,
      accountId: row.accountId,
      audience: row.audience,
      snapshotHash: row.snapshotHash,
      context: JSON.parse(row.context),
    })
    await tx
      .insert(studioReservationCleanups)
      .values({
        reservationId: row.id,
        playId: payload.playId,
        authorId: payload.authorId,
        accountId: payload.accountId,
        audience: payload.audience,
        snapshotHash: payload.snapshotHash,
        context: payload.context,
        createdAt: retiredAt,
        nextAttemptAt: retiredAt,
      })
      .onConflictDoNothing({ target: studioReservationCleanups.reservationId })
  }
}
