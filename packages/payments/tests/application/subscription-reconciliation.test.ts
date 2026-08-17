import { beforeEach, describe, expect, test } from 'bun:test'
import type { CreateSubscriptionCommand } from '../../src/application/create-subscription/create-subscription.command'
import { CreateSubscriptionService } from '../../src/application/create-subscription/create-subscription.service'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import type { Logger } from '../../src/infrastructure/logging/logger'
import { SubscriptionReconciliationWorker } from '../../src/infrastructure/workers/subscription-reconciliation-worker'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemorySubscriptionPlanRegistry,
  InMemorySubscriptionRepository,
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

const customer = {
  name: 'João da Silva',
  email: 'joao@example.com',
  document: '52998224725',
  phone: '11999998888',
  birth: '1990-05-10',
  address: {
    street: 'Rua A',
    number: '100',
    neighborhood: 'Centro',
    zipcode: '01001000',
    city: 'São Paulo',
    state: 'SP',
  },
}

const command: CreateSubscriptionCommand = {
  consumerId: 'sys-a',
  idempotencyKey: 'idem-sub-rec-0001',
  requestHash: 'hash-A',
  amountInCents: 9700,
  intervalMonths: 1,
  card: { token: 'paytok-abc', brand: 'visa', last4: '4242' },
  customer,
}

/** Logger espião: os testes afirmam o NÍVEL, não só a mensagem. */
function spyLogger(): { logger: Logger; logs: Array<{ level: string; msg: string }> } {
  const logs: Array<{ level: string; msg: string }> = []
  const push = (level: string) => (msg: string) => {
    logs.push({ level, msg })
  }
  return {
    logs,
    logger: {
      debug: push('debug'),
      info: push('info'),
      warn: push('warn'),
      error: push('error'),
    } as unknown as Logger,
  }
}

