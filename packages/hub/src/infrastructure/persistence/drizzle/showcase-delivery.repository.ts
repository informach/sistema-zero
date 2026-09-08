import { and, asc, eq, isNull, lte } from 'drizzle-orm'
import type { ShowcaseDeliveryRepository } from '../../../domain/ports/showcase-delivery-repository.port'
import type { Database } from './db'
import { showcaseDeliveries } from './schema'

export class DrizzleShowcaseDeliveryRepository implements ShowcaseDeliveryRepository {
  constructor(private readonly db: Database) {}

  async findStatus(userId: string, accountId: string, courseId: string) {
    const rows = await this.db
      .select({ deliveredAt: showcaseDeliveries.deliveredAt })
      .from(showcaseDeliveries)
      .where(
        and(
          eq(showcaseDeliveries.userId, userId),
          eq(showcaseDeliveries.accountId, accountId),
          eq(showcaseDeliveries.courseId, courseId),
        ),
      )
    if (!rows.length) return 'none'
    return rows.some((row) => row.deliveredAt) ? 'delivered' : 'pending'
  }

  async claim(now: Date) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(showcaseDeliveries)
        .where(
          and(isNull(showcaseDeliveries.deliveredAt), lte(showcaseDeliveries.nextAttemptAt, now)),
        )
        .orderBy(asc(showcaseDeliveries.nextAttemptAt))
        .limit(1)
        .for('update', { skipLocked: true })
      if (!row) return null
      const delay = Math.min(3_600_000, 120_000 * 2 ** Math.min(row.attempts, 5))
      await tx
        .update(showcaseDeliveries)
        .set({ attempts: row.attempts + 1, nextAttemptAt: new Date(now.getTime() + delay) })
        .where(eq(showcaseDeliveries.threadId, row.threadId))
      return {
        threadId: row.threadId,
        payload: {
          userId: row.userId,
          accountId: row.accountId,
          courseId: row.courseId,
          audience: row.audience,
        },
      }
    })
  }

  async acknowledge(threadId: string, now: Date) {
    await this.db
      .update(showcaseDeliveries)
      .set({ deliveredAt: now })
      .where(eq(showcaseDeliveries.threadId, threadId))
  }
}
