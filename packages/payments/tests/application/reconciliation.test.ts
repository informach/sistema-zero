import { beforeEach, describe, expect, test } from 'bun:test'
import { registerPaymentEventHandlers } from '../../src/application/event-handlers/payment-event-handlers'
import { GetPaymentService } from '../../src/application/get-payment/get-payment.service'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import { InProcessEventPublisher } from '../../src/infrastructure/events/in-process-event-publisher'
import { ReconciliationWorker } from '../../src/infrastructure/workers/reconciliation-worker'
import {
  FakePixGateway,
  InMemoryConsumerRepository,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemoryWebhookDeliveryRepository,
  silentLogger,
} from '../fakes/in-memory'

const command: ProcessPaymentCommand = {
  consumerId: 'sys-a',
  idempotencyKey: 'idem-rec-001',
  requestHash: 'hash-A',
  amountInCents: 1000,
  method: 'PIX',
}

describe('ReconciliationWorker', () => {
  let repo: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let getPayment: GetPaymentService
  let service: ProcessPaymentService
  let paymentId: string

  beforeEach(async () => {
    repo = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    getPayment = new GetPaymentService(repo)
    // cria uma cobrança (síncrono → tem txid), ainda PENDING
    service = new ProcessPaymentService(
      repo,
      gateway,
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
    const view = await service.execute(command)
    paymentId = view.id
  })

  const newWorker = () =>
    new ReconciliationWorker(repo, gateway, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      staleAfterMs: 0,
    })

  test('confirma pagamentos cuja cobrança já está paga na Efí (webhook perdido)', async () => {
    gateway.chargeStatus = 'PAID'
    await newWorker().tick()
    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PAID')
  })

  test('expira pagamentos cuja cobrança foi removida na Efí', async () => {
    gateway.chargeStatus = 'EXPIRED'
    await newWorker().tick()
    const view = await getPayment.execute('sys-a', paymentId)
    expect(view.status).toBe('EXPIRED')
    expect(repo.outbox.some((e) => e.eventName === 'payment.expired')).toBe(true)
  })

  test('NÃO confirma se o valor pago divergir (amount mismatch)', async () => {
    gateway.chargeStatus = 'PAID'
    gateway.overrideAmountInCents = 1n
    await newWorker().tick()
    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PENDING')
    // Flag durável persistido na 1ª varredura…
    const flagged = (await repo.findById(paymentId))?.metadata.amountMismatch
    expect(flagged).toMatchObject({ got: '1' })
    // …e varreduras seguintes NÃO re-salvam (no-op do já-flagado — senão cada
    // ciclo da reconciliação bumparia version/updated_at à toa).
    await newWorker().tick()
    expect((await repo.findById(paymentId))?.metadata.amountMismatch).toEqual(flagged)
  })

  test('perder a corrida p/ outro writer (webhook/réplica) loga INFO, não ERROR', async () => {
    gateway.chargeStatus = 'PAID'
    // O webhook "vence" entre o findStalePendingCharges e o save do worker:
    // o save do worker conflita (version defasada) — caminho ESPERADO, sem alarme.
    const original = repo.save.bind(repo)
    let intercepts = 1
    repo.save = async (payment) => {
      if (intercepts-- > 0) {
        const winner = await repo.findById(payment.id)
        if (winner) {
          winner.markPaid()
          await original(winner)
        }
      }
      return original(payment)
    }
    const logs: { level: string; msg: string }[] = []
    const spyLogger = {
      debug(msg: string) {
        logs.push({ level: 'debug', msg })
      },
      info(msg: string) {
        logs.push({ level: 'info', msg })
      },
      warn(msg: string) {
        logs.push({ level: 'warn', msg })
      },
      error(msg: string) {
        logs.push({ level: 'error', msg })
      },
    }
    const worker = new ReconciliationWorker(repo, gateway, spyLogger, {
      intervalMs: 1000,
      batchSize: 10,
      staleAfterMs: 0,
    })

    await worker.tick()

    expect(logs.some((l) => l.level === 'info' && l.msg === 'reconcile.lost_race')).toBe(true)
    expect(logs.filter((l) => l.level === 'error')).toHaveLength(0)
    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PAID')
  })

  test('isolamento por item: um getPixCharge que falha não aborta o lote', async () => {
    // segundo pagamento, cujo getPixCharge vai falhar
    const other = await service.execute({ ...command, idempotencyKey: 'idem-rec-002' })
    const otherTxid = (await repo.findById(other.id))!.txid!
    gateway.failGetChargeTxids.add(otherTxid)
    gateway.chargeStatus = 'PAID'

    await newWorker().tick()

    // o pagamento bom foi confirmado apesar do outro ter falhado
    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PAID')
    expect((await getPayment.execute('sys-a', other.id)).status).toBe('PENDING')
  })
})

