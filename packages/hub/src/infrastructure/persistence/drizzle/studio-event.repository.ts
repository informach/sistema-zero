import { and, asc, eq, isNull, lte } from 'drizzle-orm'
import type { StudioEventRepository } from '../../../domain/ports/studio-event-repository.port'
import type { Database } from './db'
import { studioPublicationEvents } from './schema'

export class DrizzleStudioEventRepository implements StudioEventRepository {
  constructor(private readonly db: Database) {}
  async claim(inputNow: Date) {
    const now = new Date(inputNow.getTime())
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(studioPublicationEvents)
        .where(
          and(
            isNull(studioPublicationEvents.deliveredAt),
            lte(studioPublicationEvents.nextAttemptAt, now),
          ),
        )
        .orderBy(asc(studioPublicationEvents.nextAttemptAt), asc(studioPublicationEvents.eventId))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!row) return null
      const delay = Math.min(3_600_000, 120_000 * 2 ** Math.min(row.attempts, 5))
      await tx
        .update(studioPublicationEvents)
        .set({ attempts: row.attempts + 1, nextAttemptAt: new Date(now.getTime() + delay) })
        .where(eq(studioPublicationEvents.eventId, row.eventId))
      return { eventId: row.eventId, event: row.event }
    })
  }
  async acknowledge(eventId: string, now: Date) {
    await this.db
      .update(studioPublicationEvents)
      .set({ deliveredAt: new Date(now.getTime()) })
      .where(
        and(
          eq(studioPublicationEvents.eventId, eventId),
          isNull(studioPublicationEvents.deliveredAt),
        ),
      )
  }
}
