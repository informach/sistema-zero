import { beforeEach, describe, expect, test } from 'bun:test'
import { GetPaymentService } from '../../src/application/get-payment/get-payment.service'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import { InProcessEventPublisher } from '../../src/infrastructure/events/in-process-event-publisher'
import { registerPaymentEventHandlers } from '../../src/application/event-handlers/payment-event-handlers'
import { ReconciliationWorker } from '../../src/infrastructure/workers/reconciliation-worker'
import {
  FakePixGateway,
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
      { pixKey: 'pix@loja.com', idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120, asyncChargeCreation: false },
      silentLogger,
    )
    const view = await service.execute(command)
    paymentId = view.id
  })

  const newWorker = () =>
    new ReconciliationWorker(repo, gateway, silentLogger, { intervalMs: 1000, batchSize: 10, staleAfterMs: 0 })

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
  test('payment.paid enfileira uma entrega para o consumidor', async () => {
    const deliveries = new InMemoryWebhookDeliveryRepository()
    const publisher = new InProcessEventPublisher(silentLogger)
    registerPaymentEventHandlers(publisher, deliveries, silentLogger)

    await publisher.publish({
      id: 'evt-1',
      aggregateId: 'pay-1',
      eventName: 'payment.paid',
      payload: { paymentId: 'pay-1', consumerId: 'sys-a', txid: 'txid-1' },
      attemptCount: 0,
      createdAt: new Date(),
    })

    expect(deliveries.enqueued).toHaveLength(1)
    expect(deliveries.enqueued[0]).toMatchObject({ consumerId: 'sys-a', eventName: 'payment.paid' })
  })
})
