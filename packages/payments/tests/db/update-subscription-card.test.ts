import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { CancelSubscriptionService } from '../../src/application/cancel-subscription/cancel-subscription.service'
import { UpdateSubscriptionCardService } from '../../src/application/subscription-card/update-subscription-card.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { Customer } from '../../src/domain/value-objects/customer'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleSubscriptionRepository } from '../../src/infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionMyReadRepository } from '../../src/infrastructure/persistence/drizzle/subscription-my-read.repository'
import { DrizzleSubscriptionOperationRepository } from '../../src/infrastructure/persistence/drizzle/subscription-operation.repository'
import { FakePixGateway, silentLogger } from '../fakes/in-memory'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_card_update_test')
const email = 'card-owner@example.test'
const card = { brand: 'mastercard', last4: '1234' }
const input = { paymentToken: 'token-qa-never-persist', card }

// postgres-js usa thenables; capturar a rejeição evita a armadilha conhecida do bun:test.
async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!databaseUrl)('Atualização preventiva de cartão — aplicação e PostgreSQL', () => {
  let connection: DbConnection
  let subscriptions: DrizzleSubscriptionRepository
  let operations: DrizzleSubscriptionOperationRepository
  let gateway: FakePixGateway
  let service: UpdateSubscriptionCardService
  let id: string
  let now: Date

  beforeAll(async () => {
    connection = createDbConnection(databaseUrl as string, { max: 5 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'payments_migrations',
      migrationsSchema: 'drizzle',
    })
    subscriptions = new DrizzleSubscriptionRepository(connection.db)
    operations = new DrizzleSubscriptionOperationRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  beforeEach(async () => {
    now = new Date('2026-10-23T12:00:00Z')
    const subscription = SubscriptionAggregate.create({
      consumerId: 'qa-owner',
      amount: Money.fromCents(9700),
      intervalMonths: 1,
      providerPlanId: 'plan-qa',
      card: { brand: 'visa', last4: '4242' },
      customer: Customer.create({ name: 'Pessoa QA', email, document: '52998224725' }),
      idempotencyKey: IdempotencyKey.create(`qa-${crypto.randomUUID()}`),
    })
    subscription.registerProviderSubscription('provider-qa')
    subscription.activate()
    await subscriptions.save(subscription)
    id = subscription.id
    gateway = new FakePixGateway()
    gateway.subscriptionStatus = 'ACTIVE'
    service = new UpdateSubscriptionCardService(
      new DrizzleSubscriptionMyReadRepository(connection.db),
      subscriptions,
      operations,
      gateway,
      () => now,
    )
  })

  test('atualiza só o cartão, sem pagamento/retry, e a reentrega não repete o efeito', async () => {
    const intent = await service.createIntent(email, id)
    expect(intent.chargesNow).toBe(false)
    const result = await service.execute(email, id, intent.id, input)
    expect(result.state).toBe('SUCCEEDED')
    expect(result.result).toBe('CARD_UPDATED')
    expect((await service.execute(email, id, intent.id, input)).state).toBe('SUCCEEDED')
    expect(gateway.updatedCardSubscriptionIds).toEqual(['provider-qa'])
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
    expect(gateway.cardCreatedCount).toBe(0)
    const subscription = await subscriptions.findById(id)
    expect(subscription?.card).toEqual(card)
    expect(subscription?.amount.amountInCents).toBe(9700n)
    expect(subscription?.providerPlanId).toBe('plan-qa')
    const [record] =
      await connection.sql`select row_to_json(o)::text as data from payments.subscription_operations o where id=${intent.id}`
    expect(String(record?.data)).not.toContain(input.paymentToken)
  })

  test('nega outro comprador antes de qualquer efeito, mesmo conhecendo os ids', async () => {
    const intent = await service.createIntent(email, id)
    expect(
      await failureOf(service.getIntent('another@example.test', id, intent.id)),
    ).toBeInstanceOf(Error)
    expect(
      await failureOf(service.execute('another@example.test', id, intent.id, input)),
    ).toBeInstanceOf(Error)
    expect(gateway.updatedCardSubscriptionIds).toHaveLength(0)
  })

  test('duas requisições concorrentes só atualizam uma vez', async () => {
    const intent = await service.createIntent(email, id)
    const results = await Promise.allSettled([
      service.execute(email, id, intent.id, input),
      service.execute(email, id, intent.id, input),
    ])
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true)
    expect(gateway.updatedCardSubscriptionIds).toHaveLength(1)
    expect((await service.getIntent(email, id, intent.id)).state).toBe('SUCCEEDED')
  })

  test('cancelamento usa o mesmo ledger e retira apenas formulário que ainda não executou', async () => {
    const intent = await service.createIntent(email, id)
    const cancellation = new CancelSubscriptionService(
      subscriptions,
      gateway,
      silentLogger,
      operations,
      undefined,
      () => now,
      30_000,
    )
    expect((await cancellation.executeAdmin(id)).status).toBe('CANCELED')
    expect((await operations.findById(intent.id))?.state).toBe('REJECTED')
    expect((await operations.findById(intent.id))?.result).toBe('CANCELLATION_REQUESTED')
    expect(gateway.canceledSubscriptionIds).toEqual(['provider-qa'])
    expect(gateway.updatedCardSubscriptionIds).toHaveLength(0)
  })

  test('cancelamento não disputa com débito de resultado desconhecido e mantém pedido visível', async () => {
    const retry = createSubscriptionOperation({
      subscriptionId: id,
      consumerId: 'qa-owner',
      providerSubscriptionId: 'provider-qa',
      kind: 'RETRY',
      providerPaymentId: 'qa-failed-renewal',
      amountInCents: 9700n,
      now,
    })
    await operations.create(retry)
    const started = await operations.start(retry.id, id, now)
    if (!started?.executionId) throw new Error('Missing QA debit authority')
    await operations.finish(retry.id, started.executionId, 'UNKNOWN', 'PROVIDER_UNKNOWN', now)
    const cancellation = new CancelSubscriptionService(
      subscriptions,
      gateway,
      silentLogger,
      operations,
      undefined,
      () => now,
      30_000,
    )
    expect(await failureOf(cancellation.executeAdmin(id))).toBeInstanceOf(Error)
    expect((await subscriptions.findById(id))?.cancelRequestedAt).toBeInstanceOf(Date)
    expect((await subscriptions.findById(id))?.status).toBe('ACTIVE')
    expect((await operations.findById(retry.id))?.state).toBe('UNKNOWN')
    expect(gateway.canceledSubscriptionIds).toHaveLength(0)
    expect(gateway.retriedSubscriptionChargeIds).toHaveLength(0)
  })

  test('reinício reconcilia cancelamento aceito com resposta perdida sem repetir PUT', async () => {
    const getSource = gateway.getSubscription.bind(gateway)
    let lost = false
    gateway.getSubscription = async (providerId) => {
      if (lost) throw new Error('QA unavailable receipt')
      return getSource(providerId)
    }
    gateway.cancelSubscription = async (providerId) => {
      gateway.canceledSubscriptionIds.push(providerId)
      gateway.subscriptionStatus = 'CANCELED'
      lost = true
      throw new Error('QA response lost')
    }
    const cancellation = new CancelSubscriptionService(
      subscriptions,
      gateway,
      silentLogger,
      operations,
      undefined,
      () => now,
      30_000,
    )
    expect(await failureOf(cancellation.executeAdmin(id))).toBeInstanceOf(Error)
    const pending = await operations.findActiveForSubscription(id, now)
    expect(pending?.kind).toBe('CANCEL')
    expect(pending?.state).toBe('UNKNOWN')
    expect(await failureOf(cancellation.executeAdmin(id))).toBeInstanceOf(Error)
    expect(gateway.canceledSubscriptionIds).toHaveLength(1)
    now = new Date(now.getTime() + 30_000)
    gateway.getSubscription = getSource
    const reopened = new CancelSubscriptionService(
      new DrizzleSubscriptionRepository(connection.db),
      gateway,
      silentLogger,
      new DrizzleSubscriptionOperationRepository(connection.db),
      undefined,
      () => now,
      30_000,
    )
    expect((await reopened.executeAdmin(id)).status).toBe('CANCELED')
    expect(gateway.canceledSubscriptionIds).toHaveLength(1)
    expect((await operations.findById(pending!.id))?.executionAttempts).toBe(2)
    expect((await operations.findById(pending!.id))?.state).toBe('SUCCEEDED')
  })

  test('reabrir recupera somente a intenção vigente do titular, sem criar novo efeito', async () => {
    expect(await service.getActiveIntent(email, id)).toEqual({ intent: null, canUpdate: true })
    const intent = await service.createIntent(email, id)
    expect((await service.getActiveIntent(email, id)).intent?.id).toBe(intent.id)
    expect(await failureOf(service.getActiveIntent('another@example.test', id))).toBeInstanceOf(
      Error,
    )
    now = new Date(intent.expiresAt)
    expect(await service.getActiveIntent(email, id)).toEqual({ intent: null, canUpdate: true })
    const replacement = await service.createIntent(email, id)
    expect(replacement.id).not.toBe(intent.id)
    expect((await service.getIntent(email, id, intent.id)).state).toBe('REJECTED')
    expect(gateway.updatedCardSubscriptionIds).toHaveLength(0)
  })

  test('resultado desconhecido continua visível e bloqueia outro token após o prazo', async () => {
    gateway.updateSubscriptionCard = async () => {
      throw new Error('Resposta perdida QA')
    }
    const intent = await service.createIntent(email, id)
    await service.execute(email, id, intent.id, input)
    now = new Date(Date.parse(intent.expiresAt) + 86_400_000)
    const active = (await service.getActiveIntent(email, id)).intent
    expect(active?.id).toBe(intent.id)
    expect(active?.state).toBe('UNKNOWN')
    expect(await failureOf(service.createIntent(email, id))).toBeInstanceOf(Error)
  })

  test('cancelamento após abrir a tela impede novo formulário, mas mantém consulta de resultado incerto', async () => {
    gateway.updateSubscriptionCard = async () => {
      throw new Error('Rede QA')
    }
    const intent = await service.createIntent(email, id)
    await service.execute(email, id, intent.id, input)
    const subscription = await subscriptions.findById(id)
    if (!subscription) throw new Error('Assinatura QA ausente')
    subscription.requestCancellation()
    await subscriptions.save(subscription)
    const current = await service.getActiveIntent(email, id)
    expect(current.canUpdate).toBe(false)
    expect(current.intent?.state).toBe('UNKNOWN')
    expect(current.intent?.id).toBe(intent.id)
  })

  test('resposta perdida mantém UNKNOWN e não reaproveita o token nem cria outra intenção', async () => {
    gateway.updateSubscriptionCard = async () => {
      throw new Error('resposta perdida com token-qa-never-persist')
    }
    const intent = await service.createIntent(email, id)
    expect((await service.execute(email, id, intent.id, input)).state).toBe('UNKNOWN')
    expect((await service.execute(email, id, intent.id, input)).state).toBe('UNKNOWN')
    expect(await failureOf(service.createIntent(email, id))).toBeInstanceOf(Error)
    expect((await operations.findById(intent.id))?.result).toBe('PROVIDER_UNKNOWN')
    expect((await subscriptions.findById(id))?.card.last4).toBe('4242')
  })

  test('mudança no provedor depois de abrir o formulário recusa a execução', async () => {
    const intent = await service.createIntent(email, id)
    gateway.subscriptionStatus = 'CANCELED'
    expect((await service.execute(email, id, intent.id, input)).state).toBe('REJECTED')
    expect(gateway.updatedCardSubscriptionIds).toHaveLength(0)
  })

  test('formulário vencido e cancelamento solicitado não alteram cartão', async () => {
    const intent = await service.createIntent(email, id)
    now = new Date(intent.expiresAt)
    expect(await failureOf(service.execute(email, id, intent.id, input))).toBeInstanceOf(Error)
    const subscription = await subscriptions.findById(id)
    if (!subscription) throw new Error('Assinatura QA ausente')
    subscription.requestCancellation()
    await subscriptions.save(subscription)
    expect(await failureOf(service.createIntent(email, id))).toBeInstanceOf(Error)
    expect(gateway.updatedCardSubscriptionIds).toHaveLength(0)
  })
})
