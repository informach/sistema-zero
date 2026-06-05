import { eq, inArray, sql } from 'drizzle-orm'
import type { Database } from './db'
import { outbox, payments, webhookDeliveries } from './schema'

export interface MetricsSnapshot {
  /** Eventos de domínio ainda não publicados (lag do outbox). */
  outboxPending: number
  /** Eventos de domínio que esgotaram as tentativas de publicação (dead-letter). */
  outboxDead: number
  /** Pagamentos aceitos aguardando criação da cobrança (fila do modo assíncrono). */
  paymentsAwaitingCharge: number
  /** Webhooks de saída pendentes de entrega. */
  webhookDeliveriesPending: number
  /** Webhooks de saída que esgotaram as tentativas. */
  webhookDeliveriesDead: number
  /** Idade (s) do evento PENDING mais antigo do outbox — null sem backlog.
   *  Alerte na IDADE (pega poller morto), não só na contagem. */
  outboxOldestPendingAgeSeconds: number | null
  /** Idade (s) da entrega PENDING mais antiga — null sem backlog. */
  webhookDeliveriesOldestPendingAgeSeconds: number | null
  /** PENDING com divergência de valor pago (revisão manual). Alerte em > 0. */
  amountMismatchPending: number
}

/** Contadores leves para monitoramento (lag/backlog). Exposto em GET /metrics. */
export class DrizzleMetricsRepository {
  constructor(private readonly db: Database) {}

  async getMetrics(): Promise<MetricsSnapshot> {
    // 1 query por tabela com `count(*) FILTER` (era 5 counts sequenciais). Os
    // WHERE preservam o uso dos índices por status.
    const [[outboxRow], [awaitingRow], [deliveriesRow]] = await Promise.all([
      this.db
        .select({
          pending: sql<number>`(count(*) filter (where ${outbox.status} = 'PENDING'))::int`,
          dead: sql<number>`(count(*) filter (where ${outbox.status} = 'DEAD'))::int`,
          oldestPendingAgeSeconds: sql<
            number | null
          >`floor(extract(epoch from (now() - min(${outbox.createdAt}) filter (where ${outbox.status} = 'PENDING'))))::int`,
        })
        .from(outbox)
        .where(inArray(outbox.status, ['PENDING', 'DEAD'])),
      this.db
        .select({
          v: sql<number>`(count(*) filter (where ${payments.providerPaymentId} is null))::int`,
          amountMismatch: sql<number>`(count(*) filter (where ${payments.metadata} ? 'amountMismatch'))::int`,
        })
        .from(payments)
        .where(eq(payments.status, 'PENDING')),
      this.db
        .select({
          pending: sql<number>`(count(*) filter (where ${webhookDeliveries.status} = 'PENDING'))::int`,
          dead: sql<number>`(count(*) filter (where ${webhookDeliveries.status} = 'DEAD'))::int`,
          oldestPendingAgeSeconds: sql<
            number | null
          >`floor(extract(epoch from (now() - min(${webhookDeliveries.createdAt}) filter (where ${webhookDeliveries.status} = 'PENDING'))))::int`,
        })
        .from(webhookDeliveries)
        .where(inArray(webhookDeliveries.status, ['PENDING', 'DEAD'])),
    ])

    return {
      outboxPending: outboxRow?.pending ?? 0,
      outboxDead: outboxRow?.dead ?? 0,
      paymentsAwaitingCharge: awaitingRow?.v ?? 0,
      webhookDeliveriesPending: deliveriesRow?.pending ?? 0,
      webhookDeliveriesDead: deliveriesRow?.dead ?? 0,
      outboxOldestPendingAgeSeconds: outboxRow?.oldestPendingAgeSeconds ?? null,
      webhookDeliveriesOldestPendingAgeSeconds: deliveriesRow?.oldestPendingAgeSeconds ?? null,
      amountMismatchPending: awaitingRow?.amountMismatch ?? 0,
    }
  }
}
