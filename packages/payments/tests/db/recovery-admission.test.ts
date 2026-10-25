import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { RecoveryAdmissionService } from '../../src/application/subscription-recovery/recovery-admission.service'
import { RecoverySourceService } from '../../src/application/subscription-recovery/recovery-source.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import type { RecoveryAdmissionLease } from '../../src/domain/subscription-recovery/recovery-admission.port'
import { SubscriptionRecoveryCase } from '../../src/domain/subscription-recovery/recovery-case'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleRecoveryAdmissionRepository } from '../../src/infrastructure/persistence/drizzle/recovery-admission.repository'
import { DrizzleRecoveryPolicyRepository } from '../../src/infrastructure/persistence/drizzle/recovery-policy.repository'
import { DrizzleReviewedAdmissionRepository } from '../../src/infrastructure/persistence/drizzle/reviewed-admission.repository'
import {
  subscriptionRecoveryAdmissions as admissions,
  subscriptionRecoveryCases as cases,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionRecoveryRepository } from '../../src/infrastructure/persistence/drizzle/subscription-recovery.repository'
import { RecoveryAdmissionWorker } from '../../src/infrastructure/workers/recovery-admission-worker'
import { FakePixGateway, silentLogger } from '../fakes/in-memory'
import { InMemorySubscriptionOperationRepository } from '../fakes/subscription-operation-repository'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_recovery_admission_test')
const consumerId = `qa-admission-${crypto.randomUUID()}`
async function failureOf(task: Promise<unknown>) {
  try {
    await task
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!databaseUrl)('Entrada de regularização — PostgreSQL real', () => {
  let connection: DbConnection
  let repository: DrizzleRecoveryAdmissionRepository
  let policies: DrizzleRecoveryPolicyRepository
  let subscriptions: DrizzleSubscriptionRepository
  let payments: DrizzlePaymentRepository
  let recoveries: DrizzleSubscriptionRecoveryRepository
  let now: Date
  let activatedAt: Date
  let gateway: FakePixGateway

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
    repository = new DrizzleRecoveryAdmissionRepository(connection.db)
    policies = new DrizzleRecoveryPolicyRepository(connection.db)
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
    payments = new DrizzlePaymentRepository(connection.db)
    recoveries = new DrizzleSubscriptionRecoveryRepository(connection.db)
  })
  beforeEach(async () => {
    // The clock is advanced only in this owned QA database. This isolates the
    // activation window from other test files' intentionally retained fixtures.
    now = new Date(Date.now() + 86_400_000)
    activatedAt = new Date(now.getTime() - 60_000)
    await connection.sql`delete from payments.subscription_recovery_policy_audit`
    await connection.sql`delete from payments.subscription_recovery_policy`
    const initial = await policies.initialize(activatedAt)
    await policies.update({
      expectedVersion: initial.policy.version,
      enabled: true,
      windowDays: 7,
      reminderDays: [3, 6],
      actorId: 'qa-admin',
      now: activatedAt,
    })
    gateway = new FakePixGateway()
  })
  afterEach(async () => {
    await connection.sql`delete from payments.subscription_recovery_admissions where payment_id in (select id from payments.payments where consumer_id=${consumerId})`
    await connection.db.delete(cases).where(eq(cases.consumerId, consumerId))
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.subscription_recovery_policy_audit`
    await connection.sql`delete from payments.subscription_recovery_policy`
  })
  afterAll(async () => connection?.close())

  async function fixture(audience: 'kids' | 'adult' | null = 'kids', paid = true) {
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
      metadata: audience
        ? {
            billingAudience: audience,
            billingAudienceSource: 'funnel-registry-v1',
            billingFunnelKey: 'qa-registered-origin',
          }
        : {},
    })
    const providerId = `qa-sub-${crypto.randomUUID()}`
    subscription.registerProviderSubscription(providerId)
    subscription.activate()
    if (paid)
      subscription.recordCharge('qa-prior-paid', new Date(activatedAt.getTime() - 86_400_000))
    await subscriptions.save(subscription)
    const chargeId = `qa-charge-${crypto.randomUUID()}`
    const payment = buildCyclePayment({ subscription, chargeId, status: 'FAILED' })
    await payments.save(payment)
    await connection.sql`update payments.payments set updated_at=${new Date(now.getTime() - 1_000).toISOString()}::timestamptz where id=${payment.id}`
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'FAILED', createdAt: new Date(activatedAt.getTime() + 1_000) },
    ])
    gateway.getCardCharge = async () => ({
      providerPaymentId: chargeId,
      status: 'FAILED',
      amountInCents: 9700n,
    })
    return { subscription, payment, providerId, chargeId }
  }
  async function claim(): Promise<RecoveryAdmissionLease> {
    await repository.discover({ now, limit: 10 })
    const [lease] = await repository.claim({ now, leaseMs: 180_000, limit: 1 })
    if (!lease) throw new Error('QA admission not claimed')
    return lease
  }
  function processor() {
    return new RecoveryAdmissionService(
      repository,
      recoveries,
      subscriptions,
      payments,
      new RecoverySourceService(
        subscriptions,
        payments,
        new InMemorySubscriptionOperationRepository(),
        gateway,
        () => now,
      ),
      new DrizzleReviewedAdmissionRepository(connection.db, () => now),
      () => now,
    )
  }
  async function row(paymentId: string) {
    return (
      await connection.db.select().from(admissions).where(eq(admissions.paymentId, paymentId))
    )[0]
  }

  test('duas réplicas descobrem uma única entrada e só um executor detém a lease', async () => {
    const { payment } = await fixture()
    const discovered = await Promise.all([
      repository.discover({ now, limit: 10 }),
      repository.discover({ now, limit: 10 }),
    ])
    expect(discovered.reduce((sum, count) => sum + count, 0)).toBe(1)
    const results = await Promise.all([
      repository.claim({ now, leaseMs: 180_000, limit: 1 }),
      repository.claim({ now, leaseMs: 180_000, limit: 1 }),
    ])
    expect(results.flat()).toHaveLength(1)
    expect((await row(payment.id))?.attempts).toBe(1)
  })

  test('política desligada impede descoberta e novas reivindicações, sem inventar defaults', async () => {
    await fixture()
    await repository.discover({ now, limit: 10 })
    const current = await policies.get()
    if (!current) throw new Error('Missing QA policy')
    await policies.update({
      expectedVersion: current.policy.version,
      enabled: false,
      windowDays: 7,
      reminderDays: [3, 6],
      actorId: 'qa-admin',
      now,
    })
    expect(await repository.discover({ now, limit: 10 })).toBe(0)
    expect(await repository.claim({ now, leaseMs: 180_000, limit: 1 })).toHaveLength(0)
  })

  test.each([
    'kids',
    'adult',
  ] as const)('%s entra com política congelada sem aviso, débito ou cancelamento', async (audience) => {
    const { payment, subscription } = await fixture(audience)
    const lease = await claim()
    await processor().process(lease)
    const persisted = await row(payment.id)
    expect(persisted?.state).toBe('ADMITTED')
    const item = persisted?.caseId ? await recoveries.findById(persisted.caseId) : null
    expect(item?.toSnapshot()).toMatchObject({
      audience,
      state: 'OPEN',
      initialNoticeId: null,
      deadlineAt: null,
      policy: lease.policy,
    })
    expect((await subscriptions.findById(subscription.id))?.cancelRequestedAt).toBeNull()
    expect(gateway.canceledSubscriptionIds).toHaveLength(0)
  })

  test('público desconhecido vai para revisão sem adivinhar pelo nome do produto', async () => {
    const { payment } = await fixture(null)
    await processor().process(await claim())
    expect(await row(payment.id)).toMatchObject({
      state: 'REVIEW',
      reason: 'AUDIENCE_UNKNOWN',
      caseId: null,
    })
  })

  test.each([
    'legacy',
    'missing',
  ] as const)('data %s no provedor exige revisão e não inicia prazo retroativo', async (kind) => {
    const { payment, providerId, chargeId } = await fixture()
    gateway.setSubscriptionCharges(providerId, [
      {
        chargeId,
        status: 'FAILED',
        createdAt: kind === 'legacy' ? new Date(activatedAt.getTime() - 1) : undefined,
      },
    ])
    await processor().process(await claim())
    expect(await row(payment.id)).toMatchObject({
      state: 'REVIEW',
      reason: kind === 'legacy' ? 'LEGACY_RENEWAL' : 'SOURCE_DATE_UNKNOWN',
      caseId: null,
    })
  })

  test('primeira compra nunca paga não entra como renovação', async () => {
    await fixture('kids', false)
    expect(await repository.discover({ now, limit: 10 })).toBe(0)
  })

  test('pagamento posterior na assinatura impede abrir recuperação da parcela antiga', async () => {
    const { payment, providerId, chargeId } = await fixture()
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'FAILED', createdAt: new Date(activatedAt.getTime() + 1_000) },
      {
        chargeId: 'qa-later-paid',
        status: 'PAID',
        createdAt: new Date(activatedAt.getTime() + 2_000),
      },
    ])
    await processor().process(await claim())
    expect(await row(payment.id)).toMatchObject({
      state: 'REVIEW',
      reason: 'PROVIDER_DIVERGENCE',
      caseId: null,
    })
  })

  test('worker não sobrepõe tick e stop aguarda a gravação do caso em andamento', async () => {
    const { payment } = await fixture()
    let release = () => {}
    let entered = () => {}
    const ready = new Promise<void>((resolve) => {
      entered = resolve
    })
    const barrier = new Promise<void>((resolve) => {
      release = resolve
    })
    const actual = processor()
    const worker = new RecoveryAdmissionWorker(
      repository,
      {
        process: async (lease) => {
          entered()
          await barrier
          await actual.process(lease)
        },
      },
      silentLogger,
      { intervalMs: 30_000, batchSize: 4, leaseMs: 180_000 },
      () => now,
    )
    const first = worker.tick()
    expect(worker.tick()).toBe(first)
    await ready
    let stopped = false
    const stop = worker.stop().then(() => {
      stopped = true
    })
    await Promise.resolve()
    expect(stopped).toBe(false)
    release()
    await stop
    expect(stopped).toBe(true)
    expect(await row(payment.id)).toMatchObject({ state: 'ADMITTED', attempts: 1 })
  })

  test('fim da quinta lease após crash deixa pendência visível em revisão', async () => {
    const { payment } = await fixture()
    let lease = await claim()
    for (let attempt = 1; attempt < 5; attempt++) {
      await repository.retry(lease, now)
      now = new Date(now.getTime() + 120_000)
      const [next] = await repository.claim({ now, leaseMs: 180_000, limit: 1 })
      if (!next) throw new Error('Missing QA attempt')
      lease = next
    }
    now = new Date(lease.leaseUntil)
    expect(await repository.claim({ now, leaseMs: 180_000, limit: 1 })).toHaveLength(0)
    expect(await row(payment.id)).toMatchObject({
      state: 'REVIEW',
      reason: 'PROVIDER_UNAVAILABLE',
      attempts: 5,
      leaseId: null,
    })
  })

  test('reinício após abrir caso recupera a mesma origem, mesmo se o caso já foi encerrado', async () => {
    const { payment, subscription, providerId, chargeId } = await fixture()
    const lease = await claim()
    const item = SubscriptionRecoveryCase.open({
      subscriptionId: subscription.id,
      consumerId,
      providerSubscriptionId: providerId,
      paymentId: payment.id,
      providerPaymentId: chargeId,
      audience: 'kids',
      amountInCents: 9700n,
      policy: lease.policy,
      firstFailureAt: payment.toSnapshot().updatedAt,
      now,
    })
    await recoveries.create(item)
    const [owned] = await recoveries.claimDue({ now, leaseMs: 180_000, limit: 1 })
    if (!owned) throw new Error('Missing QA case lease')
    owned.item.applySource(
      {
        checkedAt: now,
        providerSubscriptionId: providerId,
        providerPaymentId: chargeId,
        amountInCents: 9700n,
        subscriptionStatus: 'ACTIVE',
        paymentStatus: 'PAID',
        paymentOperationPending: false,
        cancellationOperationPending: false,
      },
      now,
    )
    await recoveries.saveOwned(owned, now)
    await processor().process(lease)
    expect(await row(payment.id)).toMatchObject({ state: 'ADMITTED', caseId: item.id })
    expect((await recoveries.findByPaymentId(payment.id))?.state).toBe('RECOVERED')
  })

  test('lease reciclada recusa gravação do executor anterior; cinco falhas acabam em revisão', async () => {
    const { payment } = await fixture()
    const first = await claim()
    now = new Date(first.leaseUntil)
    const [replacement] = await repository.claim({ now, leaseMs: 180_000, limit: 1 })
    if (!replacement) throw new Error('Missing QA replacement')
    expect(
      await failureOf(
        repository.complete(
          first,
          { state: 'IGNORED', reason: 'NO_LONGER_ELIGIBLE', caseId: null },
          now,
        ),
      ),
    ).toBeInstanceOf(Error)
    let current = replacement
    for (;;) {
      await repository.retry(current, now)
      if (current.attempts === 5) break
      now = new Date(now.getTime() + 120_000)
      const [next] = await repository.claim({ now, leaseMs: 180_000, limit: 1 })
      if (!next) throw new Error('Missing QA retry')
      current = next
    }
    expect(await row(payment.id)).toMatchObject({
      state: 'REVIEW',
      reason: 'PROVIDER_UNAVAILABLE',
      attempts: 5,
      leaseId: null,
    })
  })
})
