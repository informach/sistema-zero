import { and, asc, eq, inArray, lt, lte, sql } from 'drizzle-orm'
import type {
  WebhookDelivery,
  WebhookDeliveryRepository,
} from '../../../domain/ports/webhook-delivery.port'
import { PG_CHANNELS } from './channels'
import type { Database } from './db'
import { webhookDeliveries } from './schema'

/**
 * Fila de entrega de webhooks (Drizzle). `claimDue` usa `FOR UPDATE SKIP LOCKED`
 * + lease (empurra `next_attempt_at`) para ser seguro entre réplicas sem segurar
 * lock durante o POST HTTP.
 */
export class DrizzleWebhookDeliveryRepository implements WebhookDeliveryRepository {
  constructor(private readonly db: Database) {}

  async enqueue(input: {
    consumerId: string
    eventName: string
    dedupKey: string
    payload: Record<string, unknown>
  }): Promise<void> {
    const inserted = await this.db
      .insert(webhookDeliveries)
      .values({
        consumerId: input.consumerId,
        eventName: input.eventName,
        dedupKey: input.dedupKey,
        payload: input.payload,
      })
      // Idempotente: republicação do mesmo evento não duplica a entrega.
      .onConflictDoNothing({
        target: [
          webhookDeliveries.consumerId,
          webhookDeliveries.eventName,
          webhookDeliveries.dedupKey,
        ],
      })
      .returning({ id: webhookDeliveries.id })

    // Só acorda o worker se realmente enfileirou algo novo (evita wake à toa no dedup).
    if (inserted.length > 0) {
      await this.db.execute(sql`select pg_notify(${PG_CHANNELS.webhookDeliveries}, '')`)
    }
  }

  async claimDue(limit: number, leaseMs: number): Promise<WebhookDelivery[]> {
    const now = new Date()
    return this.db.transaction(async (tx) => {
      const locked = await tx
        .select({ id: webhookDeliveries.id })
        .from(webhookDeliveries)
        .where(
          and(eq(webhookDeliveries.status, 'PENDING'), lte(webhookDeliveries.nextAttemptAt, now)),
        )
        .orderBy(asc(webhookDeliveries.nextAttemptAt))
        .limit(limit)
        .for('update', { skipLocked: true })

      if (locked.length === 0) return []

      const ids = locked.map((r) => r.id)
      const lease = new Date(now.getTime() + leaseMs)
      // Incrementa `attempts` ATOMICAMENTE no claim (espelha claimPendingCharges):
      // se o worker morrer (OOM/SIGKILL) entre o claim e o reschedule/markDead, a
      // re-reivindicação pós-lease conta como nova tentativa → o teto `maxAttempts`
      // é respeitado e a mensagem-veneno acaba em DEAD, em vez de re-entregar para
      // sempre com o mesmo contador.
      // UPDATE ... RETURNING: linhas pós-incremento na mesma round-trip (sem
      // SELECT extra dentro da transação com lock).
      const rows = await tx
        .update(webhookDeliveries)
        .set({
          nextAttemptAt: lease,
          updatedAt: now,
          attempts: sql`${webhookDeliveries.attempts} + 1`,
        })
        .where(inArray(webhookDeliveries.id, ids))
        .returning()
      return rows.map((row) => ({
        id: row.id,
        consumerId: row.consumerId,
        eventName: row.eventName,
        payload: row.payload,
        attempts: row.attempts, // já pós-incremento
      }))
    })
  }

  async markSucceeded(id: string, statusCode: number): Promise<void> {
    await this.db
      .update(webhookDeliveries)
      .set({ status: 'SUCCEEDED', lastStatusCode: statusCode, updatedAt: new Date() })
      .where(eq(webhookDeliveries.id, id))
  }

  async reschedule(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
    error: string,
    statusCode?: number,
  ): Promise<void> {
    await this.db
      .update(webhookDeliveries)
      .set({
        status: 'PENDING',
        attempts,
        nextAttemptAt,
        lastError: error.slice(0, 500),
        lastStatusCode: statusCode ?? null,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, id))
  }

  async markDead(id: string, error: string): Promise<void> {
    await this.db
      .update(webhookDeliveries)
      .set({ status: 'DEAD', lastError: error.slice(0, 500), updatedAt: new Date() })
      .where(eq(webhookDeliveries.id, id))
  }

  /**
   * Retenção: remove entregas já terminais (SUCCEEDED/DEAD) mais antigas que
   * `olderThan`. PENDING nunca é tocado. Retorna quantas linhas foram removidas.
   */
  async cleanup(olderThan: Date): Promise<number> {
    const deleted = await this.db
      .delete(webhookDeliveries)
      .where(
        and(
          inArray(webhookDeliveries.status, ['SUCCEEDED', 'DEAD']),
          lt(webhookDeliveries.updatedAt, olderThan),
        ),
      )
      .returning({ id: webhookDeliveries.id })
    return deleted.length
  }
}
