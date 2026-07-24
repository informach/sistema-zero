import { randomUUID } from 'node:crypto'
import { and, eq, isNull, lt, lte, or, sql } from 'drizzle-orm'
import type {
  ProcessedWebhookStore,
  WebhookClaim,
} from '../../../domain/ports/processed-webhook.port'
import type { Database } from './db'
import { processedWebhooks } from './schema'

type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type WebhookQueryExecutor = Pick<Database, 'delete'>

export class DrizzleProcessedWebhookStore implements ProcessedWebhookStore {
  constructor(private readonly db: Database) {}

  async claimDelivery(deliveryId: string, staleMs: number): Promise<WebhookClaim> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - staleMs)
    const token = randomUUID()
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(processedWebhooks)
        .values({ deliveryId, processingAt: now, processingToken: token })
        .onConflictDoNothing({ target: processedWebhooks.deliveryId })
        .returning({ id: processedWebhooks.deliveryId })
      if (inserted) return { kind: 'claimed', token }

      const [existing] = await tx
        .select({
          processedAt: processedWebhooks.processedAt,
          processingAt: processedWebhooks.processingAt,
        })
        .from(processedWebhooks)
        .where(eq(processedWebhooks.deliveryId, deliveryId))
        .for('update')
      if (!existing) throw new Error('reserva de webhook desapareceu')
      if (existing.processedAt) return { kind: 'processed' }
      if (existing.processingAt && existing.processingAt > staleBefore) {
        return { kind: 'in_progress' }
      }

      const [reclaimed] = await tx
        .update(processedWebhooks)
        .set({ processingAt: now, processingToken: token })
        .where(
          and(
            eq(processedWebhooks.deliveryId, deliveryId),
            isNull(processedWebhooks.processedAt),
            or(
              isNull(processedWebhooks.processingAt),
              lte(processedWebhooks.processingAt, staleBefore),
            ),
          ),
        )
        .returning({ id: processedWebhooks.deliveryId })
      return reclaimed ? { kind: 'claimed', token } : { kind: 'in_progress' }
    })
  }

  async markProcessed(
    deliveryId: string,
    claimToken: string,
    meta: { paymentId?: string; eventName?: string },
  ): Promise<boolean> {
    const rows = await this.db
      .update(processedWebhooks)
      .set({
        paymentId: meta.paymentId ?? null,
        eventName: meta.eventName ?? null,
        processedAt: new Date(),
        processingAt: null,
        processingToken: null,
      })
      .where(
        and(
          eq(processedWebhooks.deliveryId, deliveryId),
          eq(processedWebhooks.processingToken, claimToken),
          isNull(processedWebhooks.processedAt),
        ),
      )
      .returning({ id: processedWebhooks.deliveryId })
    return rows.length > 0
  }

  async releaseClaim(deliveryId: string, claimToken: string): Promise<void> {
    await this.db
      .delete(processedWebhooks)
      .where(
        and(
          eq(processedWebhooks.deliveryId, deliveryId),
          eq(processedWebhooks.processingToken, claimToken),
          isNull(processedWebhooks.processedAt),
        ),
      )
  }

  async pruneOlderThan(days: number, executor: WebhookQueryExecutor = this.db): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 3600_000)
    const rows = await executor
      .delete(processedWebhooks)
      .where(
        or(
          lt(processedWebhooks.processedAt, cutoff),
          and(isNull(processedWebhooks.processedAt), lt(processedWebhooks.processingAt, cutoff)),
        ),
      )
      .returning({ id: processedWebhooks.deliveryId })
    return rows.length
  }
}

/** Advisory lock próprio do fiscal (não colide com members/payments/funnel). */
export const FISCAL_RETENTION_LOCK_KEY = 58_217_430_991_245_77n

export async function withAdvisoryLock<T>(
  db: Database,
  key: bigint,
  fn: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(${key}::bigint) AS locked`,
    )
    if (!row?.locked) return null
    return fn(tx)
  })
}