describe('SubscriptionReconciliationWorker', () => {
  let subscriptions: InMemorySubscriptionRepository
  let payments: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let inbox: InMemoryWebhookInbox
  let cycles: HandleSubscriptionNotificationService
  let providerSubscriptionId: string

  beforeEach(async () => {
    subscriptions = new InMemorySubscriptionRepository()
    payments = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    inbox = new InMemoryWebhookInbox()
    // A assinatura nasce ACTIVE com a 1ª cobrança paga (é o que o one-step faz).
    gateway.firstChargeStatus = 'PAID'
    const created = await new CreateSubscriptionService(
      subscriptions,
      payments,
      new InMemorySubscriptionPlanRegistry(),
      gateway,
      new InMemoryIdempotencyStore(),
      { idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120 },
      silentLogger,
    ).execute(command)
    const stored = await subscriptions.findById(created.id)
    providerSubscriptionId = stored?.providerSubscriptionId ?? ''
    cycles = new HandleSubscriptionNotificationService(
      subscriptions,
      payments,
      gateway,
      inbox,
      silentLogger,
    )
  })

  const newWorker = (logger: Logger = silentLogger) =>
    new SubscriptionReconciliationWorker(subscriptions, payments, gateway, cycles, logger, {
      intervalMs: 1000,
      batchSize: 10,
      concurrency: 2,
    })

  test('⭐ registra o ciclo PAGO que nunca virou linha (o furo do incidente)', async () => {
    // A Efí conhece uma 2ª cobrança paga; nós não temos linha dela — é exatamente
    // o estado em que o assinante pagou e ficou sem acesso.
    const ciclo = 'charge-agosto'
    gateway.setCycleChargeAmount(ciclo, 9700n)
    gateway.setSubscriptionCharges(providerSubscriptionId, [
      { chargeId: 'charge-julho', status: 'PAID' },
      { chargeId: ciclo, status: 'PAID' },
    ])
    expect(await payments.findByProviderPaymentId(gateway.provider, ciclo)).toBeNull()

    const { logger, logs } = spyLogger()
    await newWorker(logger).tick()

    const registrado = await payments.findByProviderPaymentId(gateway.provider, ciclo)
    expect(registrado?.status).toBe('PAID')
    // ⚠️ ERROR de propósito: a recuperação prova que a notificação se perdeu.
    expect(
      logs.some((l) => l.level === 'error' && l.msg === 'subscription.reconcile.cycle_recovered'),
    ).toBe(true)
  })

  test('a 2ª varredura não duplica nada (dedupe do inbox + linha já existente)', async () => {
    const ciclo = 'charge-agosto'
    gateway.setCycleChargeAmount(ciclo, 9700n)
    gateway.setSubscriptionCharges(providerSubscriptionId, [{ chargeId: ciclo, status: 'PAID' }])
    const worker = newWorker()
    await worker.tick()
    const antes = payments.byId.size

    const { logger, logs } = spyLogger()
    await newWorker(logger).tick()

    expect(payments.byId.size).toBe(antes)
    expect(logs.filter((l) => l.msg === 'subscription.reconcile.cycle_recovered')).toHaveLength(0)
  })

  test('assinatura em dia não gera nada, e cobrança NÃO paga é ignorada', async () => {
    gateway.setSubscriptionCharges(providerSubscriptionId, [
      { chargeId: 'charge-falhou', status: 'FAILED' },
      { chargeId: 'charge-esperando', status: 'PENDING' },
    ])
    const antes = payments.byId.size

    const { logger, logs } = spyLogger()
    await newWorker(logger).tick()

    expect(payments.byId.size).toBe(antes)
    expect(logs.filter((l) => l.level === 'error')).toHaveLength(0)
  })

  test('falha numa assinatura não impede as outras (isolamento por item)', async () => {
    // Uma 2ª assinatura, cuja consulta de histórico explode.
    const outra = await new CreateSubscriptionService(
      subscriptions,
      payments,
      new InMemorySubscriptionPlanRegistry(),
      gateway,
      new InMemoryIdempotencyStore(),
      { idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120 },
      silentLogger,
    ).execute({ ...command, idempotencyKey: 'idem-sub-rec-0002', requestHash: 'hash-B' })
    const outraStored = await subscriptions.findById(outra.id)
    gateway.failListChargesIds.add(outraStored?.providerSubscriptionId ?? '')

    const ciclo = 'charge-agosto'
    gateway.setCycleChargeAmount(ciclo, 9700n)
    gateway.setSubscriptionCharges(providerSubscriptionId, [{ chargeId: ciclo, status: 'PAID' }])

    const { logger, logs } = spyLogger()
    await newWorker(logger).tick()

    // A boa passou...
    expect((await payments.findByProviderPaymentId(gateway.provider, ciclo))?.status).toBe('PAID')
    // ...e a ruim reclamou sozinha, sem derrubar o tick.
    expect(logs.some((l) => l.msg === 'subscription.reconcile.item_failed')).toBe(true)
    expect(logs.some((l) => l.msg === 'subscription.reconcile.tick_failed')).toBe(false)
  })

  test('assinatura CANCELADA fica fora da varredura', async () => {
    const stored = await subscriptions.findById([...subscriptions.byId.keys()][0] ?? '')
    if (!stored) throw new Error('assinatura esperada')
    stored.cancel()
    await subscriptions.save(stored)
    // Valor semeado de propósito: sem isso o guard de divergência de valor barraria
    // o ciclo antes do filtro de status, e o teste passaria por acidente (foi o que
    // aconteceu na 1ª versão — a reversão do filtro não o derrubava).
    gateway.setCycleChargeAmount('charge-agosto', 9700n)
    gateway.setSubscriptionCharges(providerSubscriptionId, [
      { chargeId: 'charge-agosto', status: 'PAID' },
    ])

    await newWorker().tick()

    expect(await payments.findByProviderPaymentId(gateway.provider, 'charge-agosto')).toBeNull()
  })
})
