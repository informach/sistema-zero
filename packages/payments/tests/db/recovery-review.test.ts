import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { ListRecoveryReviewService } from '../../src/application/subscription-recovery/list-recovery-review.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { SubscriptionRecoveryCase } from '../../src/domain/subscription-recovery/recovery-case'
import { INITIAL_RECOVERY_POLICY } from '../../src/domain/subscription-recovery/recovery-policy'
import { Customer } from '../../src/domain/value-objects/customer'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleRecoveryReviewRepository } from '../../src/infrastructure/persistence/drizzle/recovery-review.repository'
import { subscriptionRecoveryAdmissions } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { DrizzleSubscriptionRecoveryRepository } from '../../src/infrastructure/persistence/drizzle/subscription-recovery.repository'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_review_test')
const consumerId = `qa-review-${crypto.randomUUID()}`
const now = new Date('2026-10-24T12:00:00Z')
describe.skipIf(!url)('Conferências de regularização — PostgreSQL real', () => {
  let connection: DbConnection
  let service: ListRecoveryReviewService
  let knownId: string
  let unknownId: string
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
    service = new ListRecoveryReviewService(new DrizzleRecoveryReviewRepository(connection.db))
    const subscriptions = new DrizzleSubscriptionRepository(connection.db)
    const payments = new DrizzlePaymentRepository(connection.db)
    for (const known of [true, false]) {
      const subscription = SubscriptionAggregate.create({
        consumerId,
        customer: Customer.create({
          name: known ? 'Titular Kids QA' : 'Titular sem público QA',
          email: known ? 'qa-review-known@example.invalid' : 'qa-review-unknown@example.invalid',
          document: '52998224725',
        }),
        amount: Money.fromCents(9700),
        intervalMonths: 1,
        card: { brand: 'visa', last4: '4242' },
        providerPlanId: 'qa-plan',
        idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
        metadata: known
          ? {
              billingAudienceSource: 'funnel-registry-v1',
              billingAudience: 'kids',
              billingFunnelKey: 'qa-kids',
            }
          : { billingAudience: 'adult' },
      })
      subscription.registerProviderSubscription(`qa-source-${crypto.randomUUID()}`)
      subscription.activate()
      subscription.recordCharge('qa-initial', now)
      await subscriptions.save(subscription)
      const chargeId = `qa-charge-${crypto.randomUUID()}`
      const payment = buildCyclePayment({
        subscription,
        chargeId,
        status: 'FAILED',
        failureReason: 'QA declined',
      })
      await payments.save(payment)
      if (known) {
        knownId = subscription.id
        const item = SubscriptionRecoveryCase.open({
          subscriptionId: subscription.id,
          consumerId,
          providerSubscriptionId: subscription.providerSubscriptionId!,
          paymentId: payment.id,
          providerPaymentId: chargeId,
          audience: 'kids',
          amountInCents: 9700n,
          policy: INITIAL_RECOVERY_POLICY,
          firstFailureAt: now,
          now,
        })
        await new DrizzleSubscriptionRecoveryRepository(connection.db).create(item)
        const operations = new DrizzleSubscriptionOperationRepository(connection.db)
        const operation = createSubscriptionOperation({
          subscriptionId: subscription.id,
          consumerId,
          providerSubscriptionId: subscription.providerSubscriptionId!,
          kind: 'RETRY',
          providerPaymentId: chargeId,
          amountInCents: 9700n,
          retryTerms: {
            period: { startsAt: '2026-10-16T12:00:00.000Z', endsAt: '2026-11-16T12:00:00.000Z' },
            nextExecution: '2026-11-16',
          },
          now,
        })
        await operations.create(operation)
        const executing = await operations.start(operation.id, subscription.id, now)
        if (!executing?.executionId) throw new Error('QA execution absent')
        await operations.finish(
          operation.id,
          executing.executionId,
          'UNKNOWN',
          'PAYMENT_CONFIRMATION_REQUIRED',
          now,
        )
        const loaded = await payments.findById(payment.id)
        if (!loaded) throw new Error('QA payment absent')
        loaded.confirmSubscriptionChargePaid({
          subscriptionId: subscription.id,
          provider: 'EFI',
          providerPaymentId: chargeId,
          amount: Money.fromCents(9700),
          paidAt: now,
        })
        await payments.save(loaded)
      } else {
        unknownId = subscription.id
        await connection.db.insert(subscriptionRecoveryAdmissions).values({
          paymentId: payment.id,
          policy: INITIAL_RECOVERY_POLICY,
          activatedAt: now,
          discoveredAt: now,
          state: 'REVIEW',
          reason: 'AUDIENCE_UNKNOWN',
          attempts: 1,
        })
      }
    }
  })
  afterAll(async () => {
    if (!connection) return
    try {
      await connection.sql`delete from payments.subscription_recovery_admissions where payment_id in (select id from payments.payments where consumer_id=${consumerId})`
      await connection.sql`delete from payments.subscription_recovery_cases where consumer_id=${consumerId}`
      await connection.sql`delete from payments.subscription_operations where consumer_id=${consumerId}`
      await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
      await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
      await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
    } finally {
      await connection.close()
    }
  })

  test('caso, efeito incerto e período pendente são visíveis apesar de dinheiro PAID', async () => {
    const page = await service.execute({ subscriptionId: knownId, limit: 25, offset: 0 })
    expect(page.total).toBe(3)
    expect(page.items.map((item) => item.kind).sort()).toEqual(['CASE', 'OPERATION', 'PERIOD'])
    expect(page.items.every((item) => item.audience === 'kids')).toBe(true)
    expect(page.items.every((item) => item.amountInCents === '9700')).toBe(true)
    expect(page.items.find((item) => item.kind === 'OPERATION')?.state).toBe('UNKNOWN')
    expect(page.items.find((item) => item.kind === 'PERIOD')?.state).toBe('REVIEW_REQUIRED')
    expect(page.items[0]?.customerEmail).toBe('qa-review-known@example.invalid')
    expect(JSON.stringify(page)).not.toContain('52998224725')
    const second = await service.execute({ subscriptionId: knownId, limit: 1, offset: 1 })
    expect(second.total).toBe(3)
    expect(second.items[0]?.id).toBe(page.items[1]?.id)
    expect(
      (await service.execute({ subscriptionId: knownId, kind: 'CASE', limit: 25, offset: 0 }))
        .total,
    ).toBe(1)
    expect(
      (
        await service.execute({
          subscriptionId: knownId,
          q: 'QA-REVIEW-KNOWN@EXAMPLE.INVALID',
          limit: 25,
          offset: 0,
        })
      ).total,
    ).toBe(3)
    expect(
      (await service.execute({ subscriptionId: knownId, q: '%', limit: 25, offset: 0 })).total,
    ).toBe(0)
  })

  test('público não confirmado não é inferido de metadata solta nem omitido', async () => {
    const page = await service.execute({
      subscriptionId: unknownId,
      audience: 'unknown',
      limit: 25,
      offset: 0,
    })
    expect(page.total).toBe(1)
    expect(page.items[0]).toMatchObject({
      kind: 'ADMISSION',
      state: 'REVIEW',
      reason: 'AUDIENCE_UNKNOWN',
      audience: 'unknown',
    })
    expect(
      (
        await service.execute({
          subscriptionId: unknownId,
          audience: 'adult',
          limit: 25,
          offset: 0,
        })
      ).total,
    ).toBe(0)
    expect(
      (await service.execute({ subscriptionId: knownId, audience: 'adult', limit: 25, offset: 0 }))
        .items,
    ).toEqual([])
  })

  test('limites e filtros inválidos são recusados antes de consultar dados', async () => {
    for (const input of [
      { limit: 0, offset: 0 },
      { limit: 25, offset: -1 },
      { limit: 101, offset: 0 },
      { limit: 25, offset: 0, subscriptionId: 'wrong' },
    ])
      expect(() => service.execute(input)).toThrow()
  })
})
