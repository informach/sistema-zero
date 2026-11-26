import { and, count, desc, eq, lt, ne, sql } from 'drizzle-orm'
import { PaymentAggregate } from '../../../domain/payment/payment.aggregate'
import {
  PAID_OFFERS_LIMIT,
  type PaidOffersQuery,
  type PaidOffersReader,
} from '../../../domain/ports/paid-offers-read.port'
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
export class DrizzlePaymentMyReadRepository implements PaymentMyReadRepository, PaidOffersReader {
  constructor(private readonly db: Database) {}

  /** Ofertas já pagas pelo e-mail antes da data (o histórico da primeira assinatura). */
  async listPaidOfferIds(query: PaidOffersQuery): Promise<string[]> {
    const offerId = sql<string>`${payments.metadata} ->> 'offerId'`
    const rows = await this.db
      .selectDistinct({ offerId })
      .from(payments)
      .where(
        and(
          emailMatches(query.email),
          eq(payments.status, 'PAID'),
          lt(payments.paidAt, query.before),
          sql`${payments.metadata} ? 'offerId'`,
          query.excludePaymentId ? ne(payments.id, query.excludePaymentId) : undefined,
        ),
      )
      .limit(PAID_OFFERS_LIMIT)
    return rows.flatMap((row) => (row.offerId ? [row.offerId] : []))
  }

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
