import { and, count, eq, isNull } from 'drizzle-orm'
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
}

/** Contadores leves para monitoramento (lag/backlog). Exposto em GET /metrics. */
export class DrizzleMetricsRepository {
  constructor(private readonly db: Database) {}

  async getMetrics(): Promise<MetricsSnapshot> {
    const [outboxPending] = await this.db
      .select({ v: count() })
      .from(outbox)
      .where(eq(outbox.status, 'PENDING'))
    const [outboxDead] = await this.db
      .select({ v: count() })
      .from(outbox)
      .where(eq(outbox.status, 'DEAD'))
    const [awaitingCharge] = await this.db
      .select({ v: count() })
      .from(payments)
      .where(and(eq(payments.status, 'PENDING'), isNull(payments.providerPaymentId)))
    const [deliveriesPending] = await this.db
      .select({ v: count() })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, 'PENDING'))
    const [deliveriesDead] = await this.db
      .select({ v: count() })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, 'DEAD'))

    return {
      outboxPending: outboxPending?.v ?? 0,
      outboxDead: outboxDead?.v ?? 0,
      paymentsAwaitingCharge: awaitingCharge?.v ?? 0,
      webhookDeliveriesPending: deliveriesPending?.v ?? 0,
      webhookDeliveriesDead: deliveriesDead?.v ?? 0,
    }
  }
}
