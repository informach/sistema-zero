import { randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import type {
  ProcessedWebhookStore,
  WebhookClaim,
} from '../../../domain/ports/processed-webhook.port'
import type { Database } from './db'
import { processedWebhooks } from './schema'

/** Dedupe das entregas do payments — porte fiel do store do fiscal. */
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

  async pruneProcessedBefore(cutoff: Date): Promise<number> {
    // Retenção (a metade do molde fiscal que o porte tinha largado): o consumer
    // recebe TODO pagamento da plataforma, então sem poda a tabela de dedupe
    // cresce com as vendas da empresa, não com as bolsas.
    // ⚠️ Sob advisory xact-lock, como no fiscal: sem ele N réplicas rodam o
    // MESMO delete e as perdedoras ficam presas em row-lock com transação
    // aberta. Quem não pega o lock devolve 0 e segue.
    return await this.db.transaction(async (tx) => {
      const [locked] = await tx.execute<{ locked: boolean }>(
        sql`select pg_try_advisory_xact_lock(${WEBHOOK_PRUNE_LOCK_KEY}::bigint) as locked`,
      )
      if (!locked?.locked) return 0
      const expired = or(
        lte(processedWebhooks.processedAt, cutoff),
        // Claim ÓRFÃO (morte entre claim e markProcessed): sem esta perna a
        // linha `processing` fica para sempre — o fiscal também a poda.
        and(isNull(processedWebhooks.processedAt), lte(processedWebhooks.processingAt, cutoff)),
      )
      // ⚠️ LIMITE por ciclo: a tabela recebe TODO pagamento da plataforma, e o
      // primeiro corte depois de 30 dias apagaria o backlog inteiro num
      // statement só — estouro do statement_timeout (30s) faria a poda falhar
      // igual em todo ciclo e nunca podar nada. Em lotes ela converge.
      const rows = await tx
        .delete(processedWebhooks)
        .where(
          inArray(
            processedWebhooks.deliveryId,
            tx
              .select({ id: processedWebhooks.deliveryId })
              .from(processedWebhooks)
              .where(expired)
              .limit(PRUNE_BATCH_SIZE),
          ),
        )
        .returning({ id: processedWebhooks.deliveryId })
      return rows.length
    })
  }
}

/**
 * Lock da poda do dedupe — espaço GLOBAL do Postgres compartilhado. Vizinha da
 * chave do sweep (`7429184620031201`) e distinta dela de propósito: a poda não
 * pode disputar o lock com a maturação.
 */
const WEBHOOK_PRUNE_LOCK_KEY = '7429184620031202'
/** Teto por ciclo (a cada 15min converge; sem ele o 1º corte estoura o timeout). */
const PRUNE_BATCH_SIZE = 5_000
