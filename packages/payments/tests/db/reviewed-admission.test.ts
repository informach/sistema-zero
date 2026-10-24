import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { RecoveryAdmissionService } from '../../src/application/subscription-recovery/recovery-admission.service'
import { RecoverySourceService } from '../../src/application/subscription-recovery/recovery-source.service'
import { ReviewHistoricalAdmissionService } from '../../src/application/subscription-recovery/review-historical-admission.service'
import { ValidationError } from '../../src/domain/shared/errors'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { Customer } from '../../src/domain/value-objects/customer'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import { ConcurrencyConflictError } from '../../src/infrastructure/persistence/drizzle/concurrency.error'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleRecoveryAdmissionRepository } from '../../src/infrastructure/persistence/drizzle/recovery-admission.repository'
import { DrizzleRecoveryPolicyRepository } from '../../src/infrastructure/persistence/drizzle/recovery-policy.repository'
import { DrizzleRecoveryReviewRepository } from '../../src/infrastructure/persistence/drizzle/recovery-review.repository'
import { DrizzleReviewedAdmissionRepository } from '../../src/infrastructure/persistence/drizzle/reviewed-admission.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { DrizzleSubscriptionRecoveryRepository } from '../../src/infrastructure/persistence/drizzle/subscription-recovery.repository'
import { DrizzleWebhookInbox } from '../../src/infrastructure/persistence/drizzle/webhook-inbox.repository'
import { FakePixGateway, silentLogger } from '../fakes/in-memory'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_reviewed_admission_test')
const consumerId = `qa-reviewed-${crypto.randomUUID()}`
const chargeCreatedAt = new Date('2026-10-16T12:00:00.000Z')
async function failureOf(work: Promise<unknown>) {
  try {
    await work
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!url)('Entrada histórica revisada — PostgreSQL real', () => {
  let connection: DbConnection
  let payments: DrizzlePaymentRepository
  let subscriptions: DrizzleSubscriptionRepository
  let policies: DrizzleRecoveryPolicyRepository
  let cases: DrizzleSubscriptionRecoveryRepository
  let reviews: DrizzleReviewedAdmissionRepository
  let operations: DrizzleSubscriptionOperationRepository
  let gateway: FakePixGateway
  let source: RecoverySourceService
  let service: ReviewHistoricalAdmissionService
  let subscriptionId: string
  let paymentId: string
  let providerId: string
  let chargeId: string
  let now: Date
  const command = () => ({
    paymentId,
    expectedVersion: 0,
    audience: 'kids' as const,
    actorId: 'qa-admin-history',
    requestId: crypto.randomUUID(),
  })
  const makeService = (repository = reviews) =>
    new ReviewHistoricalAdmissionService(
      payments,
      subscriptions,
      policies,
      cases,
      repository,
      source,
      () => now,
    )
  beforeAll(async () => {
    if (!url) throw new Error('Missing QA database')
    connection = createDbConnection(url, { max: 5 })
    await migrate(connection.db, {
      migrationsFolder: `${import.meta.dir}/../../src/infrastructure/persistence/drizzle/migrations`,
      migrationsTable: 'payments_migrations',
      migrationsSchema: 'drizzle',
    })
    payments = new DrizzlePaymentRepository(connection.db)
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
    policies = new DrizzleRecoveryPolicyRepository(connection.db)
    cases = new DrizzleSubscriptionRecoveryRepository(connection.db)
    operations = new DrizzleSubscriptionOperationRepository(connection.db)
  })
  afterAll(async () => {
    await connection?.close()
  })
  afterEach(async () => {
    await connection.sql`delete from payments.subscription_recovery_admission_reviews where payment_id in (select id from payments.payments where consumer_id=${consumerId})`
    await connection.sql`delete from payments.subscription_recovery_admissions where payment_id in (select id from payments.payments where consumer_id=${consumerId})`
    await connection.sql`delete from payments.subscription_recovery_cases where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscription_operations where consumer_id=${consumerId}`
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
  })
  beforeEach(async () => {
    const initial = await policies.initialize(new Date('2026-10-24T12:00:00Z'))
    now = new Date(
      Math.max(new Date('2026-10-24T12:00:00Z').getTime(), initial.updatedAt.getTime()) + 1,
    )
    let current = initial
    if (current.enabled) {
      current = await policies.update({
        expectedVersion: current.policy.version,
        windowDays: 7,
        reminderDays: [3, 6],
        enabled: false,
        actorId: 'qa-policy',
        now,
      })
      now = new Date(now.getTime() + 1)
    }
    await policies.update({
      expectedVersion: current.policy.version,
      windowDays: 7,
      reminderDays: [3, 6],
      enabled: true,
      actorId: 'qa-policy',
      now,
    })
    providerId = `qa-history-sub-${crypto.randomUUID()}`
    chargeId = `qa-history-charge-${crypto.randomUUID()}`
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      customer: Customer.create({
        name: 'Titular QA',
        email: 'qa-history@example.invalid',
        document: '52998224725',
      }),
      idempotencyKey: IdempotencyKey.create(`qa-history-${crypto.randomUUID()}`),
    })
    subscription.registerProviderSubscription(providerId)
    subscription.activate()
    subscription.recordCharge('qa-first-paid', new Date('2026-08-16T12:00:00Z'))
    await subscriptions.save(subscription)
    subscriptionId = subscription.id
    const payment = buildCyclePayment({
      subscription,
      chargeId,
      status: 'FAILED',
      failureReason: 'QA renewal declined',
    })
    await payments.save(payment)
    paymentId = payment.id
    await connection.sql`update payments.payments set created_at=${chargeCreatedAt.toISOString()}, updated_at=${chargeCreatedAt.toISOString()} where id=${paymentId}`
    gateway = new FakePixGateway()
    gateway.cardStatus = 'FAILED'
    gateway.subscriptionStatus = 'ACTIVE'
    gateway.overrideAmountInCents = 9700n
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'FAILED', createdAt: chargeCreatedAt },
    ])
    source = new RecoverySourceService(subscriptions, payments, operations, gateway, () => now)
    reviews = new DrizzleReviewedAdmissionRepository(connection.db, () => now)
    service = makeService()
  })

  test('inventário é readonly e revisão abre aviso/prazo novos, preservando recusa e auditoria', async () => {
    const inventory = new DrizzleRecoveryReviewRepository(connection.db)
    const page = await inventory.list({ subscriptionId, limit: 25, offset: 0 })
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({
      kind: 'ADMISSION',
      state: 'HISTORICAL',
      version: 0,
      audience: 'unknown',
    })
    expect(await cases.findByPaymentId(paymentId)).toBeNull()
    const input = command()
    const result = await service.execute(input)
    const snapshot = (await cases.findById(result.caseId))?.toSnapshot()
    expect(snapshot).toMatchObject({
      state: 'OPEN',
      deadlineAt: null,
      initialNoticeAcceptedAt: null,
      openedAt: now,
      firstFailureAt: chargeCreatedAt,
      audience: 'kids',
    })
    expect((await payments.findById(paymentId))?.status).toBe('FAILED')
    expect(await reviews.findByPaymentId(paymentId)).toMatchObject({
      actorId: input.actorId,
      requestId: input.requestId,
      caseId: result.caseId,
      sourceChargeCreatedAt: chargeCreatedAt,
      sourceObservedAt: now,
      approvedAt: now,
    })
    expect(
      (await inventory.list({ subscriptionId, limit: 25, offset: 0 })).items.map(
        (item) => item.kind,
      ),
    ).toEqual(['CASE'])
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
    expect(gateway.canceledSubscriptionIds).toHaveLength(0)
    expect(gateway.updatedCardSubscriptionIds).toHaveLength(0)
    expect(
      await reviews.resolveAudience({
        subscriptionId,
        consumerId,
        providerSubscriptionId: providerId,
        now,
      }),
    ).toBe('kids')
    expect(
      await reviews.resolveAudience({
        subscriptionId,
        consumerId: 'other-owner',
        providerSubscriptionId: providerId,
        now,
      }),
    ).toBeNull()
    expect(
      await reviews.resolveAudience({
        subscriptionId,
        consumerId,
        providerSubscriptionId: 'other-contract',
        now,
      }),
    ).toBeNull()
    expect(
      (await subscriptions.findById(subscriptionId))?.metadata.billingAudienceSource,
    ).toBeUndefined()
  })

  test('replay reconhece a revisão mesmo com política depois desativada; não consulta novamente', async () => {
    const input = command()
    const result = await service.execute(input)
    const current = await policies.get()
    if (!current) throw new Error('Missing policy')
    await policies.update({
      expectedVersion: current.policy.version,
      windowDays: 7,
      reminderDays: [3, 6],
      enabled: false,
      actorId: 'qa-policy',
      now,
    })
    const reads = gateway.listedSubscriptionIds.length
    expect(await service.execute(input)).toEqual(result)
    expect(gateway.listedSubscriptionIds).toHaveLength(reads)
  })

  test('duas revisões concorrentes preservam um caso e o primeiro autor/request', async () => {
    const inputs = [command(), { ...command(), actorId: 'qa-another-admin' }]
    const results = await Promise.allSettled(inputs.map((input) => service.execute(input)))
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const audit = await reviews.findByPaymentId(paymentId)
    expect(audit).not.toBeNull()
    expect(
      inputs.some(
        (input) => input.actorId === audit?.actorId && input.requestId === audit?.requestId,
      ),
    ).toBe(true)
    const rows =
      await connection.sql`select id from payments.subscription_recovery_cases where payment_id=${paymentId}`
    expect(rows).toHaveLength(1)
  })

  test.each([
    'paid',
    'pending',
    'canceled',
    'later',
    'unknown-date',
    'amount',
  ] as const)('recusa fonte %s sem abrir caso ou auditoria', async (scenario) => {
    if (scenario === 'paid') gateway.cardStatus = 'PAID'
    if (scenario === 'pending') gateway.cardStatus = 'PENDING'
    if (scenario === 'canceled') gateway.subscriptionStatus = 'CANCELED'
    if (scenario === 'amount') gateway.overrideAmountInCents = 9800n
    if (scenario === 'later')
      gateway.setSubscriptionCharges(providerId, [
        { chargeId, status: 'FAILED', createdAt: chargeCreatedAt },
        { chargeId: 'qa-later', status: 'FAILED', createdAt: new Date('2026-10-16T12:00:00Z') },
      ])
    if (scenario === 'unknown-date')
      gateway.setSubscriptionCharges(providerId, [{ chargeId, status: 'FAILED' }])
    expect(await failureOf(service.execute(command()))).toBeInstanceOf(ValidationError)
    expect(await reviews.findByPaymentId(paymentId)).toBeNull()
    expect(await cases.findByPaymentId(paymentId)).toBeNull()
  })

  test('público comprovado não é sobrescrito e versão antiga recusa antes da consulta', async () => {
    await connection.sql`update payments.subscriptions set metadata=${JSON.stringify({ billingAudienceSource: 'funnel-registry-v1', billingFunnelKey: 'kids-main', billingAudience: 'kids' })}::jsonb where id=${subscriptionId}`
    expect(await failureOf(service.execute({ ...command(), audience: 'adult' }))).toBeInstanceOf(
      Error,
    )
    expect(await failureOf(service.execute({ ...command(), expectedVersion: 99 }))).toBeInstanceOf(
      Error,
    )
    expect(gateway.listedSubscriptionIds).toHaveLength(0)
    expect(await reviews.findByPaymentId(paymentId)).toBeNull()
  })

  test('intenção de débito pendente impede iniciar o novo acompanhamento', async () => {
    await operations.create(
      createSubscriptionOperation({
        subscriptionId,
        consumerId,
        providerSubscriptionId: providerId,
        kind: 'RETRY',
        providerPaymentId: chargeId,
        amountInCents: 9700n,
        now,
        retryTerms: {
          period: { startsAt: '2026-10-16T12:00:00.000Z', endsAt: '2026-11-16T12:00:00.000Z' },
          nextExecution: '2026-11-16',
        },
      }),
    )
    expect(await failureOf(service.execute(command()))).toBeInstanceOf(Error)
    expect(await cases.findByPaymentId(paymentId)).toBeNull()
  })

  test.each([
    'version',
    'audience',
    'policy',
  ] as const)('mudança de %s após consulta recusa a gravação de uma revisão antiga', async (scenario) => {
    const original = gateway.getCardCharge.bind(gateway)
    gateway.getCardCharge = async (id) => {
      const charge = await original(id)
      if (scenario === 'version')
        await connection.sql`update payments.payments set version=version+1 where id=${paymentId}`
      if (scenario === 'audience')
        await connection.sql`update payments.subscriptions set metadata=${JSON.stringify({ billingAudienceSource: 'funnel-registry-v1', billingFunnelKey: 'adult-main', billingAudience: 'adult' })}::jsonb where id=${subscriptionId}`
      if (scenario === 'policy') {
        const configuration = await policies.get()
        if (!configuration) throw new Error('Missing policy')
        await policies.update({
          expectedVersion: configuration.policy.version,
          windowDays: 7,
          reminderDays: [3, 6],
          enabled: false,
          actorId: 'qa-policy',
          now,
        })
      }
      return charge
    }
    expect(await failureOf(service.execute(command()))).toBeInstanceOf(
      scenario === 'version' ? ConcurrencyConflictError : ValidationError,
    )
    if (scenario === 'version')
      expect((await payments.findById(paymentId))?.toSnapshot().version).toBe(1)
    if (scenario === 'audience')
      expect((await subscriptions.findById(subscriptionId))?.metadata.billingAudience).toBe('adult')
    if (scenario === 'policy') expect((await policies.get())?.enabled).toBe(false)
    expect(await cases.findByPaymentId(paymentId)).toBeNull()
    expect(await reviews.findByPaymentId(paymentId)).toBeNull()
  })

  test('prova vencida ao persistir reverte caso, auditoria e recibo de admissão', async () => {
    const stale = new DrizzleReviewedAdmissionRepository(
      connection.db,
      () => new Date(now.getTime() + 60_001),
    )
    expect(await failureOf(makeService(stale).execute(command()))).toBeInstanceOf(Error)
    expect(await cases.findByPaymentId(paymentId)).toBeNull()
    expect(await reviews.findByPaymentId(paymentId)).toBeNull()
    const rows =
      await connection.sql`select payment_id from payments.subscription_recovery_admissions where payment_id=${paymentId}`
    expect(rows).toHaveLength(0)
  })

  test('prova que vence depois das escritas reverte também auditoria e recibo', async () => {
    let checks = 0
    const delayed = new DrizzleReviewedAdmissionRepository(connection.db, () =>
      ++checks < 3 ? now : new Date(now.getTime() + 60_001),
    )
    expect(await failureOf(makeService(delayed).execute(command()))).toBeInstanceOf(ValidationError)
    expect(checks).toBe(3)
    expect(await cases.findByPaymentId(paymentId)).toBeNull()
    expect(await reviews.findByPaymentId(paymentId)).toBeNull()
    expect(
      await connection.sql`select payment_id from payments.subscription_recovery_admissions where payment_id=${paymentId}`,
    ).toHaveLength(0)
  })

  test('admissão em execução fica fenced e retenção do outbox não remove a revisão', async () => {
    const configuration = await policies.get()
    if (!configuration?.activatedAt) throw new Error('Missing active policy')
    const leaseId = crypto.randomUUID()
    const leaseUntil = new Date(now.getTime() + 60_000)
    await connection.sql`insert into payments.subscription_recovery_admissions (payment_id,policy,activated_at,discovered_at,state,attempts,next_attempt_at,lease_id,lease_until) values (${paymentId},${JSON.stringify(configuration.policy)}::jsonb,${configuration.activatedAt.toISOString()},${now.toISOString()},'PENDING',1,${now.toISOString()},${leaseId},${leaseUntil.toISOString()})`
    const result = await service.execute(command())
    const admission = new DrizzleRecoveryAdmissionRepository(connection.db)
    expect(
      await failureOf(
        admission.complete(
          {
            paymentId,
            policy: configuration.policy,
            activatedAt: configuration.activatedAt,
            discoveredAt: now,
            attempts: 1,
            leaseId,
            leaseUntil,
          },
          { state: 'REVIEW', reason: 'AUDIENCE_UNKNOWN', caseId: null },
          now,
        ),
      ),
    ).toBeInstanceOf(Error)
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    expect((await reviews.findByPaymentId(paymentId))?.caseId).toBe(result.caseId)
  })
  test.each([
    'kids',
    'adult',
  ] as const)('recusa futura usa público %s revisado sem falsificar registry', async (audience) => {
    const opened = await service.execute({ ...command(), audience })
    gateway.cardStatus = 'PAID'
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'PAID', createdAt: chargeCreatedAt },
    ])
    const cycles = new HandleSubscriptionNotificationService(
      subscriptions,
      payments,
      gateway,
      new DrizzleWebhookInbox(connection.db),
      silentLogger,
      () => now,
    )
    await cycles.handleCycle({ subscriptionId: providerId, chargeId })
    const item = await cases.findById(opened.caseId)
    if (!item) throw new Error('Missing reviewed case')
    const leaseId = crypto.randomUUID()
    const leaseUntil = new Date(now.getTime() + 90_000)
    // Own-row lease fixture; the normal writer still enforces its version/token/deadline.
    await connection.sql`update payments.subscription_recovery_cases set lease_id=${leaseId}, lease_until=${leaseUntil.toISOString()} where id=${item.id}`
    item.applySource(await source.inspect(item.toSnapshot()), now)
    await cases.saveOwned({ item, leaseId, leaseUntil }, now)
    expect((await cases.findById(item.id))?.state).toBe('RECOVERED')
    const configuration = await policies.get()
    if (!configuration?.activatedAt) throw new Error('Missing active policy')
    now = new Date(now.getTime() + 40 * 86_400_000)
    const fresh = await subscriptions.findById(subscriptionId)
    if (!fresh) throw new Error('Missing paid subscription')
    const nextChargeId = `qa-next-${crypto.randomUUID()}`
    const next = buildCyclePayment({
      subscription: fresh,
      chargeId: nextChargeId,
      status: 'FAILED',
      failureReason: 'QA later decline',
    })
    await payments.save(next)
    await connection.sql`update payments.payments set created_at=${now.toISOString()}, updated_at=${now.toISOString()} where id=${next.id}`
    gateway.cardStatus = 'FAILED'
    gateway.setSubscriptionCharges(providerId, [
      { chargeId, status: 'PAID', createdAt: chargeCreatedAt },
      { chargeId: nextChargeId, status: 'FAILED', createdAt: now },
    ])
    const nextLeaseId = crypto.randomUUID()
    const nextLeaseUntil = new Date(now.getTime() + 90_000)
    await connection.sql`insert into payments.subscription_recovery_admissions (payment_id,policy,activated_at,discovered_at,state,attempts,next_attempt_at,lease_id,lease_until) values (${next.id},${JSON.stringify(configuration.policy)}::jsonb,${configuration.activatedAt.toISOString()},${now.toISOString()},'PENDING',1,${now.toISOString()},${nextLeaseId},${nextLeaseUntil.toISOString()})`
    const admissions = new DrizzleRecoveryAdmissionRepository(connection.db)
    await new RecoveryAdmissionService(
      admissions,
      cases,
      subscriptions,
      payments,
      source,
      reviews,
      () => now,
    ).process({
      paymentId: next.id,
      policy: configuration.policy,
      activatedAt: configuration.activatedAt,
      discoveredAt: now,
      attempts: 1,
      leaseId: nextLeaseId,
      leaseUntil: nextLeaseUntil,
    })
    expect((await cases.findByPaymentId(next.id))?.toSnapshot()).toMatchObject({
      state: 'OPEN',
      audience,
      deadlineAt: null,
    })
    expect(
      (await subscriptions.findById(subscriptionId))?.metadata.billingAudienceSource,
    ).toBeUndefined()
    expect((await reviews.findByPaymentId(paymentId))?.caseId).toBe(opened.caseId)
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
  })
})
