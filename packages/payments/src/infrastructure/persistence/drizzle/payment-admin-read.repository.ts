import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { PaymentAggregate } from '../../../domain/payment/payment.aggregate'
import type {
  AdminPaymentListFilters,
  PaymentAdminReadRepository,
  PaymentDailyBucket,
  PaymentDailyRange,
  PaymentDailyStats,
  PaymentMethodBucket,
  PaymentOpsSnapshot,
  PaymentStats,
  PaymentStatsRange,
  PaymentStatusBucket,
} from '../../../domain/ports/payment-admin-read.port'
import type { Database } from './db'
import { rowToSnapshot } from './payment.repository'
import { outbox, payments, toDomainPaymentStatus, webhookDeliveries } from './schema'

/** Fuso do RELATÓRIO: os buckets diários usam o dia civil brasileiro (os
 *  timestamptz são UTC no banco — truncar cru deslocaria vendas da noite). */
const REPORT_TZ = 'America/Sao_Paulo'

/**
 * Adapter de LEITURA admin (Drizzle/Postgres). Apenas SELECTs (cross-consumer):
 * listagem filtrada/paginada, agregações de receita e contadores de lag. Não
 * participa do hot-path de escrita (sem outbox/concorrência).
 */
export class DrizzlePaymentAdminReadRepository implements PaymentAdminReadRepository {
  constructor(private readonly db: Database) {}

