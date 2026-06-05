import { and, asc, eq, lt, ne } from 'drizzle-orm'
import type { OutboxMessage, OutboxRepository } from '../../../domain/ports/outbox.port'
import type { Database } from './db'
import { outbox } from './schema'

/**
 * Lado de leitura/publicação do outbox (Drizzle/Postgres).
 *
 * `FOR UPDATE SKIP LOCKED` torna o polling seguro com várias réplicas: workers
 * concorrentes travam e pulam linhas diferentes, sem publicar o mesmo evento
 * duas vezes. A publicação é in-process (rápida), então segurar a transação
 * durante o lote é aceitável — MANTENHA os handlers leves (sem HTTP/IO externo;
 * entrega lenta vai para `webhook_deliveries`, não para dentro do `publish`).
 *
 * ⚠️ Atomicidade da publicação: o `publish` roda DENTRO desta transação, mas os
 * handlers escrevem via POOL (outra conexão) — ex.: `enqueue` em
 * `webhook_deliveries` commita independentemente do desfecho do lote. Se a
 * transação do lote abortar DEPOIS de um enqueue (ex.: `idle_in_transaction`
 * estourando), o evento volta a PENDING e será republicado → segundo `enqueue`.
 * Isso NÃO duplica a entrega porque o enqueue é idempotente pela unique
 * `(consumer_id, event_name, dedup_key)` — a garantia vem do DEDUP, não da
 * transação. Não remova essa unique sem repensar este fluxo.
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

  /**
   * Retenção: remove eventos já terminais (PUBLISHED/DEAD) mais antigos que
   * `olderThan`. PENDING nunca é tocado. Roda num job periódico (fora do hot path)
   * para a tabela não crescer sem limite. Retorna quantas linhas foram removidas.
   */
  async cleanup(olderThan: Date): Promise<number> {
    const deleted = await this.db
      .delete(outbox)
      .where(and(ne(outbox.status, 'PENDING'), lt(outbox.createdAt, olderThan)))
      .returning({ id: outbox.id })
    return deleted.length
  }
}
