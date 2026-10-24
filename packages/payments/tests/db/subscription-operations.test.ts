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
    await repository.finish(operation.id, 'UNKNOWN', 'PROVIDER_UNKNOWN', now)
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
})
