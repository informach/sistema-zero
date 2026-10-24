import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { RetrySubscriptionChargeService } from '../../src/application/subscription-card/retry-subscription-charge.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { Customer } from '../../src/domain/value-objects/customer'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionMyReadRepository } from '../../src/infrastructure/persistence/drizzle/subscription-my-read.repository'
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { DrizzleWebhookInbox } from '../../src/infrastructure/persistence/drizzle/webhook-inbox.repository'
import { FakePixGateway, silentLogger } from '../fakes/in-memory'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_retry_test')
const email = 'qa-retry@example.invalid'
const consumerId = `qa-retry-${crypto.randomUUID()}`
const input = {
  paymentToken: 'qa-ephemeral-token',
  card: { brand: 'visa', last4: '1234' },
  consent: true as const,
}
async function failureOf(task: Promise<unknown>) {
  try {
    await task
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!url)('Pagamento explícito do ciclo — PostgreSQL real', () => {
  let connection: DbConnection
  let subscriptions: DrizzleSubscriptionRepository
  let payments: DrizzlePaymentRepository
  let operations: DrizzleSubscriptionOperationRepository
  let gateway: FakePixGateway
  let service: RetrySubscriptionChargeService
  let id: string
  let paymentId: string
  let providerId: string
  let chargeId: string
  let now: Date
  const started = new Date('2026-10-16T12:00:00Z')

  beforeAll(async () => {
    connection = createDbConnection(url!, { max: 5 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsSchema: 'drizzle',
      migrationsTable: 'payments_migrations',
    })
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
    payments = new DrizzlePaymentRepository(connection.db)
    operations = new DrizzleSubscriptionOperationRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  afterEach(async () => {
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.subscription_cancellation_audit where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscription_operations where consumer_id=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
  })
  beforeEach(async () => {
    now = new Date('2026-10-24T12:00:00Z')
    providerId = `qa-retry-sub-${crypto.randomUUID()}`
    chargeId = `qa-retry-charge-${crypto.randomUUID()}`
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      providerPlanId: 'qa-plan',
      card: { brand: 'visa', last4: '4242' },
      customer: Customer.create({
        name: 'Titular QA',
        email,
        document: '52998224725',
        phone: '11999999999',
      }),
      idempotencyKey: IdempotencyKey.create(`qa-retry-${crypto.randomUUID()}`),
    })
    subscription.registerProviderSubscription(providerId)
    subscription.activate()
    subscription.recordCharge(`prior-${chargeId}`, new Date('2026-09-16T12:00:00Z'))
    await subscriptions.save(subscription)
    id = subscription.id
    const payment = buildCyclePayment({
      subscription,
      chargeId,
      status: 'FAILED',
      failureReason: 'Recusa QA',
    })
    await payments.save(payment)
    paymentId = payment.id
    gateway = new FakePixGateway()
    gateway.subscriptionStatus = 'ACTIVE'
    gateway.cardStatus = 'FAILED'
    gateway.overrideAmountInCents = 9700n
    gateway.subscriptionNextExecution = '2026-11-16'
    gateway.setSubscriptionCharges(providerId, [{ chargeId, status: 'FAILED', createdAt: started }])
    const retry = gateway.retrySubscriptionCharge.bind(gateway)
    gateway.retrySubscriptionCharge = async (request) => {
      await retry(request)
      gateway.cardStatus = 'PAID'
      gateway.setSubscriptionCharges(providerId, [{ chargeId, status: 'PAID', createdAt: started }])
    }
    service = new RetrySubscriptionChargeService(
      new DrizzleSubscriptionMyReadRepository(connection.db),
      subscriptions,
      payments,
      operations,
      gateway,
      new HandleSubscriptionNotificationService(
        subscriptions,
        payments,
        gateway,
        new DrizzleWebhookInbox(connection.db),
        silentLogger,
        () => now,
      ),
      () => now,
    )
  })

  test('congela termos, paga uma vez e confirma dinheiro na fonte antes de sucesso', async () => {
    const intent = await service.createIntent(email, id, paymentId)
    expect(intent).toMatchObject({
      chargesNow: true,
      amountInCents: '9700',
      currency: 'BRL',
      terms: {
        period: { startsAt: started.toISOString(), endsAt: '2026-11-16T12:00:00.000Z' },
        nextExecution: '2026-11-16',
      },
    })
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
    const result = await service.execute(email, id, intent.id, input)
    expect(result).toMatchObject({ state: 'SUCCEEDED', result: 'CHARGE_PAID' })
    expect((await payments.findById(paymentId))?.cycleAccess?.kind).toBe('VERIFIED_PERIOD')
    expect((await subscriptions.findById(id))?.card).toEqual(input.card)
    expect((await service.execute(email, id, intent.id, input)).state).toBe('SUCCEEDED')
    expect(gateway.retriedSubscriptionChargeIds).toEqual([chargeId])
    const [stored] =
      await connection.sql`select row_to_json(o)::text as data from payments.subscription_operations o where id=${intent.id}`
    expect(String(stored?.data)).not.toContain(input.paymentToken)
    const events =
      await connection.sql`select 1 from payments.outbox where aggregate_id=${paymentId} and event_name='payment.paid'`
    expect(events).toHaveLength(1)
  })

  test('duas abas compartilham autoridade e não duplicam o POST', async () => {
    const intent = await service.createIntent(email, id, paymentId)
    const results = await Promise.allSettled([
      service.execute(email, id, intent.id, input),
      service.execute(email, id, intent.id, input),
    ])
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true)
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(1)
  })

  test('resposta perdida fica UNKNOWN; reentrega não reutiliza token nem cobra', async () => {
    const retry = gateway.retrySubscriptionCharge.bind(gateway)
    gateway.retrySubscriptionCharge = async (request) => {
      await retry(request)
      throw new Error(input.paymentToken)
    }
    const intent = await service.createIntent(email, id, paymentId)
    expect((await service.execute(email, id, intent.id, input)).state).toBe('UNKNOWN')
    expect((await service.execute(email, id, intent.id, input)).state).toBe('UNKNOWN')
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(1)
    expect(await failureOf(service.createIntent(email, id, paymentId))).toBeInstanceOf(Error)
    expect(JSON.stringify(await service.getIntent(email, id, intent.id))).not.toContain(
      input.paymentToken,
    )
  })

  test('POST aceito sem prova de liquidação permanece em conferência', async () => {
    gateway.retrySubscriptionCharge = async (request) => {
      gateway.retriedSubscriptionChargeIds.push(request.providerPaymentId)
    }
    const intent = await service.createIntent(email, id, paymentId)
    expect((await service.execute(email, id, intent.id, input)).state).toBe('UNKNOWN')
    expect((await payments.findById(paymentId))?.status).toBe('FAILED')
  })

  test('nega comprador alheio e consentimento ausente antes de efeitos', async () => {
    expect(
      await failureOf(service.createIntent('other@example.invalid', id, paymentId)),
    ).toBeInstanceOf(Error)
    const intent = await service.createIntent(email, id, paymentId)
    expect(
      await failureOf(service.execute('other@example.invalid', id, intent.id, input)),
    ).toBeInstanceOf(Error)
    expect(
      await failureOf(
        service.execute(email, id, intent.id, { ...input, consent: false as unknown as true }),
      ),
    ).toBeInstanceOf(Error)
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
  })

  test('mudança de próxima cobrança exige novo consentimento sem POST', async () => {
    const intent = await service.createIntent(email, id, paymentId)
    gateway.subscriptionNextExecution = '2026-11-17'
    expect((await service.execute(email, id, intent.id, input)).state).toBe('REJECTED')
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
  })

  test('cobrança posterior ou sem data impede cobrar histórico', async () => {
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'FAILED', createdAt: started },
      { chargeId: 'qa-later', status: 'PENDING' },
    ])
    expect(await failureOf(service.createIntent(email, id, paymentId))).toBeInstanceOf(Error)
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
  })

  test('período encerrado não compra um mês novo; vencimento da intenção não cobra', async () => {
    const intent = await service.createIntent(email, id, paymentId)
    now = new Date(now.getTime() + 10 * 60_000)
    expect(await failureOf(service.execute(email, id, intent.id, input))).toBeInstanceOf(Error)
    now = new Date('2026-11-17T12:00:00Z')
    expect(await failureOf(service.createIntent(email, id, paymentId))).toBeInstanceOf(Error)
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
  })

  test('pedido de cancelamento entre formulário e confirmação impede débito', async () => {
    const intent = await service.createIntent(email, id, paymentId)
    const subscription = await subscriptions.findById(id)
    if (!subscription) throw new Error('QA missing subscription')
    subscription.requestCancellation({ origin: 'CUSTOMER', actorId: 'qa-owner' })
    await subscriptions.save(subscription)
    expect(await failureOf(service.execute(email, id, intent.id, input))).toBeInstanceOf(Error)
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
  })
})
