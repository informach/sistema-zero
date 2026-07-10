import { and, count, desc, eq, gte, ilike, isNotNull, lte, or, type SQL, sql } from 'drizzle-orm'
import type {
  AdminSubscriptionListFilters,
  SubscriptionAdminReadRepository,
  SubscriptionStats,
  SubscriptionStatsWindow,
} from '../../../domain/ports/subscription-admin-read.port'
import { SubscriptionAggregate } from '../../../domain/subscription/subscription.aggregate'
import type { Database } from './db'
import { subscriptions } from './schema'
import { rowToSnapshot } from './subscription.repository'

/** Adapter de LEITURA admin de assinaturas (Drizzle/Postgres). Apenas SELECTs. */
export class DrizzleSubscriptionAdminReadRepository implements SubscriptionAdminReadRepository {
  constructor(private readonly db: Database) {}

  async list(
    filters: AdminSubscriptionListFilters,
  ): Promise<{ items: SubscriptionAggregate[]; total: number }> {
    const conds: SQL[] = []
    if (filters.status) conds.push(eq(subscriptions.status, filters.status))
    if (filters.consumerId) conds.push(eq(subscriptions.consumerId, filters.consumerId))
    if (filters.q) {
      const pattern = `%${filters.q}%`
      const search = or(
        ilike(subscriptions.providerSubscriptionId, pattern),
        sql`${subscriptions.id}::text ILIKE ${pattern}`,
        sql`(${subscriptions.customer} ->> 'email') ILIKE ${pattern}`,
      )
      if (search) conds.push(search)
    }
    const where = conds.length ? and(...conds) : undefined

    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(subscriptions)
        .where(where)
        .orderBy(desc(subscriptions.createdAt))
        .limit(filters.limit)
        .offset(filters.offset),
      this.db.select({ v: count() }).from(subscriptions).where(where),
    ])
    return {
      items: rows.map((row) => SubscriptionAggregate.restore(rowToSnapshot(row))),
      total: totalRow?.v ?? 0,
    }
  }

  async stats(window: SubscriptionStatsWindow): Promise<SubscriptionStats> {
    // Ativas por periodicidade + MRR numa varredura só. A divisão é NUMERIC
    // (bigint/int truncaria os centavos da anual) e arredonda no fim.
    const [activeRows, [newRow], [canceledRow]] = await Promise.all([
      this.db
        .select({
          intervalMonths: subscriptions.intervalMonths,
          n: count(),
          mrr: sql<string>`coalesce(round(sum(${subscriptions.amountInCents}::numeric / ${subscriptions.intervalMonths})), 0)::text`,
        })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'ACTIVE'))
        .groupBy(subscriptions.intervalMonths),
      this.db
        .select({ v: count() })
        .from(subscriptions)
        .where(
          and(gte(subscriptions.createdAt, window.from), lte(subscriptions.createdAt, window.to)),
        ),
      this.db
        .select({ v: count() })
        .from(subscriptions)
        .where(
          and(
            isNotNull(subscriptions.canceledAt),
            gte(subscriptions.canceledAt, window.from),
            lte(subscriptions.canceledAt, window.to),
          ),
        ),
    ])

    const active = { total: 0, monthly: 0, annual: 0, other: 0 }
    let mrr = 0n
    for (const row of activeRows) {
      active.total += row.n
      if (row.intervalMonths === 1) active.monthly += row.n
      else if (row.intervalMonths === 12) active.annual += row.n
      else active.other += row.n
      mrr += BigInt(row.mrr)
    }

    return {
      active,
      mrrCents: mrr.toString(),
      newInWindow: newRow?.v ?? 0,
      canceledInWindow: canceledRow?.v ?? 0,
    }
  }
}
