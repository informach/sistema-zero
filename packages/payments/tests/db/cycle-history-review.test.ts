import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import type { CycleHistoryReview } from '../../src/domain/subscription/cycle-history-review'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  type CycleHistoryCandidate,
  DrizzleCycleHistoryReviewRepository,
} from '../../src/infrastructure/persistence/drizzle/cycle-history-review.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_cycle_review_test')
const consumerId = `qa-cycle-review-${crypto.randomUUID()}`
async function failureOf(work: Promise<unknown>) {
  try {
    await work
    return null
  } catch (error) {
    return error
  }
}
describe.skipIf(!url)('Revisão técnica do contador legado — PostgreSQL real', () => {
  let connection: DbConnection
  let repository: DrizzleCycleHistoryReviewRepository
  let subscriptions: DrizzleSubscriptionRepository
  let payments: DrizzlePaymentRepository
  let item: CycleHistoryCandidate
  let now: Date
  const ids = ['qa-cycle-1', 'qa-cycle-2', 'qa-cycle-3', 'qa-cycle-4']
  const proof = (): CycleHistoryReview => ({
    version: 1,
    actorId: 'system:legacy-cycle-history-v1',
    requestId: crypto.randomUUID(),
    providerSubscriptionId: item.providerSubscriptionId,
    subscriptionVersion: item.version,
    before: 6,
    after: 4,
    providerPaymentIds: [...ids],
    sourceObservedAt: now.toISOString(),
    reviewedAt: now.toISOString(),
  })
  beforeAll(async () => {
    if (!url) throw new Error('Missing QA database')
    connection = createDbConnection(url, { max: 4 })
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
    await connection.sql`delete from payments.subscription_operations where consumer_id=${consumerId}`
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
  })
  beforeEach(async () => {
    now = new Date()
    repository = new DrizzleCycleHistoryReviewRepository(connection.db, () => now)
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
    })
    subscription.registerProviderSubscription(`qa-sub-${crypto.randomUUID()}`)
    subscription.activate()
    await subscriptions.save(subscription)
    for (const chargeId of ids) {
      await payments.save(buildCyclePayment({ subscription, chargeId, status: 'PAID' }))
      await subscriptions.recordPaidCycle({
        subscriptionId: subscription.id,
        consumerId,
        provider: 'EFI',
        providerSubscriptionId: subscription.providerSubscriptionId!,
        chargeId,
      })
    }
    await connection.sql`update payments.subscriptions set cycles_completed=6 where id=${subscription.id}`
    const candidate = (await repository.candidates(subscription.id)).find(
      (row) => row.id === subscription.id,
    )
    if (!candidate) throw new Error('Missing eligible QA review')
    item = candidate
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    now = new Date()
  })
  test('corrige só contador com prova/auditoria, preserva recibos e não seleciona outra vez', async () => {
    const before = (await subscriptions.findById(item.id))!.toSnapshot()
    const receipts =
      await connection.sql`select id,status,paid_at,cycle_access,amount_in_cents from payments.payments where consumer_id=${consumerId} order by id`
    const audit = proof()
    await repository.apply(item, audit)
    const after = (await subscriptions.findById(item.id))!.toSnapshot()
    expect(after).toMatchObject({
      ...before,
      cyclesCompleted: 4,
      version: before.version + 1,
      updatedAt: now,
    })
    expect(
      await connection.sql`select id,status,paid_at,cycle_access,amount_in_cents from payments.payments where consumer_id=${consumerId} order by id`,
    ).toEqual(receipts)
    const [row] =
      await connection.sql`select cycle_history_review from payments.subscriptions where id=${item.id}`
    expect(row?.cycle_history_review).toEqual(audit)
    expect((await repository.candidates()).some((row) => row.id === item.id)).toBe(false)
    const fresh = (await subscriptions.findById(item.id))!
    fresh.updateCard({ brand: 'visa', last4: '1111' })
    await subscriptions.save(fresh)
    const [persisted] =
      await connection.sql`select cycle_history_review from payments.subscriptions where id=${item.id}`
    expect(persisted?.cycle_history_review).toEqual(audit)
    expect((await subscriptions.findById(item.id))?.status).toBe('ACTIVE')
    expect(await failureOf(repository.apply(item, proof()))).toBeInstanceOf(Error)
  })
  test.each([
    'version',
    'finite',
    'identities',
    'pending',
    'unidentified-receipt',
  ] as const)('recusa %s alterado sem normalizar dinheiro ou estado', async (kind) => {
    if (kind === 'version')
      await connection.sql`update payments.subscriptions set version=version+1 where id=${item.id}`
    if (kind === 'finite')
      await connection.sql`update payments.subscriptions set repeats=12 where id=${item.id}`
    if (kind === 'identities')
      await connection.sql`delete from payments.subscription_paid_cycles where subscription_id=${item.id} and provider_payment_id='qa-cycle-1'`
    if (kind === 'pending')
      await new DrizzleSubscriptionOperationRepository(connection.db).create(
        createSubscriptionOperation({
          subscriptionId: item.id,
          consumerId,
          providerSubscriptionId: item.providerSubscriptionId,
          kind: 'CARD_UPDATE',
          now,
        }),
      )
    if (kind === 'unidentified-receipt') {
      await connection.sql`update payments.payments set provider_payment_id=null where subscription_id=${item.id} and provider_payment_id='qa-cycle-1'`
      expect(await repository.localIdentities(item)).toBeNull()
    }
    expect(await failureOf(repository.apply(item, proof()))).toBeInstanceOf(Error)
    const [row] =
      await connection.sql`select cycles_completed,cycle_history_review,status from payments.subscriptions where id=${item.id}`
    expect(row).toMatchObject({ cycles_completed: 6, cycle_history_review: null, status: 'ACTIVE' })
  })
  test.each([
    'before-write',
    'after-write',
  ] as const)('prova vencida %s não deixa correção nem auditoria parcial', async (phase) => {
    const audit = proof()
    let reads = 0
    const delayed = new DrizzleCycleHistoryReviewRepository(
      connection.db,
      () => new Date(now.getTime() + (++reads > (phase === 'before-write' ? 0 : 1) ? 60_001 : 0)),
    )
    expect(await failureOf(delayed.apply(item, audit))).toBeInstanceOf(Error)
    const [row] =
      await connection.sql`select cycles_completed,cycle_history_review from payments.subscriptions where id=${item.id}`
    expect(row).toEqual({ cycles_completed: 6, cycle_history_review: null })
    expect(
      await connection.sql`select id from payments.outbox where aggregate_id=${item.id}`,
    ).toHaveLength(0)
  })
})
