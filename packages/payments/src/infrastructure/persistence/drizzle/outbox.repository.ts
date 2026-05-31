import { asc, eq } from 'drizzle-orm'
import type { OutboxMessage, OutboxRepository } from '../../../domain/ports/outbox.port'
import type { Database } from './db'
import { outbox } from './schema'

/**
 * Lado de leitura/publicação do outbox (Drizzle/Postgres).
 *
 * `FOR UPDATE SKIP LOCKED` torna o polling seguro com várias réplicas: workers
 * concorrentes travam e pulam linhas diferentes, sem publicar o mesmo evento
 * duas vezes. A publicação é in-process (rápida), então segurar a transação
 * durante o lote é aceitável.
 */
export class DrizzleOutboxRepository implements OutboxRepository {
  constructor(private readonly db: Database) {}

  async processPending(
    limit: number,
    maxAttempts: number,
    publish: (message: OutboxMessage) => Promise<void>,
  ): Promise<{ published: number; failed: number; dead: number }> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(outbox)
        .where(eq(outbox.status, 'PENDING'))
        .orderBy(asc(outbox.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true })

      let published = 0
      let failed = 0
      let dead = 0

      for (const row of rows) {
        const message: OutboxMessage = {
          id: row.id,
          aggregateId: row.aggregateId,
          eventName: row.eventName,
          payload: row.payload,
          attemptCount: row.attemptCount,
          createdAt: row.createdAt,
        }
        try {
          await publish(message)
          await tx
            .update(outbox)
            .set({ status: 'PUBLISHED', publishedAt: new Date() })
            .where(eq(outbox.id, row.id))
          published++
        } catch {
          const attempts = row.attemptCount + 1
          if (attempts >= maxAttempts) {
            // Poison message: tira da fila para não bloquear o head-of-line.
            await tx
              .update(outbox)
              .set({ status: 'DEAD', attemptCount: attempts })
              .where(eq(outbox.id, row.id))
            dead++
          } else {
            await tx.update(outbox).set({ attemptCount: attempts }).where(eq(outbox.id, row.id))
            failed++
          }
        }
      }

      return { published, failed, dead }
    })
  }
}
