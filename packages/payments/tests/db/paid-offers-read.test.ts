import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentMyReadRepository } from '../../src/infrastructure/persistence/drizzle/payment-my-read.repository'
import { prepareTestDatabase } from './test-database'

/**
 * As ofertas já pagas por um e-mail antes de uma data (`GET /payments/internal/customers/paid-offers`,
 * a primeira assinatura do bônus de indicação, 25/11/2026) no SQL de verdade.
 */
const url = await prepareTestDatabase()
describe.skipIf(!url)('ofertas pagas pelo e-mail: Postgres real', () => {
  let conn: DbConnection
  const email = `familia-${randomUUID().slice(0, 8)}@example.com`
  const [offerA, offerB, offerC] = [randomUUID(), randomUUID(), randomUUID()]
  const ids: string[] = []

  beforeAll(async () => {
    conn = createDbConnection(url!)
    await migrate(conn.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'payments_migrations',
    })
  })
  afterAll(async () => {
    if (!conn) return
    if (ids.length) await conn.sql`delete from payments.payments where id in ${conn.sql(ids)}`
    await conn.close()
  })

  async function pay(row: {
    email?: string
    status?: string
    paidAt?: string | null
    metadata?: Record<string, unknown>
  }) {
    const id = randomUUID()
    ids.push(id)
    await conn.sql`insert into payments.payments
      (id, consumer_id, status, method, amount_in_cents, currency, provider, idempotency_key,
       customer, metadata, created_at, updated_at, paid_at)
      values (${id}, 'funnel', ${row.status ?? 'PAID'}, 'PIX', 9700, 'BRL', 'fake', ${id},
        ${JSON.stringify({ email: row.email ?? email, name: 'Família' })}::jsonb,
        ${JSON.stringify(row.metadata ?? {})}::jsonb, now(), now(),
        ${row.paidAt === undefined ? '2033-01-10T00:00:00Z' : row.paidAt}::timestamptz)`
    return id
  }

  test('só PAID, antes da data, do e-mail (sem caixa), com oferta, sem a própria compra e sem repetir', async () => {
    await pay({ metadata: { offerId: offerA } })
    await pay({ email: email.toUpperCase(), metadata: { offerId: offerA } })
    await pay({ metadata: { offerId: offerB }, paidAt: '2033-01-05T00:00:00Z' })
    const current = await pay({ metadata: { offerId: offerC } })
    await pay({ metadata: { offerId: offerC }, paidAt: '2033-03-01T00:00:00Z' }) // depois
    await pay({ status: 'REFUNDED', metadata: { offerId: offerC } })
    await pay({ status: 'PENDING', paidAt: null, metadata: { offerId: offerC } })
    await pay({ metadata: {} })
    await pay({ email: 'outra@example.com', metadata: { offerId: offerC } })

    const repo = new DrizzlePaymentMyReadRepository(conn.db)
    const found = await repo.listPaidOfferIds({
      email,
      before: new Date('2033-02-01T00:00:00Z'),
      excludePaymentId: current,
    })
    expect(found.sort()).toEqual([offerA, offerB].sort())
    expect(
      (
        await repo.listPaidOfferIds({
          email,
          before: new Date('2033-01-06T00:00:00Z'),
          excludePaymentId: '',
        })
      ).sort(),
    ).toEqual([offerB])
  })
})
