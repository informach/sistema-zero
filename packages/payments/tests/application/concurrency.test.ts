import { beforeEach, describe, expect, test } from 'bun:test'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import { ConcurrencyConflictError } from '../../src/infrastructure/persistence/drizzle/concurrency.error'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemorySubscriptionRepository,
  silentLogger,
} from '../fakes/in-memory'

const command: ProcessPaymentCommand = {
  consumerId: 'sys-a',
  idempotencyKey: 'idem-conc-001',
  requestHash: 'hash-A',
  amountInCents: 1000,
  method: 'PIX',
}

describe('Concorrência otimista (version)', () => {
  let repo: InMemoryPaymentRepository
  let paymentId: string

  beforeEach(async () => {
    repo = new InMemoryPaymentRepository()
    const service = new ProcessPaymentService(
      repo,
      new FakePixGateway(),
      new InMemoryIdempotencyStore(),
      {
        pixKey: 'pix@loja.com',
        idempotencyTtlSeconds: 3600,
        idempotencyInFlightTtlSeconds: 120,
        asyncChargeCreation: false,
        boletoDefaultExpiresDays: 3,
      },
      silentLogger,
    )
    paymentId = (await service.execute(command)).id
  })

  test('dois writers defasados: o segundo save conflita (lost-update evitado)', async () => {
    const a = await repo.findById(paymentId)
    const b = await repo.findById(paymentId)
    expect(a && b).toBeTruthy()

    a!.markPaid()
    await repo.save(a!) // vence

    b!.markPaid()
    await expect(repo.save(b!)).rejects.toBeInstanceOf(ConcurrencyConflictError)
  })

  test('reconciliação vs webhook: apenas UM evento payment.paid é emitido', async () => {
    // Duas réplicas carregam o mesmo pagamento PENDING e tentam confirmar.
    const reconcile = await repo.findById(paymentId)
    const webhook = await repo.findById(paymentId)

    reconcile!.markPaid()
    await repo.save(reconcile!)

    webhook!.markPaid()
    await repo.save(webhook!).catch(() => {
      /* conflito esperado — o outro venceu */
    })

    const paidEvents = repo.outbox.filter((e) => e.eventName === 'payment.paid')
    expect(paidEvents).toHaveLength(1)
  })
})

describe('Concorrência otimista — ASSINATURAS (version)', () => {
  let subs: InMemorySubscriptionRepository
  let subscriptionId: string

  beforeEach(async () => {
    subs = new InMemorySubscriptionRepository()
    const sub = SubscriptionAggregate.create({
      consumerId: 'sys-a',
      amount: Money.fromCents(1000),
      card: { brand: 'visa', last4: '4242' },
      providerPlanId: 'plan-1',
      intervalMonths: 1,
      idempotencyKey: IdempotencyKey.create('idem-sub-conc-1'),
    })
    await subs.save(sub)
    subscriptionId = sub.id
  })

  test('dois ciclos/notificações defasados: o segundo save conflita', async () => {
    const a = await subs.findById(subscriptionId)
    const b = await subs.findById(subscriptionId)

    a!.activate()
    await subs.save(a!) // vence

    b!.activate()
    await expect(subs.save(b!)).rejects.toBeInstanceOf(ConcurrencyConflictError)
  })

  test('apenas UM evento subscription.activated é emitido na corrida', async () => {
    const a = await subs.findById(subscriptionId)
    const b = await subs.findById(subscriptionId)

    a!.activate()
    await subs.save(a!)

    b!.activate()
    await subs.save(b!).catch(() => {
      /* conflito esperado — o outro venceu */
    })

    const activated = subs.outbox.filter((e) => e.eventName === 'subscription.activated')
    expect(activated).toHaveLength(1)
  })
})
