import { eq, lt, sql } from 'drizzle-orm'
import type { ProcessedWebhookStore } from '../../../domain/ports/processed-webhook.port'
import type { Database } from './db'
import { processedWebhooks } from './schema'

export class DrizzleProcessedWebhookStore implements ProcessedWebhookStore {
  constructor(private readonly db: Database) {}

  async isProcessed(deliveryId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: processedWebhooks.deliveryId })
      .from(processedWebhooks)
      .where(eq(processedWebhooks.deliveryId, deliveryId))
      .limit(1)
    return Boolean(row)
  }

  async withDeliveryLock<T>(deliveryId: string, fn: () => Promise<T>): Promise<T> {
    // Hash estável de 64 bits para não conflitar com outro delivery; o lock é
    // mantido por transação enquanto o callback roda.
    const lockId = sql`(('x' || substr(md5(${deliveryId}), 1, 16))::bit(64)::bigint)`

    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`)
      return fn()
    })
  }

  async markProcessed(
    deliveryId: string,
    meta: { paymentId?: string; eventName?: string },
  ): Promise<void> {
    await this.db
      .insert(processedWebhooks)
      .values({ deliveryId, paymentId: meta.paymentId ?? null, eventName: meta.eventName ?? null })
      .onConflictDoNothing({ target: processedWebhooks.deliveryId })
  }

  async pruneOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 3600_000)
    const rows = await this.db
      .delete(processedWebhooks)
      .where(lt(processedWebhooks.processedAt, cutoff))
      .returning({ id: processedWebhooks.deliveryId })
    return rows.length
  }
}

/** Advisory lock próprio do fiscal (não colide com members/payments/funnel). */
export const FISCAL_RETENTION_LOCK_KEY = 58_217_430_991_245_77n

export async function withAdvisoryLock<T>(
  db: Database,
  key: bigint,
  fn: () => Promise<T>,
): Promise<T | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(${key}::bigint) AS locked`,
    )
    if (!row?.locked) return null
    return fn()
  })
}
