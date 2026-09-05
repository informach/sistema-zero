import { and, asc, eq, lte, or } from 'drizzle-orm'
import type { PortalNotificationOutboxRepository } from '../../../domain/ports/portal-notification-outbox.port'
import type { Database } from './db'
import { portalNotificationOutbox } from './schema'

export class DrizzlePortalNotificationOutboxRepository
  implements PortalNotificationOutboxRepository
{
  constructor(private readonly db: Database) {}

  async claimDue(leaseMs: number, at: Date) {
    return this.db.transaction(async (tx) => {
      const [due] = await tx
        .select()
        .from(portalNotificationOutbox)
        .where(
          or(
            and(
              eq(portalNotificationOutbox.status, 'pending'),
              lte(portalNotificationOutbox.nextAttemptAt, at),
            ),
            and(
              eq(portalNotificationOutbox.status, 'processing'),
              lte(portalNotificationOutbox.leaseExpiresAt, at),
            ),
          ),
        )
        .orderBy(
          asc(portalNotificationOutbox.nextAttemptAt),
          asc(portalNotificationOutbox.createdAt),
          asc(portalNotificationOutbox.id),
        )
        .limit(1)
        .for('update', { skipLocked: true })
      if (!due) return null

      const [claimed] = await tx
        .update(portalNotificationOutbox)
        .set({
          status: 'processing',
          attempts: due.attempts + 1,
          leaseExpiresAt: new Date(at.getTime() + leaseMs),
          updatedAt: at,
        })
        .where(
          and(
            eq(portalNotificationOutbox.id, due.id),
            eq(portalNotificationOutbox.attempts, due.attempts),
          ),
        )
        .returning()
      return claimed ?? null
    })
  }

  async markSent(id: string, attempt: number, at: Date): Promise<boolean> {
    const rows = await this.db
      .update(portalNotificationOutbox)
      .set({
        status: 'sent',
        leaseExpiresAt: null,
        sentAt: at,
        lastError: null,
        updatedAt: at,
      })
      .where(
        and(
          eq(portalNotificationOutbox.id, id),
          eq(portalNotificationOutbox.status, 'processing'),
          eq(portalNotificationOutbox.attempts, attempt),
        ),
      )
      .returning({ id: portalNotificationOutbox.id })
    return rows.length > 0
  }

  async scheduleRetry(
    id: string,
    attempt: number,
    nextAt: Date,
    error: string,
    at: Date,
  ): Promise<boolean> {
    const rows = await this.db
      .update(portalNotificationOutbox)
      .set({
        status: 'pending',
        nextAttemptAt: nextAt,
        leaseExpiresAt: null,
        lastError: error.slice(0, 500),
        updatedAt: at,
      })
      .where(
        and(
          eq(portalNotificationOutbox.id, id),
          eq(portalNotificationOutbox.status, 'processing'),
          eq(portalNotificationOutbox.attempts, attempt),
        ),
      )
      .returning({ id: portalNotificationOutbox.id })
    return rows.length > 0
  }
}
