import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionBillingRepository } from '../../src/infrastructure/persistence/drizzle/subscription-billing.repository'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_subscription_billing_test')
describe.skipIf(!url)('Calendário público comprovado — PostgreSQL', () => {
  let connection: DbConnection
  let billing: DrizzleSubscriptionBillingRepository
  let subscriptions: DrizzleSubscriptionRepository
  let payments: DrizzlePaymentRepository
  let subscription: SubscriptionAggregate
  let now: Date
  const consumerId = 'qa-billing-calendar'
  const period = { startsAt: '2026-10-16T12:00:00.000Z', endsAt: '2026-11-16T12:00:00.000Z' }
  const observation = (date = '2026-11-16', at = now) => ({
    subscriptionId: subscription.id,
    consumerId,
    provider: subscription.provider,
    providerSubscriptionId: 'qa-provider-calendar',
    intervalMonths: 1,
    observation: { nextExecution: date, observedAt: at.toISOString() },
  })
  const read = async (at = now) =>
    (await billing.readForSubscriptions([subscription.id], at)).get(subscription.id)
  beforeAll(async () => {
    if (!url) throw new Error('Missing QA database')
    connection = createDbConnection(url, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: `${import.meta.dir}/../../src/infrastructure/persistence/drizzle/migrations`,
      migrationsTable: 'payments_migrations',
      migrationsSchema: 'drizzle',
    })
    billing = new DrizzleSubscriptionBillingRepository(connection.db)
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
    payments = new DrizzlePaymentRepository(connection.db)
  })
  afterAll(async () => {
    await connection?.close()
  })
  afterEach(async () => {
    if (!subscription) return
    await connection.sql`delete from payments.outbox where aggregate_id=${subscription.id} or aggregate_id in (select id::text from payments.payments where subscription_id=${subscription.id})`
    await connection.sql`delete from payments.payments where subscription_id=${subscription.id}`
    await connection.sql`delete from payments.subscription_cancellation_audit where subscription_id=${subscription.id}`
    await connection.sql`delete from payments.subscriptions where id=${subscription.id}`
  })
  beforeEach(async () => {
    now = new Date('2026-10-24T12:00:00.000Z')
    subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan-calendar',
      idempotencyKey: IdempotencyKey.create(`qa-calendar-${crypto.randomUUID()}`),
    })
    subscription.registerProviderSubscription('qa-provider-calendar')
    subscription.activate()
    await subscriptions.save(subscription)
    const loaded = await subscriptions.findById(subscription.id)
    if (!loaded) throw new Error('Missing persisted QA subscription')
    subscription = loaded
  })

  test('sem prova não inventa calendário; observação recente não muda lastChargeAt ou versão', async () => {
    expect(await read()).toEqual({
      nextExecution: null,
      scheduleObservedAt: null,
      paidPeriod: null,
    })
    const version = subscription.toSnapshot().version
    await billing.recordSchedule(observation())
    expect(await read()).toMatchObject({
      nextExecution: '2026-11-16',
      scheduleObservedAt: now.toISOString(),
    })
    const saved = await subscriptions.findById(subscription.id)
    expect(saved?.lastChargeAt).toBeNull()
    expect(saved?.toSnapshot().version).toBe(version)
  })

  test('observações concorrentes/antigas e origem divergente não substituem a mais recente', async () => {
    const newer = new Date(now.getTime() + 1000)
    await Promise.all([
      billing.recordSchedule(observation('2026-11-16')),
      billing.recordSchedule(observation('2026-11-17', newer)),
    ])
    now = newer
    await billing.recordSchedule(observation('2026-11-18', new Date(now.getTime() - 1000)))
    await billing.recordSchedule({ ...observation('2026-11-19'), consumerId: 'other-owner' })
    expect((await read())?.nextExecution).toBe('2026-11-17')
  })

  test('save normal do agregado não apaga projeção; pedido de cancelamento retira previsão', async () => {
    await billing.recordSchedule(observation())
    const saved = await subscriptions.findById(subscription.id)
    if (!saved) throw new Error('Missing QA subscription')
    saved.updateCard({ brand: 'visa', last4: '1234' })
    await subscriptions.save(saved)
    expect((await read())?.nextExecution).toBe('2026-11-16')
    const fresh = await subscriptions.findById(subscription.id)
    if (!fresh) throw new Error('Missing updated QA subscription')
    fresh.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' })
    await subscriptions.save(fresh)
    expect((await read())?.nextExecution).toBeNull()
  })

  test('leitura vencida, futura ou data já passada fica sem próxima cobrança', async () => {
    await billing.recordSchedule(observation())
    expect((await read(new Date(now.getTime() + 24 * 60 * 60_000)))?.nextExecution).toBeNull()
    expect((await read(new Date(now.getTime() - 1)))?.nextExecution).toBeNull()
    await billing.recordSchedule(observation('2026-10-23', new Date(now.getTime() + 1)))
    expect((await read(new Date(now.getTime() + 1)))?.nextExecution).toBeNull()
  })

  test('pagamento atrasado preserva o fim original e não concede um período contado do recebimento', async () => {
    subscription.recordCharge('qa-late-paid', now)
    await subscriptions.save(subscription)
    await payments.save(
      buildCyclePayment({
        subscription,
        chargeId: 'qa-late-paid',
        status: 'PAID',
        paidAt: now,
        cycleAccess: { version: 1, kind: 'VERIFIED_PERIOD', period },
      }),
    )
    await billing.recordSchedule(observation())
    expect(await read()).toEqual({
      nextExecution: '2026-11-16',
      scheduleObservedAt: now.toISOString(),
      paidPeriod: period,
    })
    expect((await subscriptions.findById(subscription.id))?.lastChargeAt?.toISOString()).toBe(
      now.toISOString(),
    )
  })

  test('calendário anterior ao recibo novo não anuncia outra cobrança do ciclo já pago', async () => {
    await billing.recordSchedule(observation('2026-10-24'))
    await payments.save(
      buildCyclePayment({
        subscription,
        chargeId: 'qa-current-paid',
        status: 'PAID',
        paidAt: now,
        cycleAccess: { version: 1, kind: 'VERIFIED_PERIOD', period },
      }),
    )
    expect(await read()).toEqual({
      nextExecution: null,
      scheduleObservedAt: null,
      paidPeriod: period,
    })
  })

  test('recebimento fora de ordem não substitui o período original mais recente', async () => {
    await payments.save(
      buildCyclePayment({
        subscription,
        chargeId: 'qa-new-period',
        status: 'PAID',
        paidAt: new Date(now.getTime() - 1000),
        cycleAccess: { version: 1, kind: 'VERIFIED_PERIOD', period },
      }),
    )
    await payments.save(
      buildCyclePayment({
        subscription,
        chargeId: 'qa-old-period-late',
        status: 'PAID',
        paidAt: now,
        cycleAccess: {
          version: 1,
          kind: 'VERIFIED_PERIOD',
          period: { startsAt: '2026-09-16T12:00:00.000Z', endsAt: period.startsAt },
        },
      }),
    )
    expect((await read())?.paidPeriod).toEqual(period)
  })

  test('dinheiro pago com período em revisão não ganha prazo fictício na tela', async () => {
    await payments.save(
      buildCyclePayment({
        subscription,
        chargeId: 'qa-review-period',
        status: 'PAID',
        paidAt: now,
        cycleAccess: { version: 1, kind: 'REVIEW_REQUIRED', reason: 'PERIOD_UNAVAILABLE' },
      }),
    )
    expect((await read())?.paidPeriod).toBeNull()
  })

  test('recibo de consumidor diferente e IDs não solicitados não contaminam a leitura', async () => {
    const other = SubscriptionAggregate.restore({
      ...subscription.toSnapshot(),
      consumerId: 'other-owner',
    })
    await payments.save(
      buildCyclePayment({
        subscription: other,
        chargeId: 'qa-other-paid',
        status: 'PAID',
        paidAt: now,
        cycleAccess: { version: 1, kind: 'VERIFIED_PERIOD', period },
      }),
    )
    expect((await read())?.paidPeriod).toBeNull()
    expect(await billing.readForSubscriptions([], now)).toEqual(new Map())
    expect(await billing.readForSubscriptions([crypto.randomUUID()], now)).toEqual(new Map())
  })
})
