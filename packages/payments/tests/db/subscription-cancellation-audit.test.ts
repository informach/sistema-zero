import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { CancellationRecord } from '../../src/domain/subscription/cancellation-record'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { SubscriptionRecoveryCase } from '../../src/domain/subscription-recovery/recovery-case'
import { INITIAL_RECOVERY_POLICY } from '../../src/domain/subscription-recovery/recovery-policy'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzlePaymentRepository } from '../../src/infrastructure/persistence/drizzle/payment.repository'
import { subscriptionCancellationAudit as audit } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionRecoveryRepository } from '../../src/infrastructure/persistence/drizzle/subscription-recovery.repository'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_cancellation_audit_test')
const consumerId = `qa-cancellation-audit-${crypto.randomUUID()}`
const now = new Date('2026-10-24T12:00:00.000Z')
async function failureOf(task: Promise<unknown>) {
  try {
    await task
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!databaseUrl)('Auditoria de cancelamento — PostgreSQL real', () => {
  let connection: DbConnection
  let subscriptions: DrizzleSubscriptionRepository
  let id: string
  beforeAll(async () => {
    connection = createDbConnection(databaseUrl!, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsSchema: 'drizzle',
      migrationsTable: 'payments_migrations',
    })
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
  })
  beforeEach(async () => {
    const item = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      intervalMonths: 1,
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
    })
    item.registerProviderSubscription(`qa-provider-${crypto.randomUUID()}`)
    item.activate()
    item.recordCharge('qa-initial-paid', new Date(now.getTime() - 30 * 86_400_000))
    await subscriptions.save(item)
    id = item.id
  })
  afterEach(async () => {
    await connection.sql`delete from payments.outbox where payload->>'consumerId'=${consumerId}`
    await connection.db.delete(audit).where(eq(audit.consumerId, consumerId))
    await connection.sql`delete from payments.subscription_recovery_cases where consumer_id=${consumerId}`
    await connection.sql`delete from payments.payments where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscriptions where consumer_id=${consumerId}`
  })
  afterAll(async () => connection?.close())
  async function load() {
    const item = await subscriptions.findById(id)
    if (!item) throw new Error('Missing QA subscription')
    return item
  }
  // O worker reivindica pedidos de qualquer assinatura do banco; em CI o banco é
  // compartilhado entre arquivos, então a prova olha só a assinatura deste teste.
  async function claimsThisSubscription() {
    const claimed = await subscriptions.claimCancellationRequests(1_000, 90_000)
    return claimed.some((item) => item.id === id)
  }
  async function recoveryCase() {
    const item = await load()
    const payment = buildCyclePayment({
      subscription: item,
      chargeId: `qa-failed-${crypto.randomUUID()}`,
      status: 'FAILED',
    })
    await new DrizzlePaymentRepository(connection.db).save(payment)
    const caseItem = SubscriptionRecoveryCase.open({
      subscriptionId: id,
      consumerId,
      providerSubscriptionId: item.providerSubscriptionId!,
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId!,
      audience: 'kids',
      amountInCents: 9700n,
      policy: INITIAL_RECOVERY_POLICY,
      firstFailureAt: now,
      now,
    })
    await new DrizzleSubscriptionRecoveryRepository(connection.db).create(caseItem)
    return caseItem.id
  }

  test('pedido, autor e confirmação sobrevivem à reabertura sem duplicar histórico', async () => {
    const item = await load()
    item.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' }, now)
    const recordId = item.cancellationRecord!.id
    await subscriptions.save(item)
    const reloaded = await load()
    expect(reloaded.cancellationRecord).toMatchObject({
      id: recordId,
      origin: 'ADMIN',
      actorId: 'qa-admin',
      requestedAt: now,
      confirmedAt: null,
    })
    const later = new Date(now.getTime() + 1_000)
    reloaded.cancel(later)
    await subscriptions.save(reloaded)
    const rows = await connection.db.select().from(audit).where(eq(audit.subscriptionId, id))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: recordId,
      origin: 'ADMIN',
      actorId: 'qa-admin',
      requestedAt: now,
      confirmedAt: later,
      endedStatus: 'CANCELED',
    })
    expect((await load()).cancellationRecord?.confirmedAt).toEqual(later)
  })

  test('um caso de outra assinatura não autoriza registrar cancelamento automático', async () => {
    const caseId = await recoveryCase()
    const other = SubscriptionAggregate.create({
      consumerId,
      amount: Money.fromCents(9700),
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'qa-plan',
      intervalMonths: 1,
      idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
    })
    other.registerProviderSubscription(`qa-other-${crypto.randomUUID()}`)
    other.activate()
    await subscriptions.save(other)
    const reloaded = await subscriptions.findById(other.id)
    if (!reloaded) throw new Error('Missing QA second subscription')
    reloaded.requestCancellation(
      { origin: 'NONPAYMENT', actorId: 'system:subscription-recovery', recoveryCaseId: caseId },
      now,
    )
    expect(await failureOf(subscriptions.save(reloaded))).toBeInstanceOf(Error)
    expect((await subscriptions.findById(other.id))?.cancelRequestedAt).toBeNull()
    expect(
      await connection.db.select().from(audit).where(eq(audit.subscriptionId, other.id)),
    ).toHaveLength(0)
  })

  test('falha da auditoria reverte assinatura/outbox e conserva eventos para repetir a gravação', async () => {
    const item = await load()
    item.requestCancellation({ origin: 'CUSTOMER', actorId: 'qa-owner' }, now)
    const record = item.cancellationRecord!
    await connection.db
      .insert(audit)
      .values({ ...record, actorId: 'qa-conflicting-actor', subscriptionId: id, consumerId })
    expect(await failureOf(subscriptions.save(item))).toBeInstanceOf(Error)
    expect((await load()).cancelRequestedAt).toBeNull()
    expect((await load()).cancellationRecord).toBeNull()
    expect(
      item.events.some((event) => event.eventName === 'subscription.cancellation.recorded'),
    ).toBe(true)
    expect(
      (
        await connection.sql`select count(*)::int as count from payments.outbox where aggregate_id=${id} and event_name='subscription.cancellation.recorded'`
      )[0]?.count,
    ).toBe(0)
    await connection.db.delete(audit).where(eq(audit.id, record.id))
    await subscriptions.save(item)
    expect((await load()).cancellationRecord?.id).toBe(record.id)
    expect(item.events).toHaveLength(0)
    expect(
      (
        await connection.sql`select count(*)::int as count from payments.outbox where aggregate_id=${id} and event_name='subscription.cancellation.recorded'`
      )[0]?.count,
    ).toBe(1)
  })

  test('retirada automática e novo pedido da pessoa preservam ambas as intenções', async () => {
    const caseId = await recoveryCase()
    const automatic = await load()
    automatic.requestCancellation(
      { origin: 'NONPAYMENT', actorId: 'system:subscription-recovery', recoveryCaseId: caseId },
      now,
    )
    const automaticId = automatic.cancellationRecord!.id
    await subscriptions.save(automatic)
    const recovered = await load()
    expect(
      recovered.withdrawNonpaymentCancellation(
        caseId,
        'RECOVERED',
        new Date(now.getTime() + 1_000),
      ),
    ).toBe(true)
    await subscriptions.save(recovered)
    expect((await load()).cancelRequestedAt).toBeNull()
    const manual = await load()
    manual.requestCancellation(
      { origin: 'CUSTOMER', actorId: 'qa-owner' },
      new Date(now.getTime() + 2_000),
    )
    await subscriptions.save(manual)
    const rows = await connection.db.select().from(audit).where(eq(audit.subscriptionId, id))
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.id === automaticId)).toMatchObject({
      origin: 'NONPAYMENT',
      withdrawalReason: 'RECOVERED',
      supersededBy: manual.cancellationRecord!.id,
    })
    expect((await load()).cancellationRecord).toMatchObject({
      origin: 'CUSTOMER',
      actorId: 'qa-owner',
      supersedesId: automaticId,
    })
  })

  test('pedido explícito substitui automático pendente e não pode ser retirado pela recuperação', async () => {
    const caseId = await recoveryCase()
    const automatic = await load()
    expect(await claimsThisSubscription()).toBe(false)
    automatic.requestCancellation(
      { origin: 'NONPAYMENT', actorId: 'system:subscription-recovery', recoveryCaseId: caseId },
      now,
    )
    await subscriptions.save(automatic)
    expect(await claimsThisSubscription()).toBe(false)
    const manual = await load()
    manual.requestCancellation(
      { origin: 'ADMIN', actorId: 'qa-admin' },
      new Date(now.getTime() + 1_000),
    )
    await subscriptions.save(manual)
    const current = await load()
    expect(
      current.withdrawNonpaymentCancellation(caseId, 'RECOVERED', new Date(now.getTime() + 2_000)),
    ).toBe(false)
    expect(current.cancelRequestedAt).not.toBeNull()
    expect(current.cancellationRecord?.origin).toBe('ADMIN')
    expect(
      await connection.db.select().from(audit).where(eq(audit.subscriptionId, id)),
    ).toHaveLength(2)
  })

  test('encerramento observado fora do sistema não inventa autor ou pedido do cliente', async () => {
    const item = await load()
    item.cancel(now)
    await subscriptions.save(item)
    expect((await load()).cancelRequestedAt).toBeNull()
    expect(
      (await connection.db.select().from(audit).where(eq(audit.subscriptionId, id)))[0],
    ).toMatchObject({ origin: 'EXTERNAL', actorId: null, requestedAt: null, confirmedAt: now })
  })

  test('constraints recusam autor ausente e confirmação parcial por SQL direto', async () => {
    const record = CancellationRecord.request(
      { origin: 'ADMIN', actorId: 'qa-admin' },
      now,
    ).toSnapshot()
    const row = { ...record, subscriptionId: id, consumerId }
    expect(
      await failureOf(connection.db.insert(audit).values({ ...row, actorId: null })),
    ).toBeInstanceOf(Error)
    expect(
      await failureOf(
        connection.db.insert(audit).values({ ...row, confirmedAt: now, endedStatus: null }),
      ),
    ).toBeInstanceOf(Error)
    expect(
      await failureOf(
        connection.db.insert(audit).values({ ...row, origin: 'NONPAYMENT', recoveryCaseId: null }),
      ),
    ).toBeInstanceOf(Error)
    expect(
      await connection.db.select().from(audit).where(eq(audit.subscriptionId, id)),
    ).toHaveLength(0)
  })
})
