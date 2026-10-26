import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import {
  applyBusinessAudience,
  inspectBusinessAudience,
} from '../../scripts/backfill-business-audience'
import { PaymentAggregate } from '../../src/domain/payment/payment.aggregate'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import { PaymentMethod } from '../../src/domain/value-objects/payment-method'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzlePaymentAdminReadRepository } from '../../src/infrastructure/persistence/drizzle/payment-admin-read.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionAdminReadRepository } from '../../src/infrastructure/persistence/drizzle/subscription-admin-read.repository'

const url = process.env.BUSINESS_AUDIENCE_TEST_DATABASE_URL
if (url) {
  const target = new URL(url)
  if (
    !['localhost', '127.0.0.1'].includes(target.hostname) ||
    !target.port ||
    target.pathname !== '/payments_audience_test'
  )
    throw new Error('Business audience tests require their isolated loopback database')
}
const consumerId = `qa-audience-${crypto.randomUUID()}`
const from = new Date('2020-01-01T00:00:00Z')
const to = new Date('2100-01-01T00:00:00Z')
describe.skipIf(!url)('Comunidade comercial — PostgreSQL', () => {
  let connection: DbConnection
  beforeAll(async () => {
    if (!url) throw new Error('QA database missing')
    connection = createDbConnection(url, { max: 2 })
    await migrate(connection.db, {
      migrationsFolder: `${import.meta.dir}/../../src/infrastructure/persistence/drizzle/migrations`,
      migrationsTable: 'payments_migrations',
      migrationsSchema: 'drizzle',
    })
  })
  afterAll(async () => {
    if (!connection) return
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscription_cancellation_audit where subscription_id in (select id from payments.subscriptions where consumer_id=${consumerId})`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
    await connection.close()
  })
  test('novas compras recebem origem comprovada; desconhecido não vira Kids', async () => {
    const writePayments = new DrizzlePaymentRepository(connection.db)
    const writeSubscriptions = new DrizzleSubscriptionRepository(connection.db)
    for (const [audience, amount] of [
      ['kids', 1000],
      ['adult', 2000],
      [null, 3000],
    ] as const) {
      const metadata = audience
        ? {
            billingAudience: audience,
            billingAudienceSource: 'funnel-registry-v1',
            billingFunnelKey: `qa-${audience}`,
          }
        : { billingAudience: 'kids' }
      const payment = PaymentAggregate.create({
        consumerId,
        amount: Money.fromCents(amount),
        method: PaymentMethod.pix(),
        idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
        metadata,
      })
      payment.markPaid(new Date())
      if (audience === 'adult') payment.refund({ refundedAt: new Date() })
      await writePayments.save(payment)
      const subscription = SubscriptionAggregate.create({
        consumerId,
        amount: Money.fromCents(amount),
        intervalMonths: 1,
        card: { brand: 'visa', last4: '4242' },
        providerPlanId: 'qa-plan',
        idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
        metadata,
      })
      subscription.registerProviderSubscription(`qa-${crypto.randomUUID()}`)
      subscription.activate()
      await writeSubscriptions.save(subscription)
    }
    const payments = new DrizzlePaymentAdminReadRepository(connection.db)
    const subscriptions = new DrizzleSubscriptionAdminReadRepository(connection.db)
    for (const [audience, amount] of [
      ['kids', '1000'],
      ['adult', '2000'],
      ['unassigned', '3000'],
    ] as const) {
      const list = await payments.list({ audience, consumerId, limit: 1, offset: 0 })
      expect(list.total).toBe(1)
      const id = list.items[0]!.id
      expect((await payments.findById(id, audience))?.id).toBe(id)
      expect(await payments.findById(id, audience === 'adult' ? 'kids' : 'adult')).toBeNull()
      expect(list.items[0]?.toSnapshot().amountInCents.toString()).toBe(amount)
      expect(
        (await payments.list({ audience, consumerId, limit: 1, offset: 1 })).items,
      ).toHaveLength(0)
      const stats = await payments.stats({ audience, from, to })
      expect(stats.totalCount).toBe(1)
      expect(stats.byStatus[0]?.amountInCents).toBe(amount)
      expect(stats.paidAmountInCents).toBe(audience === 'adult' ? '0' : amount)
      expect(stats.refundedAmountInCents).toBe(audience === 'adult' ? amount : '0')
      const daily = await payments.statsDaily({ audience, from, to })
      expect(daily.days.reduce((sum, d) => sum + d.transactions, 0)).toBe(1)
      expect(daily.days.reduce((sum, d) => sum + BigInt(d.grossAmountInCents), 0n).toString()).toBe(
        amount,
      )
      expect(
        daily.days.reduce((sum, d) => sum + BigInt(d.refundedAmountInCents), 0n).toString(),
      ).toBe(audience === 'adult' ? amount : '0')
      expect((await subscriptions.list({ audience, consumerId, limit: 1, offset: 0 })).total).toBe(
        1,
      )
      const subscription = (await subscriptions.list({ audience, consumerId, limit: 1, offset: 0 }))
        .items[0]!
      expect((await subscriptions.findById(subscription.id, audience))?.id).toBe(subscription.id)
      expect(
        await subscriptions.findById(subscription.id, audience === 'adult' ? 'kids' : 'adult'),
      ).toBeNull()
      expect((await subscriptions.stats({ audience, from, to })).mrrCents).toBe(amount)
      expect((await subscriptions.stats({ audience, from, to })).newInWindow).toBe(1)
      subscription.cancel(new Date())
      await writeSubscriptions.save(subscription)
      expect((await subscriptions.stats({ audience, from, to })).canceledInWindow).toBe(1)
      expect((await subscriptions.stats({ audience, from, to })).mrrCents).toBe('0')
    }
    // Ordinary aggregate saves must preserve a separately reviewed historical classification.
    const [unknown] =
      await connection.sql`select id from payments.payments where consumer_id=${consumerId} and reporting_audience is null`
    if (!unknown) throw new Error('missing unknown')
    await connection.sql`update payments.payments set reporting_audience='adult' where id=${unknown.id}`
    const restored = await writePayments.findById(unknown.id)
    if (!restored) throw new Error('missing payment')
    await writePayments.save(restored)
    const [row] =
      await connection.sql`select reporting_audience from payments.payments where id=${unknown.id}`
    expect(row?.reporting_audience).toBe('adult')
  })
  test('historical backfill is reviewed, repeatable and leaves financial snapshots untouched', async () => {
    await migrate(connection.db, {
      migrationsFolder: `${import.meta.dir}/../../../catalog/src/infrastructure/persistence/drizzle/migrations`,
      migrationsTable: 'catalog_migrations',
      migrationsSchema: 'drizzle',
    })
    const productId = crypto.randomUUID(),
      offerId = crypto.randomUUID()
    const stamp = '2026-01-01T12:00:00Z'
    await connection.sql`insert into catalog.products (id, audience, sku, slug, name, kind, created_at, updated_at) values (${productId}, 'adult', ${productId}, ${productId}, 'QA', 'course', ${stamp}, ${stamp})`
    await connection.sql`insert into catalog.offers (id, product_id, code, slug, name, price_cents, access_mode, created_at, updated_at) values (${offerId}, ${productId}, ${offerId}, ${offerId}, 'QA', 2300, 'lifetime', ${stamp}, ${stamp})`
    const writer = new DrizzlePaymentRepository(connection.db)
    const old = PaymentAggregate.create({
      consumerId,
      amount: Money.fromCents(2300),
      method: PaymentMethod.pix(),
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
      metadata: { offerId, untouched: 'original' },
    })
    await writer.save(old)
    const [before] =
      await connection.sql`select metadata, updated_at, amount_in_cents, version from payments.payments where id=${old.id}`
    const plan = await inspectBusinessAudience(connection.sql)
    expect(plan.conflicts).toEqual([])
    expect(plan.changes).toContainEqual({
      kind: 'payment',
      id: old.id,
      audience: 'adult',
      productId,
      offerId,
      parentId: null,
    })
    const wrong = await applyBusinessAudience(connection.sql, '0'.repeat(64)).then(
      () => null,
      (error) => error,
    )
    expect(wrong).toBeInstanceOf(Error)
    expect(
      (await connection.sql`select reporting_audience from payments.payments where id=${old.id}`)[0]
        ?.reporting_audience,
    ).toBeNull()
    await applyBusinessAudience(connection.sql, plan.digest)
    const [after] =
      await connection.sql`select metadata, updated_at, amount_in_cents, version from payments.payments where id=${old.id}`
    expect(after).toEqual(before)
    const again = await inspectBusinessAudience(connection.sql)
    expect(again.changes).toHaveLength(0)
    expect((await applyBusinessAudience(connection.sql, again.digest)).applied).toBe(0)
    await connection.sql`update catalog.products set audience='kids' where id=${productId}`
    const conflict = await inspectBusinessAudience(connection.sql)
    expect(conflict.conflicts).toContainEqual({ kind: 'payment', id: old.id })
    const denied = await applyBusinessAudience(connection.sql, conflict.digest).then(
      () => null,
      (error) => error,
    )
    expect(denied).toBeInstanceOf(Error)
    await connection.sql`delete from catalog.offers where id=${offerId}`
    await connection.sql`delete from catalog.products where id=${productId}`
  })
  test('renovação herda a origem revisada da assinatura antiga sem alterar a autoridade financeira', async () => {
    const writeSubs = new DrizzleSubscriptionRepository(connection.db)
    const write = new DrizzlePaymentRepository(connection.db)
    const parent = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(1800),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa',
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
      metadata: {},
    })
    await writeSubs.save(parent)
    await connection.sql`update payments.subscriptions set reporting_audience='adult' where id=${parent.id}`
    for (const conflicting of [false, true]) {
      const metadata = conflicting
        ? {
            billingAudience: 'kids',
            billingAudienceSource: 'funnel-registry-v1',
            billingFunnelKey: 'qa-kids',
          }
        : {}
      const charge = PaymentAggregate.create({
        consumerId,
        subscriptionId: parent.id,
        amount: Money.fromCents(1800),
        method: PaymentMethod.recurringCard({ brand: 'visa', last4: '4242' }),
        idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
        metadata,
      })
      await write.save(charge)
      const [row] =
        await connection.sql`select reporting_audience,metadata from payments.payments where id=${charge.id}`
      expect(row?.reporting_audience).toBe(conflicting ? null : 'adult')
      expect(row?.metadata).toEqual(metadata)
    }
  })
})
