import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { subscriptionOperations } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_subscription_operations_test')

describe.skipIf(!databaseUrl)('Intenções de assinatura no PostgreSQL real', () => {
  let connection: DbConnection
  let repository: DrizzleSubscriptionOperationRepository
  let subscriptionId: string
  const now = new Date('2026-10-23T12:00:00Z')
  const input = () => ({
    subscriptionId,
    consumerId: 'qa-owner',
    providerSubscriptionId: 'provider-qa',
    now,
  })

  beforeAll(async () => {
    connection = createDbConnection(databaseUrl as string, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'payments_migrations',
      migrationsSchema: 'drizzle',
    })
    repository = new DrizzleSubscriptionOperationRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  beforeEach(async () => {
    const subscription = SubscriptionAggregate.create({
      consumerId: 'qa-owner',
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'plan-qa',
      idempotencyKey: IdempotencyKey.create(`qa-${crypto.randomUUID()}`),
    })
    subscription.registerProviderSubscription('provider-qa')
    subscription.activate()
    await new DrizzleSubscriptionRepository(connection.db).save(subscription)
    subscriptionId = subscription.id
  })

  test('duas réplicas só criam uma intenção ativa para a mesma assinatura', async () => {
    const attempts = await Promise.all([
      repository.create(createSubscriptionOperation({ ...input(), kind: 'CARD_UPDATE' })),
      repository.create(
        createSubscriptionOperation({
          ...input(),
          kind: 'RETRY',
          providerPaymentId: 'charge-qa',
          amountInCents: 9700n,
        }),
      ),
    ])
    expect(attempts.sort()).toEqual([false, true])
  })

  test('cancelamento retoma com nova autoridade; executor antigo não conclui o novo trabalho', async () => {
    const subscriptions = new DrizzleSubscriptionRepository(connection.db)
    const subscription = await subscriptions.findById(subscriptionId)
    if (!subscription) throw new Error('Missing QA subscription')
    subscription.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' })
    await subscriptions.save(subscription)
    const operation = createSubscriptionOperation({ ...input(), kind: 'CANCEL' })
    await repository.create(operation)
    const first = await repository.start(operation.id, subscriptionId, now)
    if (!first?.executionId) throw new Error('Missing first executor')
    expect(
      await repository.resumeCancellation(
        operation.id,
        subscriptionId,
        new Date(now.getTime() + 29_999),
        30_000,
      ),
    ).toBeNull()
    await repository.finish(operation.id, first.executionId, 'UNKNOWN', 'PROVIDER_UNKNOWN', now)
    const later = new Date(now.getTime() + 30_000)
    const [left, right] = await Promise.all([
      repository.resumeCancellation(operation.id, subscriptionId, later, 30_000),
      repository.resumeCancellation(operation.id, subscriptionId, later, 30_000),
    ])
    const current = left ?? right
    expect(Number(Boolean(left)) + Number(Boolean(right))).toBe(1)
    expect(current?.executionId).not.toBe(first.executionId)
    expect(current?.executionAttempts).toBe(2)
    let staleError: unknown
    try {
      await repository.finish(operation.id, first.executionId, 'SUCCEEDED', 'STALE_FINISH', later)
    } catch (error) {
      staleError = error
    }
    expect(staleError).toBeInstanceOf(Error)
    if (!current?.executionId) throw new Error('Missing replacement executor')
    await repository.finish(operation.id, current.executionId, 'SUCCEEDED', 'CANCELED', later)
    expect((await repository.findById(operation.id))?.result).toBe('CANCELED')
  })

  test('retomada nunca reexecuta débito/troca e pedido só retira intenções ainda não iniciadas', async () => {
    const operation = createSubscriptionOperation({ ...input(), kind: 'CARD_UPDATE' })
    await repository.create(operation)
    await repository.rejectUnstartedForCancellation(subscriptionId, now)
    expect((await repository.findById(operation.id))?.state).toBe('READY')
    const started = await repository.start(operation.id, subscriptionId, now)
    if (!started?.executionId) throw new Error('Missing QA card execution')
    await repository.finish(operation.id, started.executionId, 'UNKNOWN', 'PROVIDER_UNKNOWN', now)
    const subscriptions = new DrizzleSubscriptionRepository(connection.db)
    const subscription = await subscriptions.findById(subscriptionId)
    if (!subscription) throw new Error('Missing QA subscription')
    subscription.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' })
    await subscriptions.save(subscription)
    await repository.rejectUnstartedForCancellation(subscriptionId, now)
    expect((await repository.findById(operation.id))?.state).toBe('UNKNOWN')
    expect(
      await repository.resumeCancellation(
        operation.id,
        subscriptionId,
        new Date(now.getTime() + 60_000),
        30_000,
      ),
    ).toBeNull()
    expect(
      await repository.create(createSubscriptionOperation({ ...input(), kind: 'CANCEL' })),
    ).toBe(false)
  })

  test('autorização de cancelamento exige pedido durável e identidade real da assinatura', async () => {
    const operation = createSubscriptionOperation({ ...input(), kind: 'CANCEL' })
    await repository.create(operation)
    expect(await repository.start(operation.id, subscriptionId, now)).toBeNull()
    const subscriptions = new DrizzleSubscriptionRepository(connection.db)
    const subscription = await subscriptions.findById(subscriptionId)
    if (!subscription) throw new Error('Missing QA subscription')
    subscription.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' })
    await subscriptions.save(subscription)
    await connection.sql`update payments.subscription_operations set consumer_id='qa-other-owner' where id=${operation.id}`
    expect(await repository.start(operation.id, subscriptionId, now)).toBeNull()
    await connection.sql`update payments.subscription_operations set consumer_id='qa-owner' where id=${operation.id}`
    expect((await repository.start(operation.id, subscriptionId, now))?.executionId).toBeString()
  })

  test('CAS concede uma execução, recusa outra assinatura e não repete após resposta desconhecida', async () => {
    const operation = createSubscriptionOperation({
      ...input(),
      kind: 'RETRY',
      providerPaymentId: 'charge-qa',
      amountInCents: 9700n,
    })
    await repository.create(operation)
    expect(await repository.start(operation.id, crypto.randomUUID(), now)).toBeNull()
    const attempts = await Promise.all([
      repository.start(operation.id, subscriptionId, now),
      repository.start(operation.id, subscriptionId, now),
    ])
    expect(attempts.filter(Boolean)).toHaveLength(1)
    const executor = attempts.find(Boolean)
    if (!executor?.executionId) throw new Error('QA execution authority missing')
    await repository.finish(operation.id, executor.executionId, 'UNKNOWN', 'PROVIDER_UNKNOWN', now)
    expect(await repository.start(operation.id, subscriptionId, now)).toBeNull()
    const later = new Date(now.getTime() + 86_400_000)
    expect(
      await repository.create(
        createSubscriptionOperation({ ...input(), now: later, kind: 'CARD_UPDATE' }),
      ),
    ).toBe(false)
    expect((await repository.findById(operation.id))?.state).toBe('UNKNOWN')
  })

  test('intenção expirada não executa; só READY sem efeito externo pode ser substituída', async () => {
    const first = createSubscriptionOperation({ ...input(), kind: 'CARD_UPDATE' })
    await repository.create(first)
    expect(await repository.start(first.id, subscriptionId, first.expiresAt)).toBeNull()
    const next = createSubscriptionOperation({ ...input(), now: first.expiresAt, kind: 'CANCEL' })
    expect(await repository.create(next)).toBe(true)
    expect((await repository.findById(first.id))?.result).toBe('INTENT_EXPIRED')
  })

  test('pedido de cancelamento persistido invalida autorização de cartão já aberta', async () => {
    const operation = createSubscriptionOperation({ ...input(), kind: 'CARD_UPDATE' })
    await repository.create(operation)
    const subscriptions = new DrizzleSubscriptionRepository(connection.db)
    const subscription = await subscriptions.findById(subscriptionId)
    if (!subscription) throw new Error('Assinatura QA ausente')
    subscription.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' })
    await subscriptions.save(subscription)
    expect(await repository.start(operation.id, subscriptionId, now)).toBeNull()
    expect((await subscriptions.findById(subscriptionId))?.cancelRequestedAt).toBeInstanceOf(Date)
  })

  test('banco recusa retry sem valor mesmo se um writer contornar o domínio', async () => {
    const invalid = createSubscriptionOperation({
      ...input(),
      kind: 'RETRY',
      providerPaymentId: 'charge-qa',
      amountInCents: 9700n,
    })
    let failure: unknown
    try {
      await connection.db.insert(subscriptionOperations).values({ ...invalid, amountInCents: null })
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    expect(await repository.findById(invalid.id)).toBeNull()
  })

  test('lease de cancelamento é durável e não depende do cursor da reconciliação geral', async () => {
    const subscriptions = new DrizzleSubscriptionRepository(connection.db)
    const subscription = await subscriptions.findById(subscriptionId)
    if (!subscription) throw new Error('Assinatura QA ausente')
    subscription.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' })
    await subscriptions.save(subscription)
    await connection.sql`update payments.subscriptions set last_reconciled_at=now() where id=${subscriptionId}`
    const attempts = await Promise.all([
      subscriptions.claimCancellationRequests(100, 90_000),
      new DrizzleSubscriptionRepository(connection.db).claimCancellationRequests(100, 90_000),
    ])
    expect(attempts.flat().filter((item) => item.id === subscriptionId)).toHaveLength(1)
    const restarted = new DrizzleSubscriptionRepository(connection.db)
    expect(
      (await restarted.claimCancellationRequests(100, 90_000)).some(
        (item) => item.id === subscriptionId,
      ),
    ).toBe(false)
  })
})
