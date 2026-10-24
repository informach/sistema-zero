import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { addUtcCalendarMonths } from '@sistemazero/core/time'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { RecoveryAdmissionService } from '../../src/application/subscription-recovery/recovery-admission.service'
import { RecoverySourceService } from '../../src/application/subscription-recovery/recovery-source.service'
import { ResolveSupersededRecoveryService } from '../../src/application/subscription-recovery/resolve-superseded-recovery.service'
import { ValidationError } from '../../src/domain/shared/errors'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { SubscriptionRecoveryCase } from '../../src/domain/subscription-recovery/recovery-case'
import type { RecoveryResolutionAudit } from '../../src/domain/subscription-recovery/recovery-resolution.port'
import { Customer } from '../../src/domain/value-objects/customer'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { DrizzleRecoveryAdmissionRepository } from '../../src/infrastructure/persistence/drizzle/recovery-admission.repository'
import { DrizzleRecoveryPolicyRepository } from '../../src/infrastructure/persistence/drizzle/recovery-policy.repository'
import { DrizzleRecoveryResolutionRepository } from '../../src/infrastructure/persistence/drizzle/recovery-resolution.repository'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { DrizzleSubscriptionRecoveryRepository } from '../../src/infrastructure/persistence/drizzle/subscription-recovery.repository'
import { FakePixGateway } from '../fakes/in-memory'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_recovery_resolution_test')
const consumerId = `qa-resolution-${crypto.randomUUID()}`
async function failureOf(work: Promise<unknown>) {
  try {
    await work
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!url)('Fechamento por recibo posterior — PostgreSQL real', () => {
  let connection: DbConnection
  let payments: DrizzlePaymentRepository
  let subscriptions: DrizzleSubscriptionRepository
  let cases: DrizzleSubscriptionRecoveryRepository
  let operations: DrizzleSubscriptionOperationRepository
  let resolutions: DrizzleRecoveryResolutionRepository
  let gateway: FakePixGateway
  let subscriptionId: string
  let oldId: string
  let paidId: string
  let caseId: string
  let now: Date
  let observedAt: Date
  let originalDate: Date
  let paidDate: Date
  const oldChargeId = 'qa-original-declined'
  const paidChargeId = 'qa-subsequent-paid'
  const providerId = `qa-resolution-${crypto.randomUUID()}`
  const command = () => ({
    caseId,
    expectedVersion: 0,
    actorId: 'qa-admin-resolution',
    requestId: crypto.randomUUID(),
  })
  const service = (repository = resolutions) =>
    new ResolveSupersededRecoveryService(
      cases,
      repository,
      payments,
      subscriptions,
      operations,
      gateway,
      () => now,
    )
  async function audit(): Promise<RecoveryResolutionAudit> {
    const paid = await payments.findById(paidId)
    const original = await payments.findById(oldId)
    const subscription = await subscriptions.findById(subscriptionId)
    if (!paid || !original || !subscription || paid.cycleAccess?.kind !== 'VERIFIED_PERIOD')
      throw new Error('QA receipt missing')
    return {
      caseId,
      actorId: 'qa-admin-resolution',
      requestId: crypto.randomUUID(),
      paymentId: paidId,
      paymentVersion: paid.toSnapshot().version,
      subscriptionVersion: subscription.toSnapshot().version,
      originalPaymentVersion: original.toSnapshot().version,
      providerPaymentId: paidChargeId,
      originalChargeCreatedAt: originalDate,
      chargeCreatedAt: paidDate,
      periodStartsAt: new Date(paid.cycleAccess.period.startsAt),
      periodEndsAt: new Date(paid.cycleAccess.period.endsAt),
      observedAt,
      resolvedAt: observedAt,
    }
  }
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
    cases = new DrizzleSubscriptionRecoveryRepository(connection.db)
    operations = new DrizzleSubscriptionOperationRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  afterEach(async () => {
    await connection.sql`delete from payments.subscription_recovery_resolutions where case_id in (select id from payments.subscription_recovery_cases where consumer_id=${consumerId})`
    await connection.sql`delete from payments.subscription_recovery_admissions where payment_id in (select id from payments.payments where consumer_id=${consumerId})`
    await connection.sql`delete from payments.subscription_recovery_cases where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscription_operations where consumer_id=${consumerId}`
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
  })
  beforeEach(async () => {
    now = new Date(Date.now() + 80 * 86_400_000)
    observedAt = new Date(now)
    originalDate = new Date(now.getTime() - 40 * 86_400_000)
    paidDate = new Date(now.getTime() - 10 * 86_400_000)
    const subscription = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      metadata: {
        billingAudience: 'kids',
        billingAudienceSource: 'funnel-registry-v1',
        billingFunnelKey: 'qa-kids',
      },
      customer: Customer.create({
        name: 'Titular QA',
        email: 'qa-resolution@example.invalid',
        document: '52998224725',
      }),
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
    })
    subscription.registerProviderSubscription(providerId)
    subscription.activate()
    subscription.recordCharge('qa-first-paid', originalDate)
    await subscriptions.save(subscription)
    subscriptionId = subscription.id
    const original = buildCyclePayment({ subscription, chargeId: oldChargeId, status: 'FAILED' })
    const paid = buildCyclePayment({
      subscription,
      chargeId: paidChargeId,
      status: 'PAID',
      paidAt: paidDate,
      cycleAccess: {
        version: 1,
        kind: 'VERIFIED_PERIOD',
        period: {
          startsAt: paidDate.toISOString(),
          endsAt: addUtcCalendarMonths(paidDate, 1).toISOString(),
        },
      },
    })
    await payments.save(original)
    await payments.save(paid)
    oldId = original.id
    paidId = paid.id
    const item = SubscriptionRecoveryCase.open({
      subscriptionId,
      consumerId,
      providerSubscriptionId: providerId,
      paymentId: oldId,
      providerPaymentId: oldChargeId,
      audience: 'kids',
      amountInCents: 9700n,
      policy: { version: 1, windowDays: 7, reminderDays: [3, 6] },
      firstFailureAt: originalDate,
      now,
    })
    item.sourceDiverged(now)
    await cases.create(item)
    caseId = item.id
    gateway = new FakePixGateway()
    gateway.subscriptionStatus = 'ACTIVE'
    gateway.setSubscriptionCharges(providerId, [
      { chargeId: oldChargeId, status: 'FAILED', createdAt: originalDate },
      { chargeId: paidChargeId, status: 'PAID', createdAt: paidDate },
    ])
    gateway.getCardCharge = async (id) => ({
      providerPaymentId: id,
      amountInCents: 9700n,
      status: id === oldChargeId ? 'FAILED' : 'PAID',
    })
    resolutions = new DrizzleRecoveryResolutionRepository(connection.db, () => now)
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
  })
  test('fecha com motivo/auditoria próprios sem liquidar cobrança antiga ou emitir outro recibo', async () => {
    const input = command()
    expect(await service().execute(input)).toEqual({ caseId, resolved: true })
    expect((await cases.findById(caseId))?.toSnapshot()).toMatchObject({
      state: 'RECOVERED',
      reason: 'SUBSEQUENT_CYCLE_PAID',
      closedAt: now,
    })
    expect((await payments.findById(oldId))?.status).toBe('FAILED')
    expect((await payments.findById(paidId))?.status).toBe('PAID')
    expect(await resolutions.findByCaseId(caseId)).toMatchObject({
      actorId: input.actorId,
      requestId: input.requestId,
      paymentId: paidId,
    })
    const events =
      await connection.sql`select event_name from payments.outbox where aggregate_id=${caseId}`
    expect(events.map((event) => event.event_name)).toEqual(['subscription.recovery.changed'])
    await connection.sql`delete from payments.outbox where aggregate_id=${caseId}`
    expect((await resolutions.findByCaseId(caseId))?.paymentId).toBe(paidId)
    gateway.getSubscription = async () => {
      throw new Error('Replay must not query provider')
    }
    expect(await service().execute(input)).toEqual({ caseId, resolved: true })
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
    const closeout = (await cases.claimDue({ now, leaseMs: 90_000, limit: 100 })).find(
      (lease) => lease.item.id === caseId,
    )
    expect(closeout?.item.state).toBe('RECOVERED')
  })
  test('dois administradores não gravam duas resoluções', async () => {
    const result = await Promise.allSettled([
      service().execute(command()),
      service().execute(command()),
    ])
    expect(result.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect((await resolutions.findByCaseId(caseId))?.paymentId).toBe(paidId)
  })
  test.each([
    'old-paid',
    'later-refunded',
    'wrong-amount',
    'wrong-subscription',
    'no-later-date',
  ] as const)('fonte nova %s divergente não encerra acompanhamento', async (kind) => {
    const detail = gateway.getCardCharge.bind(gateway)
    gateway.getCardCharge = async (id) => {
      const charge = await detail(id)
      if (kind === 'old-paid' && id === oldChargeId) charge.status = 'PAID'
      if (kind === 'later-refunded' && id === paidChargeId) charge.status = 'REFUNDED'
      if (kind === 'wrong-amount') charge.amountInCents = 9600n
      return charge
    }
    const subscription = gateway.getSubscription.bind(gateway)
    gateway.getSubscription = async (id) => {
      const source = await subscription(id)
      if (kind === 'wrong-subscription') source.providerSubscriptionId = 'qa-another-subscription'
      if (kind === 'no-later-date')
        source.charges = source.charges.map((charge) =>
          charge.chargeId === paidChargeId ? { ...charge, createdAt: undefined } : charge,
        )
      return source
    }
    expect(await failureOf(service().execute(command()))).toBeInstanceOf(ValidationError)
    expect((await cases.findById(caseId))?.state).toBe('MANUAL_REVIEW')
    expect(await resolutions.findByCaseId(caseId)).toBeNull()
  })
  test.each([
    'original',
    'subscription',
    'paid',
  ] as const)('versão %s alterada durante consulta invalida a decisão', async (kind) => {
    const detail = gateway.getCardCharge.bind(gateway)
    let changed = false
    gateway.getCardCharge = async (id) => {
      if (!changed) {
        changed = true
        if (kind === 'subscription')
          await connection.sql`update payments.subscriptions set version=version+1 where id=${subscriptionId}`
        else
          await connection.sql`update payments.payments set version=version+1 where id=${kind === 'original' ? oldId : paidId}`
      }
      return detail(id)
    }
    if (kind === 'paid') {
      // The application reads this receipt after provider calls; changing it again
      // at the repository boundary proves the final receipt fence, rather than a stale fixture.
      const resolve = resolutions.resolve.bind(resolutions)
      resolutions.resolve = async (proof, version) => {
        await connection.sql`update payments.payments set version=version+1 where id=${paidId}`
        return resolve(proof, version)
      }
    }
    expect(await failureOf(service().execute(command()))).toBeInstanceOf(ValidationError)
    expect(changed).toBe(true)
    expect((await cases.findById(caseId))?.state).toBe('MANUAL_REVIEW')
    expect(await resolutions.findByCaseId(caseId)).toBeNull()
  })
  test.each([
    'period',
    'amount',
    'owner',
    'state',
  ] as const)('recibo local %s divergente impede fechamento', async (kind) => {
    if (kind === 'period')
      await connection.sql`update payments.payments set cycle_access=null where id=${paidId}`
    if (kind === 'amount')
      await connection.sql`update payments.payments set amount_in_cents=9600 where id=${paidId}`
    if (kind === 'owner')
      await connection.sql`update payments.payments set subscription_id=null where id=${paidId}`
    if (kind === 'state')
      await connection.sql`update payments.payments set status='FAILED',paid_at=null where id=${paidId}`
    expect(await failureOf(service().execute(command()))).toBeInstanceOf(ValidationError)
    expect((await cases.findById(caseId))?.state).toBe('MANUAL_REVIEW')
    expect(await resolutions.findByCaseId(caseId)).toBeNull()
  })
  test('lease do coordenador e intenção financeira pendente impedem resolução', async () => {
    await connection.sql`update payments.subscription_recovery_cases set lease_id=${crypto.randomUUID()},lease_until=${new Date(now.getTime() + 90_000).toISOString()} where id=${caseId}`
    expect(await failureOf(service().execute(command()))).toBeInstanceOf(ValidationError)
    await connection.sql`update payments.subscription_recovery_cases set lease_id=null,lease_until=null where id=${caseId}`
    await operations.create(
      createSubscriptionOperation({
        subscriptionId,
        consumerId,
        providerSubscriptionId: providerId,
        kind: 'CARD_UPDATE',
        now,
      }),
    )
    expect(await failureOf(service().execute(command()))).toBeInstanceOf(ValidationError)
    expect(await resolutions.findByCaseId(caseId)).toBeNull()
  })
  test('prova expirada depois dos locks não deixa fechamento, audit ou evento', async () => {
    const proof = await audit()
    now = new Date(now.getTime() + 60_001)
    expect(await failureOf(resolutions.resolve(proof, 0))).toBeInstanceOf(ValidationError)
    expect((await cases.findById(caseId))?.state).toBe('MANUAL_REVIEW')
    expect(await resolutions.findByCaseId(caseId)).toBeNull()
  })
  test('prova expirada após escritas faz rollback integral', async () => {
    const proof = await audit()
    let reads = 0
    const delayed = new DrizzleRecoveryResolutionRepository(
      connection.db,
      () => new Date(now.getTime() + (++reads > 1 ? 60_001 : 0)),
    )
    expect(await failureOf(delayed.resolve(proof, 0))).toBeInstanceOf(ValidationError)
    expect((await cases.findById(caseId))?.state).toBe('MANUAL_REVIEW')
    expect(await resolutions.findByCaseId(caseId)).toBeNull()
    expect(
      await connection.sql`select id from payments.outbox where aggregate_id=${caseId}`,
    ).toHaveLength(0)
  })
  test('retoma admissão CASE_EXISTS somente após fechar caso e preserva tentativas/política', async () => {
    const policies = new DrizzleRecoveryPolicyRepository(connection.db)
    const config =
      (await policies.get()) ?? (await policies.initialize(new Date(now.getTime() - 60_000)))
    const enabled = config.enabled
      ? config
      : await policies.update({
          expectedVersion: config.policy.version,
          enabled: true,
          windowDays: 7,
          reminderDays: [3, 6],
          actorId: 'qa-resolution',
          now: new Date(now.getTime() - 1),
        })
    const sub = await subscriptions.findById(subscriptionId)
    if (!sub || !enabled.activatedAt) throw new Error('Missing QA policy')
    const next = buildCyclePayment({
      subscription: sub,
      chargeId: 'qa-next-decline',
      status: 'FAILED',
    })
    await payments.save(next)
    await connection.sql`update payments.payments set updated_at=${now.toISOString()} where id=${next.id}`
    await connection.sql`insert into payments.subscription_recovery_admissions(payment_id,policy,activated_at,discovered_at,state,reason,attempts)
      values(${next.id},${JSON.stringify(enabled.policy)}::jsonb,${enabled.activatedAt.toISOString()},${now.toISOString()},'IGNORED','CASE_EXISTS',1)`
    const admissions = new DrizzleRecoveryAdmissionRepository(connection.db)
    await admissions.discover({ now, limit: 10 })
    let [row] =
      await connection.sql`select * from payments.subscription_recovery_admissions where payment_id=${next.id}`
    expect(row?.state).toBe('IGNORED')
    await service().execute(command())
    await admissions.discover({ now, limit: 10 })
    ;[row] =
      await connection.sql`select * from payments.subscription_recovery_admissions where payment_id=${next.id}`
    expect(row?.state).toBe('PENDING')
    expect(row?.attempts).toBe(1)
    expect(row?.policy).toEqual(enabled.policy)
    const claimed = await admissions.claim({ now, leaseMs: 90_000, limit: 100 })
    expect(claimed.find((item) => item.paymentId === next.id)?.attempts).toBe(2)
    const lease = claimed.find((item) => item.paymentId === next.id)
    if (!lease) throw new Error('Missing rearmed QA admission')
    gateway.setSubscriptionCharges(providerId, [
      { chargeId: oldChargeId, status: 'FAILED', createdAt: originalDate },
      { chargeId: paidChargeId, status: 'PAID', createdAt: paidDate },
      { chargeId: 'qa-next-decline', status: 'FAILED', createdAt: now },
    ])
    gateway.getCardCharge = async (id) => ({
      providerPaymentId: id,
      status: id === paidChargeId ? 'PAID' : 'FAILED',
      amountInCents: 9700n,
    })
    await new RecoveryAdmissionService(
      admissions,
      cases,
      subscriptions,
      payments,
      new RecoverySourceService(subscriptions, payments, operations, gateway, () => now),
      { resolveAudience: async () => null },
      () => now,
    ).process(lease)
    expect((await cases.findByPaymentId(next.id))?.toSnapshot()).toMatchObject({
      state: 'OPEN',
      audience: 'kids',
      initialNoticeAcceptedAt: null,
      deadlineAt: null,
    })
    expect((await payments.findById(oldId))?.status).toBe('FAILED')
  })
})
