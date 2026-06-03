import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
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
  PaymentMethodBucket,
  PaymentOpsSnapshot,
  PaymentStats,
  PaymentStatsRange,
  PaymentStatusBucket,
} from '../../../domain/ports/payment-admin-read.port'
import type { Database } from './db'
import { rowToSnapshot } from './payment.repository'
import { outbox, payments, webhookDeliveries } from './schema'

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
      status: r.status,
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
