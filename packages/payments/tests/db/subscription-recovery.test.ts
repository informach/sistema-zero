import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { SubscriptionRecoveryCase } from '../../src/domain/subscription-recovery/recovery-case'
import {
  DAY_MS,
  INITIAL_RECOVERY_POLICY,
} from '../../src/domain/subscription-recovery/recovery-policy'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { subscriptionRecoveryCases } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionRecoveryRepository } from '../../src/infrastructure/persistence/drizzle/subscription-recovery.repository'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_recovery_cases_test')
const consumerId = `qa-recovery-${crypto.randomUUID()}`
const now = new Date('2026-10-24T12:00:00Z')
async function failureOf(task: Promise<unknown>): Promise<unknown> {
  try {
    await task
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!databaseUrl)('Casos de regularização — PostgreSQL real', () => {
  let connection: DbConnection
  let repository: DrizzleSubscriptionRecoveryRepository
  let source: Parameters<typeof SubscriptionRecoveryCase.open>[0]
  beforeAll(async () => {
    connection = createDbConnection(databaseUrl!, { max: 5 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsSchema: 'drizzle',
      migrationsTable: 'payments_migrations',
    })
    repository = new DrizzleSubscriptionRecoveryRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  afterEach(async () => {
    await connection.db
      .delete(subscriptionRecoveryCases)
      .where(eq(subscriptionRecoveryCases.consumerId, consumerId))
  })
  beforeEach(async () => {
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
    })
    subscription.registerProviderSubscription(`qa-provider-${crypto.randomUUID()}`)
    subscription.activate()
    subscription.recordCharge('qa-initial-paid', new Date(now.getTime() - 30 * DAY_MS))
    await new DrizzleSubscriptionRepository(connection.db).save(subscription)
    const payment = buildCyclePayment({
      subscription,
      chargeId: `qa-charge-${crypto.randomUUID()}`,
      status: 'FAILED',
    })
    await new DrizzlePaymentRepository(connection.db).save(payment)
    source = {
      subscriptionId: subscription.id,
      consumerId,
      providerSubscriptionId: subscription.providerSubscriptionId!,
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId!,
      audience: 'kids',
      amountInCents: 9700n,
      policy: INITIAL_RECOVERY_POLICY,
      firstFailureAt: now,
      now,
    }
  })

  test('duas réplicas abrem só um caso e reentrega não reinicia sua identidade', async () => {
    const candidates = [
      SubscriptionRecoveryCase.open(source),
      SubscriptionRecoveryCase.open(source),
    ]
    const results = await Promise.all(candidates.map((item) => repository.create(item)))
    expect(results.sort()).toEqual([false, true])
    const current = await repository.findActiveForSubscription(source.subscriptionId)
    expect(current).not.toBeNull()
    expect(candidates.some((item) => item.id === current?.id)).toBe(true)
    expect(current?.toSnapshot().deadlineAt).toBeNull()
  })

  test('primeira compra recusada e consumidor trocado não entram na recuperação', async () => {
    expect(
      await failureOf(
        repository.create(SubscriptionRecoveryCase.open({ ...source, consumerId: 'another-qa' })),
      ),
    ).toBeInstanceOf(Error)
    await connection.sql`update payments.subscriptions set cycles_completed=0 where id=${source.subscriptionId}`
    expect(
      await failureOf(repository.create(SubscriptionRecoveryCase.open(source))),
    ).toBeInstanceOf(Error)
    expect(await repository.findActiveForSubscription(source.subscriptionId)).toBeNull()
  })

  test('lease exclusivo entre réplicas, fencing após expirar e agenda sobrevivem reabertura', async () => {
    const item = SubscriptionRecoveryCase.open(source)
    await repository.create(item)
    const [left, right] = await Promise.all([
      repository.claimDue({ now, leaseMs: 10_000, limit: 1 }),
      repository.claimDue({ now, leaseMs: 10_000, limit: 1 }),
    ])
    expect(left.length + right.length).toBe(1)
    const old = [...left, ...right][0]!
    expect(old.item.toSnapshot()).not.toHaveProperty('leaseId')
    expect(old.item.toSnapshot()).not.toHaveProperty('leaseUntil')
    const later = new Date(now.getTime() + 10_000)
    const [replacement] = await repository.claimDue({ now: later, leaseMs: 10_000, limit: 1 })
    expect(replacement?.leaseId).not.toBe(old.leaseId)
    old.item.acceptInitialNotice('stale-notice-qa', now, now)
    expect(await failureOf(repository.saveOwned(old, later))).toBeInstanceOf(Error)
    replacement!.item.acceptInitialNotice('notice-qa', later, later)
    await repository.saveOwned(replacement!, later)
    const reloaded = await new DrizzleSubscriptionRecoveryRepository(connection.db).findById(
      item.id,
    )
    expect(reloaded?.toSnapshot().deadlineAt).toEqual(new Date(later.getTime() + 7 * DAY_MS))
    expect(await repository.claimDue({ now: later, leaseMs: 10_000, limit: 1 })).toHaveLength(0)
  })

  test('CAS e outbox são uma transação; writer obsoleto não duplica evento', async () => {
    const item = SubscriptionRecoveryCase.open(source)
    await repository.create(item)
    const [lease] = await repository.claimDue({ now, leaseMs: 10_000, limit: 1 })
    lease!.item.contactFailed(now)
    await repository.saveOwned(lease!, now)
    const before =
      await connection.sql`select count(*)::int as count from payments.outbox where aggregate_id=${item.id} and event_name='subscription.recovery.changed'`
    expect(before[0]?.count).toBe(1)
    expect(await failureOf(repository.saveOwned(lease!, now))).toBeInstanceOf(Error)
    const after =
      await connection.sql`select count(*)::int as count from payments.outbox where aggregate_id=${item.id} and event_name='subscription.recovery.changed'`
    expect(after[0]?.count).toBe(1)
    expect((await repository.findById(item.id))?.state).toBe('MANUAL_REVIEW')
  })

  test('constraint do banco recusa prazo sem aceite e conserva o caso original', async () => {
    const item = SubscriptionRecoveryCase.open(source)
    await repository.create(item)
    const error = await failureOf(
      (async () => {
        await connection.sql`update payments.subscription_recovery_cases set deadline_at=${new Date(now.getTime() + DAY_MS)} where id=${item.id}`
      })(),
    )
    expect(error).toBeInstanceOf(Error)
    expect((await repository.findById(item.id))?.toSnapshot().deadlineAt).toBeNull()
  })

  test('política JSON nula e caso ativo sem agenda são recusados pelo banco', async () => {
    const item = SubscriptionRecoveryCase.open(source)
    await repository.create(item)
    for (const column of ['version', 'windowDays']) {
      const invalidPolicy = { ...INITIAL_RECOVERY_POLICY, [column]: null }
      expect(
        await failureOf(
          (async () => {
            await connection.sql`update payments.subscription_recovery_cases set policy=${connection.sql.json(invalidPolicy)} where id=${item.id}`
          })(),
        ),
      ).toBeInstanceOf(Error)
    }
    expect(
      await failureOf(
        (async () => {
          await connection.sql`update payments.subscription_recovery_cases set next_action_at=null where id=${item.id}`
        })(),
      ),
    ).toBeInstanceOf(Error)
    expect((await repository.findById(item.id))?.toSnapshot().nextActionAt).toEqual(now)
  })
})
