import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { ConfirmSubscriptionPeriodService } from '../../src/application/subscription-recovery/confirm-subscription-period.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { FakePixGateway } from '../fakes/in-memory'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_confirm_period_test')
const consumerId = `qa-confirm-period-${crypto.randomUUID()}`
const now = new Date('2026-10-24T12:00:00Z')
async function failureOf(task: Promise<unknown>) {
  try {
    await task
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!url)('Conferência auditada de período — PostgreSQL real', () => {
  let connection: DbConnection
  let payments: DrizzlePaymentRepository
  let subscriptions: DrizzleSubscriptionRepository
  let gateway: FakePixGateway
  let service: ConfirmSubscriptionPeriodService
  let command: Parameters<ConfirmSubscriptionPeriodService['execute']>[0]
  let providerId: string
  let chargeId: string
  let time: Date
  beforeAll(async () => {
    connection = createDbConnection(url!, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsSchema: 'drizzle',
      migrationsTable: 'payments_migrations',
    })
    payments = new DrizzlePaymentRepository(connection.db)
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  afterEach(async () => {
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
  })
  beforeEach(async () => {
    time = new Date(now)
    providerId = `qa-period-${crypto.randomUUID()}`
    chargeId = `qa-period-charge-${crypto.randomUUID()}`
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      providerPlanId: 'qa-plan',
      card: { brand: 'visa', last4: '4242' },
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
    })
    subscription.registerProviderSubscription(providerId)
    subscription.activate()
    subscription.recordCharge('qa-prior', new Date('2026-09-16T12:00:00Z'))
    await subscriptions.save(subscription)
    const payment = buildCyclePayment({ subscription, chargeId, status: 'FAILED' })
    payment.confirmSubscriptionChargePaid({
      subscriptionId: subscription.id,
      provider: 'EFI',
      providerPaymentId: chargeId,
      amount: Money.fromCents(9700),
      paidAt: new Date('2026-10-24T10:00:00Z'),
    })
    await payments.save(payment)
    command = {
      paymentId: payment.id,
      expectedVersion: 0,
      actorId: 'qa-admin',
      requestId: crypto.randomUUID(),
    }
    gateway = new FakePixGateway()
    gateway.cardStatus = 'PAID'
    gateway.overrideAmountInCents = 9700n
    gateway.subscriptionStatus = 'ACTIVE'
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'PAID', createdAt: new Date('2026-10-16T12:00:00Z') },
    ])
    service = new ConfirmSubscriptionPeriodService(payments, subscriptions, gateway, () => time)
  })

  test('confirma fonte, preserva paidAt, registra ator e não duplica evento financeiro', async () => {
    expect(await service.execute(command)).toMatchObject({
      paymentId: command.paymentId,
      confirmed: true,
      version: 1,
    })
    expect(await service.execute(command)).toMatchObject({ confirmed: true, version: 1 })
    const saved = (await payments.findById(command.paymentId))!.toSnapshot()
    expect(saved.cycleAccess).toMatchObject({
      kind: 'VERIFIED_PERIOD',
      period: { startsAt: '2026-10-16T12:00:00.000Z', endsAt: '2026-11-16T12:00:00.000Z' },
    })
    expect(saved.paidAt?.toISOString()).toBe('2026-10-24T10:00:00.000Z')
    expect(saved.periodConfirmation).toEqual({
      actorId: 'qa-admin',
      requestId: command.requestId,
      providerSubscriptionId: providerId,
      sourceObservedAt: now.toISOString(),
      confirmedAt: now.toISOString(),
      previousReason: 'PERIOD_UNAVAILABLE',
    })
    const events =
      await connection.sql`select event_name from payments.outbox where aggregate_id=${command.paymentId} and event_name in ('payment.paid','payment.subscription_period_confirmed')`
    expect(events.map((event) => event.event_name).sort()).toEqual([
      'payment.paid',
      'payment.subscription_period_confirmed',
    ])
    await connection.sql`delete from payments.outbox where aggregate_id=${command.paymentId}`
    expect((await payments.findById(command.paymentId))?.toSnapshot().periodConfirmation).toEqual(
      saved.periodConfirmation,
    )
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
    expect(gateway.canceledSubscriptionIds).toHaveLength(0)
  })

  test('fonte indisponível, período ausente ou valor divergente não concedem nem auditam sucesso', async () => {
    gateway.failGetCardChargeIds.add(chargeId)
    expect(await failureOf(service.execute(command))).toBeInstanceOf(Error)
    gateway.failGetCardChargeIds.clear()
    gateway.setSubscriptionCharges(providerId, [{ chargeId, status: 'PAID' }])
    expect(await failureOf(service.execute(command))).toBeInstanceOf(Error)
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'PAID', createdAt: new Date('2026-10-16T12:00:00Z') },
    ])
    gateway.overrideAmountInCents = 9800n
    expect(await failureOf(service.execute(command))).toBeInstanceOf(Error)
    const saved = (await payments.findById(command.paymentId))!.toSnapshot()
    expect(saved.cycleAccess?.kind).toBe('REVIEW_REQUIRED')
    expect(saved.periodConfirmation).toBeNull()
  })

  test('versão antiga, ausência de ator e prova vencida não liberam acesso', async () => {
    expect(await failureOf(service.execute({ ...command, expectedVersion: 1 }))).toBeInstanceOf(
      Error,
    )
    expect(gateway.listedSubscriptionIds).toHaveLength(0)
    expect(await failureOf(service.execute({ ...command, actorId: '' }))).toBeInstanceOf(Error)
    const source = gateway.getSubscription.bind(gateway)
    gateway.getSubscription = async (id) => {
      const result = await source(id)
      time = new Date(time.getTime() + 60_001)
      return result
    }
    expect(await failureOf(service.execute(command))).toBeInstanceOf(Error)
    expect((await payments.findById(command.paymentId))?.cycleAccess?.kind).toBe('REVIEW_REQUIRED')
  })

  test('escrita concorrente vence CAS e não deixa confirmação ou evento órfão', async () => {
    const source = gateway.getSubscription.bind(gateway)
    gateway.getSubscription = async (id) => {
      const concurrent = await payments.findById(command.paymentId)
      if (!concurrent) throw new Error('QA missing payment')
      await payments.save(concurrent)
      return source(id)
    }
    expect(await failureOf(service.execute(command))).toBeInstanceOf(Error)
    const saved = (await payments.findById(command.paymentId))!.toSnapshot()
    expect(saved.cycleAccess?.kind).toBe('REVIEW_REQUIRED')
    expect(saved.periodConfirmation).toBeNull()
    const events =
      await connection.sql`select 1 from payments.outbox where aggregate_id=${command.paymentId} and event_name='payment.subscription_period_confirmed'`
    expect(events).toHaveLength(0)
  })
})