  async list(
    filters: AdminPaymentListFilters,
  ): Promise<{ items: PaymentAggregate[]; total: number }> {
    const where = this.buildWhere(filters)
    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(payments)
        .where(where)
        .orderBy(desc(payments.createdAt))
        .limit(filters.limit)
        .offset(filters.offset),
      this.db.select({ v: count() }).from(payments).where(where),
    ])
    return {
      items: rows.map((row) => PaymentAggregate.restore(rowToSnapshot(row))),
      total: totalRow?.v ?? 0,
    }
  }

  async stats(range: PaymentStatsRange): Promise<PaymentStats> {
    const conds: SQL[] = []
    if (range.from) conds.push(gte(payments.createdAt, range.from))
    if (range.to) conds.push(lte(payments.createdAt, range.to))
    const where = conds.length ? and(...conds) : undefined

    const [byStatusRows, byMethodRows] = await Promise.all([
      this.db
        .select({
          status: payments.status,
          c: count(),
          sum: sql<string>`coalesce(sum(${payments.amountInCents}), 0)::text`,
        })
        .from(payments)
        .where(where)
        .groupBy(payments.status),
      this.db
        .select({
          method: payments.method,
          c: count(),
          sum: sql<string>`coalesce(sum(${payments.amountInCents}), 0)::text`,
        })
        .from(payments)
        .where(where)
        .groupBy(payments.method),
    ])

    const byStatus: PaymentStatusBucket[] = byStatusRows.map((r) => ({
      status: toDomainPaymentStatus(r.status),
      count: r.c,
      amountInCents: r.sum,
    }))
    const byMethod: PaymentMethodBucket[] = byMethodRows.map((r) => ({
      method: r.method,
      count: r.c,
      amountInCents: r.sum,
    }))
    const paid = byStatus.find((b) => b.status === 'PAID')
    const refunded = byStatus.find((b) => b.status === 'REFUNDED')

    return {
      totalCount: byStatus.reduce((acc, b) => acc + b.count, 0),
      paidCount: paid?.count ?? 0,
      paidAmountInCents: paid?.amountInCents ?? '0',
      refundedAmountInCents: refunded?.amountInCents ?? '0',
      byStatus,
      byMethod,
    }
  }

  /**
   * Série diária p/ o painel "Gestão de vendas". Três agregações por dia civil
   * em `REPORT_TZ`: transações (criadas), recebido (confirmados por `paid_at` —
   * inclui linhas hoje REFUNDED, pois o dinheiro ENTROU naquele dia) e estornos
   * (REFUNDED pelo dia do estorno: `metadata.refundedAt`, fallback `updated_at`,
   * já que REFUNDED é estado terminal). Líquido = recebido − estornado.
   */
  async statsDaily(range: PaymentDailyRange): Promise<PaymentDailyStats> {
    const offerFilter = range.offerIds?.length
      ? inArray(sql`(${payments.metadata} ->> 'offerId')`, range.offerIds)
      : undefined

    // Fuso INLINE (sql.raw, constante do código): como a expressão aparece no
    // SELECT e no GROUP BY, um bind param geraria placeholders distintos
    // ($1 ≠ $2) e o Postgres rejeitaria o agrupamento (42803).
    const tz = sql.raw(`'${REPORT_TZ}'`)
    const createdDay = sql<string>`((${payments.createdAt} AT TIME ZONE ${tz})::date)::text`
    const paidDay = sql<string>`((${payments.paidAt} AT TIME ZONE ${tz})::date)::text`
    const refundInstant = sql`coalesce((${payments.metadata} ->> 'refundedAt')::timestamptz, ${payments.updatedAt})`
    const refundDay = sql<string>`((${refundInstant} AT TIME ZONE ${tz})::date)::text`
    const amountSum = sql<string>`coalesce(sum(${payments.amountInCents}), 0)::text`

    const [createdRows, paidRows, refundedRows] = await Promise.all([
      this.db
        .select({ day: createdDay, c: count() })
        .from(payments)
        .where(
          and(gte(payments.createdAt, range.from), lte(payments.createdAt, range.to), offerFilter),
        )
        .groupBy(createdDay),
      this.db
        .select({ day: paidDay, sum: amountSum })
        .from(payments)
        .where(
          and(
            isNotNull(payments.paidAt),
            gte(payments.paidAt, range.from),
            lte(payments.paidAt, range.to),
            offerFilter,
          ),
        )
        .groupBy(paidDay),
      this.db
        .select({ day: refundDay, c: count(), sum: amountSum })
        .from(payments)
        .where(
          and(
            eq(payments.status, 'REFUNDED'),
            // ⚠️ Em fragmento `sql` cru o Drizzle NÃO aplica o mapper da coluna:
            // um Date viraria `toString()` JS (inparseável no PG). Passe ISO.
            sql`${refundInstant} >= ${range.from.toISOString()}::timestamptz`,
            sql`${refundInstant} <= ${range.to.toISOString()}::timestamptz`,
            offerFilter,
          ),
        )
        .groupBy(refundDay),
    ])

    const buckets = new Map<string, PaymentDailyBucket>()
    const bucket = (day: string): PaymentDailyBucket => {
      let b = buckets.get(day)
      if (!b) {
        b = {
          day,
          grossAmountInCents: '0',
          refundedAmountInCents: '0',
          netAmountInCents: '0',
          transactions: 0,
          cancellations: 0,
        }
        buckets.set(day, b)
      }
      return b
    }
    for (const r of createdRows) bucket(r.day).transactions = r.c
    for (const r of paidRows) bucket(r.day).grossAmountInCents = r.sum
    for (const r of refundedRows) {
      const b = bucket(r.day)
      b.cancellations = r.c
      b.refundedAmountInCents = r.sum
    }
    for (const b of buckets.values()) {
      b.netAmountInCents = (
        BigInt(b.grossAmountInCents) - BigInt(b.refundedAmountInCents)
      ).toString()
    }

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day)),
    }
  }

  async ops(): Promise<PaymentOpsSnapshot> {
    const [
      [outboxPending],
      [outboxDead],
      [awaitingCharge],
      [deliveriesPending],
      [deliveriesDead],
      [reconcilePending],
    ] = await Promise.all([
      this.db.select({ v: count() }).from(outbox).where(eq(outbox.status, 'PENDING')),
      this.db.select({ v: count() }).from(outbox).where(eq(outbox.status, 'DEAD')),
      this.db
        .select({ v: count() })
        .from(payments)
        .where(and(eq(payments.status, 'PENDING'), isNull(payments.providerPaymentId))),
      this.db
        .select({ v: count() })
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.status, 'PENDING')),
      this.db
        .select({ v: count() })
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.status, 'DEAD')),
      this.db
        .select({ v: count() })
        .from(payments)
        .where(and(eq(payments.status, 'PENDING'), isNotNull(payments.providerPaymentId))),
    ])

    return {
      outboxPending: outboxPending?.v ?? 0,
      outboxDead: outboxDead?.v ?? 0,
      paymentsAwaitingCharge: awaitingCharge?.v ?? 0,
      webhookDeliveriesPending: deliveriesPending?.v ?? 0,
      webhookDeliveriesDead: deliveriesDead?.v ?? 0,
      reconcilePending: reconcilePending?.v ?? 0,
    }
  }

  private buildWhere(filters: AdminPaymentListFilters): SQL | undefined {
    const conds: SQL[] = []
    if (filters.status) conds.push(eq(payments.status, filters.status))
    if (filters.method) conds.push(eq(payments.method, filters.method))
    if (filters.consumerId) conds.push(eq(payments.consumerId, filters.consumerId))
    if (filters.from) conds.push(gte(payments.createdAt, filters.from))
    if (filters.to) conds.push(lte(payments.createdAt, filters.to))
    if (filters.q) {
      const pattern = `%${filters.q}%`
      const search = or(
        ilike(payments.txid, pattern),
        ilike(payments.providerPaymentId, pattern),
        sql`${payments.id}::text ILIKE ${pattern}`,
        sql`(${payments.customer} ->> 'email') ILIKE ${pattern}`,
      )
      if (search) conds.push(search)
    }
    return conds.length ? and(...conds) : undefined
  }
}
