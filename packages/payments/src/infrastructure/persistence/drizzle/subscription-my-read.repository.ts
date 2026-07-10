import { desc, eq, sql } from 'drizzle-orm'
import type { SubscriptionMyReadRepository } from '../../../domain/ports/subscription-my-read.port'
import { SubscriptionAggregate } from '../../../domain/subscription/subscription.aggregate'
import type { Database } from './db'
import { subscriptions } from './schema'
import { rowToSnapshot } from './subscription.repository'

/** Teto defensivo — um comprador tem punhados de assinaturas, nunca centenas. */
const LIST_LIMIT = 50

/**
 * Adapter de leitura "minhas assinaturas" (Drizzle/Postgres). SELECTs escopados
 * por `lower(customer->>'email')` — casa o índice de expressão
 * `subscriptions_customer_email_idx`. Fora do hot-path de escrita.
 */
export class DrizzleSubscriptionMyReadRepository implements SubscriptionMyReadRepository {
  constructor(private readonly db: Database) {}

  async listByEmail(email: string): Promise<SubscriptionAggregate[]> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(emailMatches(email))
      .orderBy(desc(subscriptions.createdAt))
      .limit(LIST_LIMIT)
    return rows.map((row) => SubscriptionAggregate.restore(rowToSnapshot(row)))
  }

  async findByEmailAndId(email: string, id: string): Promise<SubscriptionAggregate | null> {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(sql`${emailMatches(email)} and ${eq(subscriptions.id, id)}`)
      .limit(1)
    return row ? SubscriptionAggregate.restore(rowToSnapshot(row)) : null
  }
}

function emailMatches(email: string) {
  return sql`lower((${subscriptions.customer} ->> 'email')) = lower(${email})`
}
