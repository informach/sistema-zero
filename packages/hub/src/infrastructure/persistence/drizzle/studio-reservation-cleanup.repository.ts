import { StudioReservationRetirementSchema } from '@sistemazero/core/studio/publication-reservation'
import { and, asc, eq, isNull, lte } from 'drizzle-orm'
import type { StudioReservationCleanupRepository } from '../../../domain/ports/studio-reservation-cleanup.port'
import type { Database } from './db'
import { studioReservationCleanups } from './schema'

export class DrizzleStudioReservationCleanupRepository
  implements StudioReservationCleanupRepository
{
  constructor(private readonly db: Database) {}
  async claim(inputNow: Date, audience?: 'kids' | 'adult') {
    const now = new Date(inputNow.getTime())
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(studioReservationCleanups)
        .where(
          and(
            isNull(studioReservationCleanups.deliveredAt),
            lte(studioReservationCleanups.nextAttemptAt, now),
            audience ? eq(studioReservationCleanups.audience, audience) : undefined,
          ),
        )
        .orderBy(
          asc(studioReservationCleanups.nextAttemptAt),
          asc(studioReservationCleanups.reservationId),
        )
        .limit(1)
        .for('update', { skipLocked: true })
      if (!row) return null
      const payload = StudioReservationRetirementSchema.parse({
        version: 1,
        deliveryId: `studio-reservation-cleanup:${row.reservationId}`,
        reservationId: row.reservationId,
        playId: row.playId,
        authorId: row.authorId,
        accountId: row.accountId,
        audience: row.audience,
        snapshotHash: row.snapshotHash,
        context: row.context,
      })
      const delay = Math.min(3600000, 120000 * 2 ** Math.min(row.attempts, 5))
      await tx
        .update(studioReservationCleanups)
        .set({ attempts: row.attempts + 1, nextAttemptAt: new Date(now.getTime() + delay) })
        .where(eq(studioReservationCleanups.reservationId, row.reservationId))
      return payload
    })
  }
  async acknowledge(reservationId: string, now: Date) {
    await this.db
      .update(studioReservationCleanups)
      .set({ deliveredAt: new Date(now.getTime()) })
      .where(
        and(
          eq(studioReservationCleanups.reservationId, reservationId),
          isNull(studioReservationCleanups.deliveredAt),
        ),
      )
  }
}
