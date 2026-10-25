import { describe, expect, test } from 'bun:test'
import { CancelSubscriptionService } from '../../src/application/cancel-subscription/cancel-subscription.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import { SubscriptionCancellationWorker } from '../../src/infrastructure/workers/subscription-cancellation-worker'
import { FakePixGateway, InMemorySubscriptionRepository, silentLogger } from '../fakes/in-memory'
import { InMemorySubscriptionOperationRepository } from '../fakes/subscription-operation-repository'

async function setup() {
  const subscriptions = new InMemorySubscriptionRepository()
  const gateway = new FakePixGateway()
  let now = new Date()
  const service = new CancelSubscriptionService(
    subscriptions,
    gateway,
    silentLogger,
    new InMemorySubscriptionOperationRepository(),
    undefined,
    () => now,
    30_000,
  )
  const worker = new SubscriptionCancellationWorker(subscriptions, service, silentLogger, {
    intervalMs: 30_000,
    leaseMs: 90_000,
    batchSize: 4,
    concurrency: 2,
  })
  const subscription = SubscriptionAggregate.create({
    consumerId: 'qa-owner',
    amount: Money.fromCents(9700),
    card: { brand: 'visa', last4: '4242' },
    providerPlanId: 'plan-qa',
    intervalMonths: 1,
    idempotencyKey: IdempotencyKey.create(`qa-${crypto.randomUUID()}`),
  })
  subscription.registerProviderSubscription('provider-qa')
  subscription.activate()
  await subscriptions.save(subscription)
  return {
    subscriptions,
    gateway,
    service,
    worker,
    id: subscription.id,
    clock: () => new Date(now),
    advance: () => {
      now = new Date(now.getTime() + 30_000)
    },
  }
}

describe('Retomada dos pedidos explícitos de cancelamento', () => {
  test('não inventa pedidos para assinaturas ativas sem solicitação', async () => {
    const { subscriptions, gateway, worker, id } = await setup()
    await worker.tick()
    expect(gateway.canceledSubscriptionIds).toHaveLength(0)
    expect((await subscriptions.findById(id))?.status).toBe('ACTIVE')
  })

  test('retoma falha de rede e encerra apenas quando o provedor confirma', async () => {
    const { subscriptions, gateway, service, worker, id, advance } = await setup()
    gateway.cancelSubscription = async () => {
      throw new Error('Offline')
    }
    gateway.subscriptionStatus = 'ACTIVE'
    await expect(service.execute('qa-owner', id)).rejects.toThrow('confirmando')
    expect((await subscriptions.findById(id))?.cancelRequestedAt).toBeInstanceOf(Date)
    gateway.subscriptionStatus = 'CANCELED'
    advance()
    await worker.tick()
    expect((await subscriptions.findById(id))?.status).toBe('CANCELED')
    expect(
      subscriptions.outbox.filter((event) => event.eventName === 'subscription.canceled'),
    ).toHaveLength(1)
    await worker.tick()
    expect(
      subscriptions.outbox.filter((event) => event.eventName === 'subscription.canceled'),
    ).toHaveLength(1)
  })

  test('tick não sobrepõe execução e stop drena a chamada que já começou', async () => {
    const { subscriptions, gateway, worker, id, clock } = await setup()
    const subscription = await subscriptions.findById(id)
    if (!subscription) throw new Error('Assinatura QA ausente')
    subscription.requestCancellation({ origin: 'ADMIN', actorId: 'qa-admin' }, clock())
    await subscriptions.save(subscription)
    let release: () => void = () => {}
    let started: () => void = () => {}
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    const barrier = new Promise<void>((resolve) => {
      release = resolve
    })
    gateway.cancelSubscription = async () => {
      started()
      await barrier
      gateway.subscriptionStatus = 'CANCELED'
    }
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
    expect((await subscriptions.findById(id))?.status).toBe('CANCELED')
  })
})
