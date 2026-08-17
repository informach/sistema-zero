import { eq, inArray, sql } from 'drizzle-orm'
import type { Database } from './db'
import { outbox, payments, subscriptions, webhookDeliveries } from './schema'

const billingBaseInSaoPaulo = sql`(
  coalesce(${subscriptions.lastChargeAt}, ${subscriptions.createdAt})
  at time zone 'America/Sao_Paulo'
)`
const subscriptionInterval = sql`(${subscriptions.intervalMonths} * interval '1 month')`

/**
 * Próxima execução segundo o calendário documentado da Efí: se o ciclo atual
 * caiu no último dia, os seguintes também caem no último dia. O cálculo usa a
 * hora de parede de São Paulo e só no fim volta a `timestamptz`.
 */
export const subscriptionNextChargeAt = sql<Date>`(
  case
    when (${billingBaseInSaoPaulo})::date = (
      date_trunc('month', ${billingBaseInSaoPaulo}) + interval '1 month - 1 day'
    )::date
      then (
        date_trunc('month', ${billingBaseInSaoPaulo} + ${subscriptionInterval})
        + interval '1 month - 1 day'
        + (${billingBaseInSaoPaulo} - date_trunc('day', ${billingBaseInSaoPaulo}))
      ) at time zone 'America/Sao_Paulo'
    else (${billingBaseInSaoPaulo} + ${subscriptionInterval})
      at time zone 'America/Sao_Paulo'
  end
)`

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
  /**
   * Assinaturas ATIVAS cujo último ciclo pago já passou do intervalo + carência.
   * ⚠️ Alerte em > 0: ou o assinante parou de pagar e ninguém cancelou, ou (o caso
   * do incidente de 08/2026) ele PAGOU e a notificação se perdeu — e aí o acesso
   * cai sozinho no fim da carência.
   */
  subscriptionsOverdue: number
}

/** Contadores leves para monitoramento (lag/backlog). Exposto em GET /metrics. */
export class DrizzleMetricsRepository {
  constructor(
    private readonly db: Database,
    /** Carência considerada antes de contar a assinatura como atrasada (dias). */
    private readonly overdueGraceDays = 3,
  ) {}

  async getMetrics(): Promise<MetricsSnapshot> {
    // 1 query por tabela com `count(*) FILTER` (era 5 counts sequenciais). Os
    // WHERE preservam o uso dos índices por status.
    const [[outboxRow], [awaitingRow], [deliveriesRow], [subscriptionsRow]] = await Promise.all([
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
      // Atrasada = ativa e sem ciclo pago dentro do calendário da Efí + carência.
      // A expressão preserva a regra de último dia; uma soma ingênua a 28/02
      // produziria 28/03, embora o provedor cobre em 31/03.
      this.db
        .select({
          overdue: sql<number>`(count(*) filter (
            where ${subscriptionNextChargeAt}
              + (${this.overdueGraceDays} * interval '1 day') < now()
          ))::int`,
        })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'ACTIVE')),
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
      subscriptionsOverdue: subscriptionsRow?.overdue ?? 0,
    }
  }
}
