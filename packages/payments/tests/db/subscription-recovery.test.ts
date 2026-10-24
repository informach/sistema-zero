import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { CancelSubscriptionService } from '../../src/application/cancel-subscription/cancel-subscription.service'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { RecoveryCoordinatorService } from '../../src/application/subscription-recovery/recovery-coordinator.service'
import { RecoveryNoticeService } from '../../src/application/subscription-recovery/recovery-notice.service'
import { RecoverySourceService } from '../../src/application/subscription-recovery/recovery-source.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { SubscriptionRecoveryCase } from '../../src/domain/subscription-recovery/recovery-case'
import type {
  RecoveryMessageReceipt,
  RecoveryMessageRequest,
  RecoveryMessagingGateway,
} from '../../src/domain/subscription-recovery/recovery-messaging.port'
import {
  DAY_MS,
  INITIAL_RECOVERY_POLICY,
} from '../../src/domain/subscription-recovery/recovery-policy'
import { Customer } from '../../src/domain/value-objects/customer'
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
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { DrizzleSubscriptionRecoveryRepository } from '../../src/infrastructure/persistence/drizzle/subscription-recovery.repository'
import { DrizzleWebhookInbox } from '../../src/infrastructure/persistence/drizzle/webhook-inbox.repository'
import { RecoveryCaseWorker } from '../../src/infrastructure/workers/recovery-case-worker'
import { FakePixGateway, silentLogger } from '../fakes/in-memory'
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
    await connection.sql`delete from payments.subscription_cancellation_audit where consumer_id=${consumerId}`
    await connection.sql`delete from payments.subscription_operations where consumer_id=${consumerId}`
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

  function noticeHarness(
    options: {
      loseFirstResponse?: boolean
      unavailable?: boolean
      status?: RecoveryMessageReceipt['status']
    } = {},
  ) {
    let time = new Date(now)
    let sends = 0
    const requests: RecoveryMessageRequest[] = []
    const messages = new Map<string, RecoveryMessageReceipt>()
    const get = async (id: string) => {
      const receipt = [...messages.values()].find((entry) => entry.id === id)
      if (!receipt) throw new Error('Missing QA receipt')
      return structuredClone(receipt)
    }
    const messaging: RecoveryMessagingGateway = {
      async send(request) {
        sends++
        requests.push(structuredClone(request))
        if (options.unavailable) throw new Error('QA messaging unavailable')
        let receipt = messages.get(request.idempotencyKey)
        if (!receipt) {
          receipt = {
            id: crypto.randomUUID(),
            status: options.status ?? 'QUEUED',
            acceptedAt: new Date(time),
            deliveredAt: null,
          }
          messages.set(request.idempotencyKey, receipt)
        }
        if (options.loseFirstResponse && sends === 1) throw new Error('QA accepted response lost')
        return structuredClone(receipt)
      },
      get,
      async suppress(id) {
        const receipt = await get(id)
        receipt.status = 'SUPPRESSED'
        for (const [key, value] of messages) if (value.id === id) messages.set(key, receipt)
        return { suppressed: true, receipt }
      },
      async suppressIntent(request) {
        let receipt = messages.get(request.idempotencyKey)
        if (!receipt)
          receipt = {
            id: crypto.randomUUID(),
            status: 'SUPPRESSED',
            acceptedAt: new Date(time),
            deliveredAt: null,
          }
        receipt.status = 'SUPPRESSED'
        messages.set(request.idempotencyKey, receipt)
        return { suppressed: true, receipt: structuredClone(receipt) }
      },
    }
    const notices = new DrizzleRecoveryNoticeRepository(connection.db)
    return {
      service: new RecoveryNoticeService(
        notices,
        messaging,
        new DrizzleSubscriptionRepository(connection.db),
        {
          kids: 'https://kids.example.invalid/pais/conta',
          adult: 'https://adult.example.invalid/compras',
        },
        () => new Date(time),
      ),
      notices,
      messages,
      requests,
      at: (value: Date) => {
        time = new Date(value)
      },
    }
  }

  async function d7Fixture(checkpoint = true, day = 7) {
    const initial = await ownedCase()
    const communication = noticeHarness({ status: 'SENT' })
    await communication.service.ensure(initial, 'INITIAL')
    await repository.saveOwned(initial, now)
    let time = new Date(now.getTime() + day * DAY_MS)
    communication.at(time)
    const [due] = await repository.claimDue({ now: time, leaseMs: 180_000, limit: 1 })
    if (!due) throw new Error('Missing QA D7 lease')
    const subscriptions = new DrizzleSubscriptionRepository(connection.db)
    const operations = new DrizzleSubscriptionOperationRepository(connection.db)
    const gateway = new FakePixGateway()
    gateway.cardStatus = 'FAILED'
    gateway.setSubscriptionCharges(source.providerSubscriptionId, [
      { chargeId: source.providerPaymentId, status: 'FAILED', createdAt: now },
    ])
    gateway.getCardCharge = async () => ({
      providerPaymentId: source.providerPaymentId,
      status: gateway.cardStatus,
      amountInCents: source.amountInCents,
      ...(gateway.cardStatus === 'PAID' ? { paidAt: new Date(time) } : {}),
    })
    const provider = new RecoverySourceService(
      subscriptions,
      new DrizzlePaymentRepository(connection.db),
      operations,
      gateway,
      () => new Date(time),
    )
    due.item.applySource(await provider.inspect(due.item.toSnapshot()), time)
    const lease = checkpoint ? await repository.checkpointOwned(due, time) : due
    let policyEnabled = true
    const policy = {
      get: async () => ({
        enabled: policyEnabled,
        policy: INITIAL_RECOVERY_POLICY,
        activatedAt: now,
        updatedAt: now,
        updatedBy: 'qa-policy',
      }),
    }
    const service = new CancelSubscriptionService(
      subscriptions,
      gateway,
      silentLogger,
      operations,
      undefined,
      () => new Date(time),
      90_000,
      {
        cases: repository,
        source: provider,
        notices: communication.service,
        policies: policy,
        effectBudgetMs: 30_000,
      },
    )
    return {
      lease,
      previous: due,
      gateway,
      operations,
      subscriptions,
      service,
      provider,
      communication,
      policy,
      setPolicyEnabled: (enabled: boolean) => {
        policyEnabled = enabled
      },
      coordinator: new RecoveryCoordinatorService(
        repository,
        subscriptions,
        new DrizzlePaymentRepository(connection.db),
        operations,
        provider,
        communication.service,
        service,
        new HandleSubscriptionNotificationService(
          subscriptions,
          new DrizzlePaymentRepository(connection.db),
          gateway,
          new DrizzleWebhookInbox(connection.db),
          silentLogger,
          () => new Date(time),
        ),
        () => new Date(time),
      ),
      clock: () => new Date(time),
      at: (value: Date) => {
        time = new Date(value)
        communication.at(time)
      },
    }
  }

  test.each([
    'kids',
    'adult',
  ] as const)('coordenador %s percorre D3/D6/D7 com mesmos prazos e confirmação real persistida', async (audience) => {
    source = { ...source, audience }
    const fixture = await d7Fixture(false, 3)
    await fixture.coordinator.process(fixture.lease)
    for (const day of [6, 7]) {
      fixture.at(new Date(now.getTime() + day * DAY_MS))
      const [lease] = await repository.claimDue({
        now: fixture.clock(),
        leaseMs: 360_000,
        limit: 1,
      })
      if (!lease) throw new Error('Missing QA scheduled case')
      await fixture.coordinator.process(lease)
    }
    expect((await repository.findById(fixture.lease.item.id))?.toSnapshot()).toMatchObject({
      state: 'CANCELED',
      reason: 'UNPAID_AFTER_NOTICE',
      deadlineAt: new Date(now.getTime() + 7 * DAY_MS),
    })
    expect(fixture.communication.requests.map((request) => request.templateKey)).toEqual([
      `recovery-${audience}-initial`,
      `recovery-${audience}-reminder`,
      `recovery-${audience}-reminder`,
      `recovery-${audience}-canceled`,
    ])
    expect(fixture.gateway.canceledSubscriptionIds).toEqual([source.providerSubscriptionId])
    expect((await fixture.subscriptions.findById(source.subscriptionId))?.status).toBe('CANCELED')
  })

  test('coordenador registra pagamento confirmado uma vez, fecha caso e não cancela', async () => {
    const fixture = await d7Fixture(false, 3)
    fixture.gateway.cardStatus = 'PAID'
    await fixture.coordinator.process(fixture.lease)
    expect((await repository.findById(fixture.lease.item.id))?.state).toBe('RECOVERED')
    expect(
      (await new DrizzlePaymentRepository(connection.db).findById(source.paymentId))?.status,
    ).toBe('PAID')
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
    expect(fixture.communication.requests.map((request) => request.templateKey)).toEqual([
      'recovery-kids-initial',
      'recovery-kids-recovered',
    ])
    expect(await failureOf(fixture.coordinator.process(fixture.lease))).toBeInstanceOf(Error)
    const events =
      await connection.sql`select id from payments.outbox where aggregate_id=${source.paymentId} and event_name='payment.paid'`
    expect(events).toHaveLength(1)
  })

  test('pagamento na janela D7 fecha recuperação e retira apenas o pedido automático não executado', async () => {
    const fixture = await d7Fixture(false)
    fixture.gateway.getCardCharge = async () => {
      const active = await fixture.operations.findActiveForSubscription(
        source.subscriptionId,
        fixture.clock(),
      )
      if (active?.kind === 'CANCEL') fixture.gateway.cardStatus = 'PAID'
      return {
        providerPaymentId: source.providerPaymentId,
        amountInCents: source.amountInCents,
        status: fixture.gateway.cardStatus,
        paidAt: fixture.clock(),
      }
    }
    await fixture.coordinator.process(fixture.lease)
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
    expect((await repository.findById(fixture.lease.item.id))?.state).toBe('RECOVERED')
    const subscription = await fixture.subscriptions.findById(source.subscriptionId)
    expect(subscription?.cancelRequestedAt).toBeNull()
    expect(subscription?.cancellationRecord).toMatchObject({
      origin: 'NONPAYMENT',
      withdrawalReason: 'RECOVERED',
      confirmedAt: null,
    })
    expect(subscription?.status).toBe('ACTIVE')
    expect(fixture.communication.requests.map((request) => request.templateKey)).toEqual([
      'recovery-kids-initial',
      'recovery-kids-recovered',
    ])
  })

  test('cancelamento solicitado pelo cliente interrompe novos avisos e mantém sua intenção', async () => {
    const fixture = await d7Fixture(false, 3)
    const subscription = await fixture.subscriptions.findById(source.subscriptionId)
    if (!subscription) throw new Error('Missing QA subscription')
    subscription.requestCancellation({ origin: 'CUSTOMER', actorId: 'qa-owner' }, fixture.clock())
    await fixture.subscriptions.save(subscription)
    await fixture.coordinator.process(fixture.lease)
    expect(fixture.communication.requests).toHaveLength(1)
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
    expect(
      (await fixture.subscriptions.findById(source.subscriptionId))?.cancellationRecord?.origin,
    ).toBe('CUSTOMER')
  })

  test('pagamento retira solicitação automática e descarta CANCEL READY só depois de confirmar quitação', async () => {
    const fixture = await d7Fixture(false, 3)
    const subscription = await fixture.subscriptions.findById(source.subscriptionId)
    if (!subscription) throw new Error('Missing QA subscription')
    subscription.requestCancellation(
      {
        origin: 'NONPAYMENT',
        actorId: 'system:subscription-recovery',
        recoveryCaseId: fixture.lease.item.id,
      },
      fixture.clock(),
    )
    await fixture.subscriptions.save(subscription)
    const operation = createSubscriptionOperation({
      subscriptionId: source.subscriptionId,
      consumerId: source.consumerId,
      providerSubscriptionId: source.providerSubscriptionId,
      kind: 'CANCEL',
      now: fixture.clock(),
    })
    await fixture.operations.create(operation)
    await fixture.operations.rejectWithdrawnCancellation(
      source.subscriptionId,
      fixture.lease.item.id,
      fixture.clock(),
    )
    expect((await fixture.operations.findById(operation.id))?.state).toBe('READY')
    fixture.gateway.cardStatus = 'PAID'
    await fixture.coordinator.process(fixture.lease)
    expect((await fixture.operations.findById(operation.id))?.state).toBe('REJECTED')
    expect(
      (await fixture.subscriptions.findById(source.subscriptionId))?.cancelRequestedAt,
    ).toBeNull()
    expect((await repository.findById(fixture.lease.item.id))?.state).toBe('RECOVERED')
  })

  test('pagamento com CANCEL em execução permanece em revisão, sem liberar outra intenção financeira', async () => {
    const fixture = await d7Fixture(false, 3)
    const subscription = await fixture.subscriptions.findById(source.subscriptionId)
    if (!subscription) throw new Error('Missing QA subscription')
    subscription.requestCancellation(
      {
        origin: 'NONPAYMENT',
        actorId: 'system:subscription-recovery',
        recoveryCaseId: fixture.lease.item.id,
      },
      fixture.clock(),
    )
    await fixture.subscriptions.save(subscription)
    const operation = createSubscriptionOperation({
      subscriptionId: source.subscriptionId,
      consumerId: source.consumerId,
      providerSubscriptionId: source.providerSubscriptionId,
      kind: 'CANCEL',
      now: fixture.clock(),
    })
    await fixture.operations.create(operation)
    await fixture.operations.start(operation.id, source.subscriptionId, fixture.clock())
    fixture.gateway.cardStatus = 'PAID'
    await fixture.coordinator.process(fixture.lease)
    expect((await repository.findById(fixture.lease.item.id))?.toSnapshot()).toMatchObject({
      state: 'MANUAL_REVIEW',
      reason: 'PAYMENT_UNCERTAIN',
    })
    expect((await fixture.operations.findById(operation.id))?.state).toBe('EXECUTING')
    expect(
      (await fixture.subscriptions.findById(source.subscriptionId))?.cancelRequestedAt,
    ).not.toBeNull()
    expect(fixture.communication.requests).toHaveLength(1)
  })

  test('política pausada durante conferência retira autorização D7 antes de enviar PUT', async () => {
    const fixture = await d7Fixture(false)
    fixture.gateway.getCardCharge = async () => {
      if (
        (await fixture.operations.findActiveForSubscription(source.subscriptionId, fixture.clock()))
          ?.kind === 'CANCEL'
      )
        fixture.setPolicyEnabled(false)
      return {
        providerPaymentId: source.providerPaymentId,
        amountInCents: source.amountInCents,
        status: 'FAILED',
      }
    }
    await fixture.coordinator.process(fixture.lease)
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
    expect((await repository.findById(fixture.lease.item.id))?.state).toBe('CANCEL_PENDING')
  })

  test('worker respeita pausa e stop drena a rodada sem sobrepor ticks', async () => {
    const fixture = await d7Fixture(false, 3)
    await repository.saveOwned(fixture.lease, fixture.clock())
    let release = () => {}
    let entered = () => {}
    const ready = new Promise<void>((resolve) => {
      entered = resolve
    })
    const barrier = new Promise<void>((resolve) => {
      release = resolve
    })
    const worker = new RecoveryCaseWorker(
      fixture.policy,
      repository,
      {
        process: async (lease) => {
          entered()
          await barrier
          await fixture.coordinator.process(lease)
        },
      },
      silentLogger,
      { intervalMs: 30_000, batchSize: 4, leaseMs: 360_000 },
      fixture.clock,
    )
    fixture.setPolicyEnabled(false)
    await worker.tick()
    expect(fixture.communication.requests).toHaveLength(1)
    fixture.setPolicyEnabled(true)
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
    expect(fixture.communication.requests).toHaveLength(2)
  })

  test('D7 persiste decisão antes do efeito e confirma cancelamento com origem/caso sem ampliar lease', async () => {
    const fixture = await d7Fixture()
    expect(fixture.lease.leaseUntil).toEqual(fixture.previous.leaseUntil)
    expect(fixture.lease.item.toSnapshot().version).toBe(
      fixture.previous.item.toSnapshot().version + 1,
    )
    expect((await repository.findById(fixture.lease.item.id))?.state).toBe('CANCEL_PENDING')
    expect(
      await failureOf(repository.assertOwned(fixture.previous, fixture.clock())),
    ).toBeInstanceOf(Error)
    await fixture.service.executeForRecovery(fixture.lease)
    expect(fixture.gateway.canceledSubscriptionIds).toEqual([source.providerSubscriptionId])
    expect(
      (await fixture.subscriptions.findById(source.subscriptionId))?.cancellationRecord,
    ).toMatchObject({
      origin: 'NONPAYMENT',
      actorId: 'system:subscription-recovery',
      recoveryCaseId: fixture.lease.item.id,
      endedStatus: 'CANCELED',
    })
    fixture.lease.item.applySource(
      await fixture.provider.inspect(fixture.lease.item.toSnapshot()),
      fixture.clock(),
    )
    await repository.saveOwned(fixture.lease, fixture.clock())
    expect((await repository.findById(fixture.lease.item.id))?.toSnapshot()).toMatchObject({
      state: 'CANCELED',
      reason: 'UNPAID_AFTER_NOTICE',
    })
  })

  test('decisão apenas em memória e executor com lease expirada não autorizam cancelamento', async () => {
    const fixture = await d7Fixture(false)
    expect(await failureOf(fixture.service.executeForRecovery(fixture.lease))).toBeInstanceOf(Error)
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
    expect(
      (await fixture.subscriptions.findById(source.subscriptionId))?.cancelRequestedAt,
    ).toBeNull()
    const stored = await repository.checkpointOwned(fixture.lease, fixture.clock())
    fixture.at(stored.leaseUntil)
    expect(await failureOf(fixture.service.executeForRecovery(stored))).toBeInstanceOf(Error)
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
  })

  test('pagamento que chega após preparar cancelamento impede PUT e retira autoridade da operação', async () => {
    const fixture = await d7Fixture()
    fixture.gateway.getCardCharge = async () => ({
      providerPaymentId: source.providerPaymentId,
      amountInCents: source.amountInCents,
      status:
        (await fixture.operations.findActiveForSubscription(source.subscriptionId, fixture.clock()))
          ?.kind === 'CANCEL'
          ? 'PAID'
          : 'FAILED',
    })
    expect(await failureOf(fixture.service.executeForRecovery(fixture.lease))).toBeInstanceOf(Error)
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
    expect((await fixture.subscriptions.findById(source.subscriptionId))?.status).toBe('ACTIVE')
    const rows =
      await connection.sql`select state,result from payments.subscription_operations where subscription_id=${source.subscriptionId}`
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ state: 'REJECTED', result: 'RECOVERY_AUTHORIZATION_CHANGED' })
  })

  test('pedido do cliente que chega durante D7 prevalece sem ser reclassificado como automático', async () => {
    const fixture = await d7Fixture()
    fixture.gateway.getCardCharge = async () => {
      const active = await fixture.operations.findActiveForSubscription(
        source.subscriptionId,
        fixture.clock(),
      )
      if (active?.kind === 'CANCEL') {
        const subscription = await fixture.subscriptions.findById(source.subscriptionId)
        if (!subscription) throw new Error('Missing QA subscription')
        if (
          subscription.requestCancellation(
            { origin: 'CUSTOMER', actorId: 'qa-owner' },
            fixture.clock(),
          )
        )
          await fixture.subscriptions.save(subscription)
      }
      return {
        providerPaymentId: source.providerPaymentId,
        status: 'FAILED',
        amountInCents: source.amountInCents,
      }
    }
    expect(await failureOf(fixture.service.executeForRecovery(fixture.lease))).toBeInstanceOf(Error)
    expect(fixture.gateway.canceledSubscriptionIds).toHaveLength(0)
    expect(
      (await fixture.subscriptions.findById(source.subscriptionId))?.cancellationRecord,
    ).toMatchObject({ origin: 'CUSTOMER', actorId: 'qa-owner' })
  })

  test('coordenação só inicia prazo com aceite identificado, guardando envelope e recibo antes do caso', async () => {
    const lease = await ownedCase()
    const harness = noticeHarness()
    expect(await harness.service.ensure(lease, 'INITIAL')).toBe('ACCEPTED')
    expect((await harness.notices.listForCase(lease.item.id))[0]?.receipt?.status).toBe('QUEUED')
    expect((await repository.findById(lease.item.id))?.toSnapshot().initialNoticeId).toBeNull()
    await repository.saveOwned(lease, now)
    const saved = (await repository.findById(lease.item.id))?.toSnapshot()
    expect(saved?.initialNoticeId).toBe([...harness.messages.values()][0]?.id)
    expect(saved?.deadlineAt).toEqual(new Date(now.getTime() + 7 * DAY_MS))
    expect(harness.requests[0]?.recipient.email).toBe('qa-responsible@example.invalid')
    expect(harness.requests[0]?.templateKey).toBe('recovery-kids-initial')
    expect(harness.requests[0]?.variables.prazo).toBe('')
    expect(harness.requests[0]?.variables.dias).toBe('7')
  })

  test('resposta perdida retoma o mesmo envelope e aceite original, sem reiniciar sete dias', async () => {
    const lease = await ownedCase()
    const harness = noticeHarness({ loseFirstResponse: true })
    expect(await harness.service.ensure(lease, 'INITIAL')).toBe('PENDING')
    expect(lease.item.toSnapshot().deadlineAt).toBeNull()
    await repository.saveOwned(lease, now)
    const later = new Date(now.getTime() + 120_000)
    harness.at(later)
    const [resumed] = await repository.claimDue({ now: later, leaseMs: 10_000, limit: 1 })
    if (!resumed) throw new Error('Missing QA resumed case')
    expect(await harness.service.ensure(resumed, 'INITIAL')).toBe('ACCEPTED')
    await repository.saveOwned(resumed, later)
    expect(harness.messages.size).toBe(1)
    expect(harness.requests[0]).toEqual(harness.requests[1])
    expect((await repository.findById(lease.item.id))?.toSnapshot().deadlineAt).toEqual(
      new Date(now.getTime() + 7 * DAY_MS),
    )
  })

  test('aviso ainda na fila no D7 impede cancelar silenciosamente', async () => {
    const lease = await ownedCase()
    const harness = noticeHarness()
    await harness.service.ensure(lease, 'INITIAL')
    await repository.saveOwned(lease, now)
    const deadline = new Date(now.getTime() + 7 * DAY_MS)
    harness.at(deadline)
    const [current] = await repository.claimDue({ now: deadline, leaseMs: 10_000, limit: 1 })
    if (!current) throw new Error('Missing QA due case')
    expect(await harness.service.initialHealthy(current)).toBe(false)
    expect(current.item.toSnapshot()).toMatchObject({
      state: 'MANUAL_REVIEW',
      reason: 'CONTACT_FAILED',
    })
    await repository.saveOwned(current, deadline)
    expect((await repository.findById(lease.item.id))?.state).toBe('MANUAL_REVIEW')
  })

  test('confirmação de pagamento retira aviso cuja resposta se perdeu, sem reenviá-lo', async () => {
    const lease = await ownedCase()
    const harness = noticeHarness({ loseFirstResponse: true })
    await harness.service.ensure(lease, 'INITIAL')
    lease.item.applySource(
      {
        checkedAt: now,
        providerSubscriptionId: source.providerSubscriptionId,
        providerPaymentId: source.providerPaymentId,
        amountInCents: source.amountInCents,
        subscriptionStatus: 'ACTIVE',
        paymentStatus: 'PAID',
        paymentOperationPending: false,
        cancellationOperationPending: false,
      },
      now,
    )
    expect(await harness.service.withdrawWarnings(lease)).toBe(true)
    await repository.saveOwned(lease, now)
    expect(harness.requests).toHaveLength(1)
    expect(harness.messages.size).toBe(1)
    expect((await harness.notices.listForCase(lease.item.id))[0]?.receipt?.status).toBe(
      'SUPPRESSED',
    )
    expect((await repository.findById(lease.item.id))?.state).toBe('RECOVERED')
  })

  test('caso fechado retoma retirada pendente mesmo quando o aviso original é antigo', async () => {
    const lease = await ownedCase()
    const harness = noticeHarness({ loseFirstResponse: true })
    await harness.service.ensure(lease, 'INITIAL')
    await repository.saveOwned(lease, now)
    const paidAt = new Date(now.getTime() + 7 * DAY_MS)
    const [paid] = await repository.claimDue({ now: paidAt, leaseMs: 10_000, limit: 1 })
    if (!paid) throw new Error('Missing QA paid lease')
    paid.item.applySource(
      {
        checkedAt: paidAt,
        providerSubscriptionId: source.providerSubscriptionId,
        providerPaymentId: source.providerPaymentId,
        amountInCents: source.amountInCents,
        subscriptionStatus: 'ACTIVE',
        paymentStatus: 'PAID',
        paymentOperationPending: false,
        cancellationOperationPending: false,
      },
      paidAt,
    )
    await repository.saveOwned(paid, paidAt)
    const resumedAt = new Date(paidAt.getTime() + 120_000)
    const [withdrawal] = await repository.claimDue({ now: resumedAt, leaseMs: 10_000, limit: 1 })
    expect(withdrawal?.item.state).toBe('RECOVERED')
    if (!withdrawal) throw new Error('Missing QA withdrawal lease')
    harness.at(resumedAt)
    expect(await harness.service.withdrawWarnings(withdrawal)).toBe(true)
    await repository.saveOwned(withdrawal, resumedAt)
    expect(
      await repository.claimDue({
        now: new Date(resumedAt.getTime() + 120_000),
        leaseMs: 10_000,
        limit: 1,
      }),
    ).toHaveLength(0)
    expect(harness.requests).toHaveLength(1)
  })

  test('falhas de contato têm cinco tentativas persistidas e terminam em revisão sem prazo fictício', async () => {
    let lease = await ownedCase()
    const harness = noticeHarness({ unavailable: true })
    for (let index = 0; index <= 5; index++) {
      const time = new Date(now.getTime() + index * 120_000)
      harness.at(time)
      const result = await harness.service.ensure(lease, 'INITIAL')
      expect(result).toBe(index === 5 ? 'FAILED' : 'PENDING')
      await repository.saveOwned(lease, time)
      if (index < 5) {
        const [next] = await repository.claimDue({
          now: new Date(time.getTime() + 120_000),
          leaseMs: 10_000,
          limit: 1,
        })
        if (!next) throw new Error('Missing QA retry lease')
        lease = next
      }
    }
    expect(harness.requests).toHaveLength(5)
    expect((await repository.findById(lease.item.id))?.toSnapshot()).toMatchObject({
      state: 'MANUAL_REVIEW',
      reason: 'CONTACT_FAILED',
      deadlineAt: null,
    })
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
        cancellationOperationPending: false,
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
    // The closed-case backoff below concerns the confirmation only. Its queued
    // reminder must have a withdrawal receipt, otherwise it is separate due work.
    await notices.recordReceipt(
      current!,
      reminder.id,
      { id: crypto.randomUUID(), status: 'SUPPRESSED', acceptedAt: due, deliveredAt: null },
      due,
    )
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
        cancellationOperationPending: false,
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
      customer: Customer.create({
        name: 'QA responsible',
        email: 'qa-responsible@example.invalid',
        document: '52998224725',
      }),
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