describe('Webhook de saída (enqueue no payment.paid)', () => {
  const subscriber = (id: string, events: string[]) => ({
    id,
    name: id,
    hmacSecret: 's'.repeat(32),
    allowedCidrs: [],
    webhookUrl: `http://${id}.internal/webhooks/payments`,
    subscribedEvents: events,
    isActive: true,
  })

  const paidMessage = {
    id: 'evt-1',
    aggregateId: 'pay-1',
    eventName: 'payment.paid',
    payload: { paymentId: 'pay-1', consumerId: 'sys-a', txid: 'txid-1' },
    attemptCount: 0,
    createdAt: new Date(),
  }

  test('payment.paid enfileira uma entrega para o consumidor', async () => {
    const deliveries = new InMemoryWebhookDeliveryRepository()
    const publisher = new InProcessEventPublisher(silentLogger)
    registerPaymentEventHandlers(
      publisher,
      deliveries,
      new InMemoryConsumerRepository(),
      silentLogger,
    )

    await publisher.publish(paidMessage)

    expect(deliveries.enqueued).toHaveLength(1)
    expect(deliveries.enqueued[0]).toMatchObject({ consumerId: 'sys-a', eventName: 'payment.paid' })
  })

  test('fan-out: subscriber inscrito recebe o evento ALÉM do dono (mesmo dedupKey)', async () => {
    const deliveries = new InMemoryWebhookDeliveryRepository()
    const publisher = new InProcessEventPublisher(silentLogger)
    const consumers = new InMemoryConsumerRepository()
      .add(subscriber('fiscal', ['payment.paid', 'payment.refunded']))
      .add(subscriber('outro', ['payment.refunded'])) // não inscrito em paid
    registerPaymentEventHandlers(publisher, deliveries, consumers, silentLogger)

    await publisher.publish(paidMessage)

    expect(deliveries.enqueued).toHaveLength(2)
    expect(deliveries.enqueued.map((d) => d.consumerId).sort()).toEqual(['fiscal', 'sys-a'])
    // Mesmo dedupKey por consumer → republicação do outbox segue idempotente.
    for (const d of deliveries.enqueued) expect(d.dedupKey).toBe('pay-1')
  })

  test('fan-out: subscriber que é o PRÓPRIO dono não recebe em dobro', async () => {
    const deliveries = new InMemoryWebhookDeliveryRepository()
    const publisher = new InProcessEventPublisher(silentLogger)
    const consumers = new InMemoryConsumerRepository().add(subscriber('sys-a', ['payment.paid']))
    registerPaymentEventHandlers(publisher, deliveries, consumers, silentLogger)

    await publisher.publish(paidMessage)

    expect(deliveries.enqueued).toHaveLength(1)
  })

  test('fan-out: falha no lookup de subscribers NÃO derruba a entrega ao dono', async () => {
    const deliveries = new InMemoryWebhookDeliveryRepository()
    const publisher = new InProcessEventPublisher(silentLogger)
    const broken = {
      findById: async () => null,
      findSubscribers: async () => {
        throw new Error('db down')
      },
    }
    registerPaymentEventHandlers(publisher, deliveries, broken, silentLogger)

    await publisher.publish(paidMessage)

    expect(deliveries.enqueued).toHaveLength(1)
    expect(deliveries.enqueued[0]).toMatchObject({ consumerId: 'sys-a' })
  })
})
