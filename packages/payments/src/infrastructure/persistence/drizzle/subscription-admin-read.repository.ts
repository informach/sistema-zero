import { and, count, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import type {
  AdminSubscriptionListFilters,
  SubscriptionAdminReadRepository,
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
}
