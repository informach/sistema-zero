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
import { DrizzleRecoveryNoticeRepository } from '../../src/infrastructure/persistence/drizzle/recovery-notice.repository'
import {
  subscriptionRecoveryCases,
  subscriptionRecoveryNotices,
} from '../../src/infrastructure/persistence/drizzle/schema'
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
    await connection.sql`delete from payments.subscription_recovery_notices where case_id in (select id from payments.subscription_recovery_cases where consumer_id=${consumerId})`
    await connection.db
      .delete(subscriptionRecoveryCases)
      .where(eq(subscriptionRecoveryCases.consumerId, consumerId))
  })

  async function ownedCase() {
    const item = SubscriptionRecoveryCase.open(source)
    await repository.create(item)
    const [lease] = await repository.claimDue({ now, leaseMs: 10_000, limit: 1 })
    if (!lease) throw new Error('QA case was not claimed')
    return lease
  }
  const envelope = () => ({
    channel: 'email' as const,
    templateKey: 'recovery-kids-initial',
    recipient: { name: 'QA responsible', email: 'qa@example.invalid' },
    variables: { url: 'https://kids.example.invalid/pais/assinaturas', amount: '97,00' },
  })

  test('aviso é persistido antes da rede e réplicas/reabertura usam o envelope original', async () => {
    const lease = await ownedCase()
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    const request = envelope()
    const create = () => notices.prepare(lease, { purpose: 'INITIAL', day: 0, request, now })
    const [left, right] = await Promise.all([create(), create()])
    expect(left.id).toBe(right.id)
    expect(left.request.idempotencyKey).toBe(`subscription-recovery:${lease.item.id}:INITIAL:0`)
    request.recipient.email = 'changed@example.invalid'
    const reloaded = await new DrizzleRecoveryNoticeRepository(connection.db).prepare(lease, {
      purpose: 'INITIAL',
      day: 0,
      request,
      now,
    })
    expect(reloaded.request.recipient.email).toBe('qa@example.invalid')
    expect(reloaded.attemptCount).toBe(0)
    expect(reloaded.receipt).toBeNull()
    reloaded.request.variables.amount = 'changed'
    expect((await notices.listForCase(lease.item.id))[0]?.request.variables.amount).toBe('97,00')
  })

  test('writer vencido não prepara, conta tentativa nem altera recibo após takeover', async () => {
    const lease = await ownedCase()
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    const notice = await notices.prepare(lease, {
      purpose: 'INITIAL',
      day: 0,
      request: envelope(),
      now,
    })
    const later = new Date(now.getTime() + 10_000)
    const [replacement] = await repository.claimDue({ now: later, leaseMs: 10_000, limit: 1 })
    expect(replacement?.leaseId).not.toBe(lease.leaseId)
    expect(
      await failureOf(
        notices.prepare(lease, { purpose: 'INITIAL', day: 0, request: envelope(), now: later }),
      ),
    ).toBeInstanceOf(Error)
    expect(await failureOf(notices.recordAttempt(lease, notice.id, later))).toBeInstanceOf(Error)
    expect(
      await failureOf(
        notices.recordReceipt(
          lease,
          notice.id,
          { id: crypto.randomUUID(), status: 'QUEUED', acceptedAt: now, deliveredAt: null },
          later,
        ),
      ),
    ).toBeInstanceOf(Error)
    await notices.recordAttempt(replacement!, notice.id, later)
    expect((await notices.listForCase(lease.item.id))[0]?.attemptCount).toBe(1)
  })

  test('recibo mantém identidade/aceite e evidência terminal, sem trocar histórico nem relógio', async () => {
    const lease = await ownedCase()
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    const notice = await notices.prepare(lease, {
      purpose: 'INITIAL',
      day: 0,
      request: envelope(),
      now,
    })
    const receipt = {
      id: crypto.randomUUID(),
      status: 'QUEUED' as const,
      acceptedAt: now,
      deliveredAt: null,
    }
    await notices.recordAttempt(lease, notice.id, now)
    await notices.recordReceipt(lease, notice.id, receipt, now)
    expect(
      await failureOf(
        notices.recordReceipt(lease, notice.id, { ...receipt, id: crypto.randomUUID() }, now),
      ),
    ).toBeInstanceOf(Error)
    const later = new Date(now.getTime() + 1_000)
    expect(
      await failureOf(
        notices.recordReceipt(lease, notice.id, { ...receipt, acceptedAt: later }, later),
      ),
    ).toBeInstanceOf(Error)
    await notices.recordReceipt(
      lease,
      notice.id,
      { ...receipt, status: 'DELIVERED', deliveredAt: later },
      later,
    )
    expect(await failureOf(notices.recordReceipt(lease, notice.id, receipt, later))).toBeInstanceOf(
      Error,
    )
    const current = (await notices.listForCase(lease.item.id))[0]!
    expect(current.receipt?.status).toBe('DELIVERED')
    expect(current.receipt?.acceptedAt).toEqual(now)
    expect(current.receipt?.deliveredAt).toEqual(later)
    expect((await repository.findById(lease.item.id))?.toSnapshot().deadlineAt).toBeNull()
  })

  test('aviso de outro caso, lembrete antecipado e envelope com dados extras são recusados', async () => {
    const lease = await ownedCase()
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    const invalidRecipient = { ...envelope().recipient, card: 'qa-marker' }
    expect(await failureOf(notices.recordAttempt(lease, crypto.randomUUID(), now))).toBeInstanceOf(
      Error,
    )
    expect(
      await failureOf(
        notices.prepare(lease, { purpose: 'REMINDER', day: 3, request: envelope(), now }),
      ),
    ).toBeInstanceOf(Error)
    expect(
      await failureOf(
        notices.prepare(lease, {
          purpose: 'INITIAL',
          day: 0,
          request: { ...envelope(), recipient: invalidRecipient },
          now,
        }),
      ),
    ).toBeInstanceOf(Error)
    expect(
      await connection.db
        .select()
        .from(subscriptionRecoveryNotices)
        .where(eq(subscriptionRecoveryNotices.caseId, lease.item.id)),
    ).toHaveLength(0)
  })

  test('lembrete só usa dia conquistado na política congelada e fechamento tem aviso próprio', async () => {
    const lease = await ownedCase()
    lease.item.acceptInitialNotice(crypto.randomUUID(), now, now)
    await repository.saveOwned(lease, now)
    const due = new Date(now.getTime() + 3 * DAY_MS)
    const [current] = await repository.claimDue({ now: due, leaseMs: 10_000, limit: 1 })
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    expect(
      await failureOf(
        notices.prepare(current!, { purpose: 'REMINDER', day: 6, request: envelope(), now: due }),
      ),
    ).toBeInstanceOf(Error)
    const reminder = await notices.prepare(current!, {
      purpose: 'REMINDER',
      day: 3,
      request: envelope(),
      now: due,
    })
    expect(reminder.day).toBe(3)
    current!.item.applySource(
      {
        checkedAt: due,
        providerSubscriptionId: source.providerSubscriptionId,
        providerPaymentId: source.providerPaymentId,
        amountInCents: source.amountInCents,
        subscriptionStatus: 'ACTIVE',
        paymentStatus: 'PAID',
        paymentOperationPending: false,
      },
      due,
    )
    const recovered = await notices.prepare(current!, {
      purpose: 'RECOVERED',
      day: 0,
      request: { ...envelope(), templateKey: 'recovery-kids-recovered' },
      now: due,
    })
    expect(recovered.id).not.toBe(reminder.id)
    expect(recovered.purpose).toBe('RECOVERED')
    expect(
      await failureOf(
        notices.prepare(current!, { purpose: 'REMINDER', day: 6, request: envelope(), now: due }),
      ),
    ).toBeInstanceOf(Error)
    await repository.saveOwned(current!, due)
    expect((await repository.findById(current!.item.id))?.state).toBe('RECOVERED')
    expect(await notices.listForCase(current!.item.id)).toHaveLength(2)
    const [closeout] = await repository.claimDue({ now: due, leaseMs: 10_000, limit: 1 })
    expect(closeout?.item.state).toBe('RECOVERED')
    await notices.recordAttempt(closeout!, recovered.id, due)
    await repository.saveOwned(closeout!, due)
    expect(await repository.claimDue({ now: due, leaseMs: 10_000, limit: 1 })).toHaveLength(0)
    const retryAt = new Date(due.getTime() + 120_000)
    const [retry] = await repository.claimDue({ now: retryAt, leaseMs: 10_000, limit: 1 })
    expect(retry?.item.state).toBe('RECOVERED')
    await notices.recordReceipt(
      retry!,
      recovered.id,
      { id: crypto.randomUUID(), status: 'QUEUED', acceptedAt: retryAt, deliveredAt: null },
      retryAt,
    )
    await repository.saveOwned(retry!, retryAt)
    expect(await repository.claimDue({ now: retryAt, leaseMs: 10_000, limit: 1 })).toHaveLength(0)
  })

  test('confirmação sem aceite para após 24h e fica no histórico sem reabrir o financeiro', async () => {
    const lease = await ownedCase()
    lease.item.applySource(
      {
        checkedAt: now,
        providerSubscriptionId: source.providerSubscriptionId,
        providerPaymentId: source.providerPaymentId,
        amountInCents: source.amountInCents,
        subscriptionStatus: 'CANCELED',
        paymentStatus: 'FAILED',
        paymentOperationPending: false,
      },
      now,
    )
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    await notices.prepare(lease, { purpose: 'CANCELED', day: 0, request: envelope(), now })
    await repository.saveOwned(lease, now)
    expect(
      await repository.claimDue({
        now: new Date(now.getTime() + DAY_MS),
        leaseMs: 10_000,
        limit: 1,
      }),
    ).toHaveLength(0)
    expect((await repository.findById(lease.item.id))?.state).toBe('CANCELED')
    expect((await notices.listForCase(lease.item.id))[0]?.receipt).toBeNull()
  })

  test('banco recusa tentativa sem instante e entrega sem evidência mesmo fora do adapter', async () => {
    const lease = await ownedCase()
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    const notice = await notices.prepare(lease, {
      purpose: 'INITIAL',
      day: 0,
      request: envelope(),
      now,
    })
    expect(
      await failureOf(
        connection.db
          .update(subscriptionRecoveryNotices)
          .set({ attemptCount: 1 })
          .where(eq(subscriptionRecoveryNotices.id, notice.id)),
      ),
    ).toBeInstanceOf(Error)
    expect(
      await failureOf(
        connection.db
          .update(subscriptionRecoveryNotices)
          .set({
            messageId: crypto.randomUUID(),
            messageStatus: 'DELIVERED',
            acceptedAt: now,
            observedAt: now,
          })
          .where(eq(subscriptionRecoveryNotices.id, notice.id)),
      ),
    ).toBeInstanceOf(Error)
    expect((await notices.listForCase(lease.item.id))[0]?.attemptCount).toBe(0)
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
