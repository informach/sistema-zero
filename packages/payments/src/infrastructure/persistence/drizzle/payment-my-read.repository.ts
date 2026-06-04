import { and, count, desc, eq, sql } from 'drizzle-orm'
import { PaymentAggregate } from '../../../domain/payment/payment.aggregate'
import type {
  MyPaymentsFilter,
  PaymentMyReadRepository,
} from '../../../domain/ports/payment-my-read.port'
import type { Database } from './db'
import { rowToSnapshot } from './payment.repository'
import { payments } from './schema'

/**
 * Adapter de LEITURA self-service do comprador (Drizzle/Postgres). Apenas
 * SELECTs escopados por `lower(customer->>'email')` — casa o índice de expressão
 * `payments_customer_email_idx`. Fora do hot-path de escrita.
 */
export class DrizzlePaymentMyReadRepository implements PaymentMyReadRepository {
  constructor(private readonly db: Database) {}

  async listByEmail(
    filter: MyPaymentsFilter,
  ): Promise<{ items: PaymentAggregate[]; total: number }> {
    const where = emailMatches(filter.email)
    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(payments)
        .where(where)
        .orderBy(desc(payments.createdAt))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ v: count() }).from(payments).where(where),
    ])
    return {
      items: rows.map((row) => PaymentAggregate.restore(rowToSnapshot(row))),
      total: totalRow?.v ?? 0,
    }
  }

  async findByEmailAndId(email: string, id: string): Promise<PaymentAggregate | null> {
    // O e-mail entra no WHERE (não só o id): id de outro comprador → null (anti-IDOR).
    const [row] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), emailMatches(email)))
      .limit(1)
    return row ? PaymentAggregate.restore(rowToSnapshot(row)) : null
  }
}

function emailMatches(email: string) {
  return sql`lower((${payments.customer} ->> 'email')) = lower(${email})`
}
