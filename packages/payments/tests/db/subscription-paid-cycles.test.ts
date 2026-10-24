import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
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
import { DrizzleWebhookInbox } from '../../src/infrastructure/persistence/drizzle/webhook-inbox.repository'
import { FakePixGateway, silentLogger } from '../fakes/in-memory'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_paid_cycle_test')
const consumerId = `qa-paid-cycle-${crypto.randomUUID()}`
async function failureOf(work: Promise<unknown>) {
  try {
    await work
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!url)('Identidade permanente de ciclos — PostgreSQL real', () => {
  let connection: DbConnection
  let subscriptions: DrizzleSubscriptionRepository
  let payments: DrizzlePaymentRepository
  const eventIds: string[] = []
  beforeAll(async () => {
    if (!url) throw new Error('Missing QA database')
    connection = createDbConnection(url, { max: 5 })
    await migrate(connection.db, {
      migrationsFolder: `${import.meta.dir}/../../src/infrastructure/persistence/drizzle/migrations`,
      migrationsTable: 'payments_migrations',
      migrationsSchema: 'drizzle',
    })
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
    payments = new DrizzlePaymentRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  afterEach(async () => {
    await connection.sql`delete from payments.subscription_cancellation_audit where consumer_id=${consumerId}`
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    for (const id of eventIds.splice(0))
      await connection.sql`delete from payments.webhook_events where provider='EFI' and provider_event_id=${id}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
  })
  async function fixture(repeats = 4) {
    const providerId = `qa-paid-parent-${crypto.randomUUID()}`
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      repeats,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
    })
    subscription.registerProviderSubscription(providerId)
    subscription.activate()
    subscription.recordCharge(`qa-initial-${crypto.randomUUID()}`, new Date('2026-07-24T12:00:00Z'))
    await subscriptions.save(subscription)
    const input = (chargeId: string) => ({
      subscriptionId: subscription.id,
      consumerId,
      provider: 'EFI',
      providerSubscriptionId: providerId,
      chargeId,
    })
    return { subscription, providerId, input }
  }
  test('reentrega após retenção de inbox e outbox não conta ciclo nem expira plano antes da hora', async () => {
    const { subscription, providerId } = await fixture()
    const a = `qa-a-${crypto.randomUUID()}`,
      b = `qa-b-${crypto.randomUUID()}`
    const gateway = new FakePixGateway()
    gateway.cardStatus = 'PAID'
    gateway.overrideAmountInCents = 9700n
    gateway.subscriptionStatus = 'ACTIVE'
    gateway.setSubscriptionCharges(providerId, [
      { chargeId: a, status: 'PAID', createdAt: new Date('2026-08-24T12:00:00Z') },
      { chargeId: b, status: 'PAID', createdAt: new Date('2026-09-24T12:00:00Z') },
    ])
    const handler = new HandleSubscriptionNotificationService(
      subscriptions,
      payments,
      gateway,
      new DrizzleWebhookInbox(connection.db),
      silentLogger,
    )
    for (const chargeId of [a, b]) {
      eventIds.push(`sub:${providerId}:charge:${chargeId}:PAID`)
      await handler.handleCycle({ subscriptionId: providerId, chargeId })
    }
    expect((await subscriptions.findById(subscription.id))?.cyclesCompleted).toBe(3)
    await connection.sql`delete from payments.webhook_events where provider='EFI' and provider_event_id=${eventIds[0]!}`
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await handler.handleCycle({ subscriptionId: providerId, chargeId: a })
    const after = await subscriptions.findById(subscription.id)
    expect(after?.cyclesCompleted).toBe(3)
    expect(after?.status).toBe('ACTIVE')
    expect(
      await connection.sql`select id from payments.payments where consumer_id=${consumerId} and status='PAID'`,
    ).toHaveLength(2)
    expect(
      await connection.sql`select id from payments.outbox where payload->>'consumerId'=${consumerId}`,
    ).toHaveLength(0)
  })
  test('duas réplicas confirmam a mesma identidade uma vez, com um único evento do pai', async () => {
    const { subscription, input } = await fixture()
    await connection.sql`delete from payments.outbox where aggregate_id=${subscription.id}`
    const source = input('qa-concurrent-paid')
    await Promise.all([
      subscriptions.recordPaidCycle(source),
      subscriptions.recordPaidCycle(source),
    ])
    expect((await subscriptions.findById(subscription.id))?.cyclesCompleted).toBe(2)
    expect(
      await connection.sql`select * from payments.subscription_paid_cycles where subscription_id=${subscription.id} and provider_payment_id=${source.chargeId}`,
    ).toHaveLength(1)
    expect(
      await connection.sql`select id from payments.outbox where aggregate_id=${subscription.id} and event_name='subscription.charge_paid'`,
    ).toHaveLength(1)
  })
  test('evento de réplica antiga após migração restaura identidade sem recontar', async () => {
    const { subscription, input } = await fixture()
    await subscriptions.recordPaidCycle(input('qa-old-writer-a'))
    await subscriptions.recordPaidCycle(input('qa-current-b'))
    // Simulate an old writer that recorded parent/outbox but not the new component.
    await connection.sql`delete from payments.subscription_paid_cycles where subscription_id=${subscription.id} and provider_payment_id='qa-old-writer-a'`
    await subscriptions.recordPaidCycle(input('qa-old-writer-a'))
    expect((await subscriptions.findById(subscription.id))?.cyclesCompleted).toBe(3)
    expect(
      await connection.sql`select * from payments.subscription_paid_cycles where subscription_id=${subscription.id} and provider_payment_id='qa-old-writer-a'`,
    ).toHaveLength(1)
  })
  test('falha após atualizar pai faz rollback do contador, da identidade e da outbox', async () => {
    const { subscription } = await fixture()
    await connection.sql`delete from payments.outbox where aggregate_id=${subscription.id}`
    const current = await subscriptions.findById(subscription.id)
    if (!current) throw new Error('Missing QA parent')
    const invalid = 'x'.repeat(201)
    current.recordCharge(invalid)
    expect(await failureOf(subscriptions.save(current))).toBeInstanceOf(Error)
    expect((await subscriptions.findById(subscription.id))?.cyclesCompleted).toBe(1)
    expect(
      await connection.sql`select * from payments.subscription_paid_cycles where subscription_id=${subscription.id} and provider_payment_id=${invalid}`,
    ).toHaveLength(0)
    expect(
      await connection.sql`select id from payments.outbox where aggregate_id=${subscription.id}`,
    ).toHaveLength(0)
    expect(current.events).toHaveLength(1)
  })
  test('pagamento tardio não troca cancelamento confirmado por expiração de plano', async () => {
    const { subscription, input } = await fixture(2)
    const current = await subscriptions.findById(subscription.id)
    if (!current) throw new Error('Missing QA parent')
    current.cancel()
    await subscriptions.save(current)
    await subscriptions.recordPaidCycle(input('qa-after-cancellation'))
    const after = await subscriptions.findById(subscription.id)
    expect(after?.cyclesCompleted).toBe(2)
    expect(after?.status).toBe('CANCELED')
    expect(after?.cancellationRecord?.origin).toBe('EXTERNAL')
  })
  test('contrato ou consumidor divergente não altera estado nem escreve identidade', async () => {
    const { subscription, input } = await fixture()
    expect(
      await failureOf(
        subscriptions.recordPaidCycle({ ...input('qa-not-owned'), consumerId: 'qa-other' }),
      ),
    ).toBeInstanceOf(Error)
    expect(
      await failureOf(
        subscriptions.recordPaidCycle({
          ...input('qa-not-owned'),
          providerSubscriptionId: 'qa-other',
        }),
      ),
    ).toBeInstanceOf(Error)
    expect((await subscriptions.findById(subscription.id))?.cyclesCompleted).toBe(1)
  })
  test('backfill canônico preserva contadores/recibos e é idempotente após retenção dos eventos', async () => {
    const { subscription, input } = await fixture()
    const initialId = subscription.toSnapshot().lastChargeId
    if (!initialId) throw new Error('Missing initial QA source')
    for (const chargeId of [initialId, 'qa-history-a', 'qa-history-b']) {
      await payments.save(buildCyclePayment({ subscription, chargeId, status: 'PAID' }))
      if (chargeId !== initialId) await subscriptions.recordPaidCycle(input(chargeId))
    }
    const before = (await subscriptions.findById(subscription.id))?.toSnapshot()
    const paidBefore = (await payments.findByProviderPaymentId('EFI', 'qa-history-a'))?.toSnapshot()
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.subscription_paid_cycles where subscription_id=${subscription.id}`
    const sql = await readFile(
      `${import.meta.dir}/../../src/infrastructure/persistence/drizzle/migrations/0025_subscription_paid_cycle_history.sql`,
      'utf8',
    )
    for (let attempt = 0; attempt < 2; attempt++)
      await connection.sql.begin(async (transaction) => {
        for (const statement of sql.split('--> statement-breakpoint'))
          await transaction.unsafe(statement)
      })
    expect(
      await connection.sql`select provider_payment_id from payments.subscription_paid_cycles where subscription_id=${subscription.id}`,
    ).toHaveLength(3)
    expect((await subscriptions.findById(subscription.id))?.toSnapshot()).toEqual(before)
    expect((await payments.findByProviderPaymentId('EFI', 'qa-history-a'))?.toSnapshot()).toEqual(
      paidBefore,
    )
    await subscriptions.recordPaidCycle(input('qa-history-a'))
    expect((await subscriptions.findById(subscription.id))?.toSnapshot()).toEqual(before)
    expect(
      await connection.sql`select id from payments.outbox where aggregate_id=${subscription.id}`,
    ).toHaveLength(0)
  })
})
