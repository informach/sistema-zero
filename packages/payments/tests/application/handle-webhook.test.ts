import { beforeEach, describe, expect, test } from 'bun:test'
import { GetPaymentService } from '../../src/application/get-payment/get-payment.service'
import { HandleProviderWebhookService } from '../../src/application/handle-provider-webhook/handle-provider-webhook.service'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

describe('HandleProviderWebhookService (Pix)', () => {
  let repo: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let webhook: HandleProviderWebhookService
  let getPayment: GetPaymentService
  let paymentId: string
  let txid: string

  const command: ProcessPaymentCommand = {
    consumerId: 'sys-a',
    idempotencyKey: 'idem-87654321',
    requestHash: 'hash-A',
    amountInCents: 1000,
    method: 'PIX',
  }

  beforeEach(async () => {
    repo = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    const inbox = new InMemoryWebhookInbox()
    getPayment = new GetPaymentService(repo)
    webhook = new HandleProviderWebhookService(repo, gateway, inbox, silentLogger)

    const process = new ProcessPaymentService(
      repo,
      gateway,
      new InMemoryIdempotencyStore(),
      { pixKey: 'pix@loja.com', idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120, asyncChargeCreation: false },
      silentLogger,
    )
    const view = await process.execute(command)
    paymentId = view.id
    txid = view.pix!.txid
  })

  test('confirma o pagamento ao receber webhook de Pix pago', async () => {
    gateway.chargeStatus = 'PAID'
    await webhook.execute({ items: [{ txid, endToEndId: 'E2E-1' }] })

    const view = await getPayment.execute('sys-a', paymentId)
    expect(view.status).toBe('PAID')
    expect(view.paidAt).not.toBeNull()
    expect(repo.outbox.some((e) => e.eventName === 'payment.paid')).toBe(true)
  })

  test('ignora webhook duplicado (mesmo e2eId)', async () => {
    gateway.chargeStatus = 'PAID'
    await webhook.execute({ items: [{ txid, endToEndId: 'E2E-1' }] })
    await webhook.execute({ items: [{ txid, endToEndId: 'E2E-1' }] })

    const paidEvents = repo.outbox.filter((e) => e.eventName === 'payment.paid')
    expect(paidEvents).toHaveLength(1)
  })

  test('não confirma se a cobrança ainda não está paga na fonte', async () => {
    gateway.chargeStatus = 'PENDING'
    await webhook.execute({ items: [{ txid, endToEndId: 'E2E-2' }] })

    const view = await getPayment.execute('sys-a', paymentId)
    expect(view.status).toBe('PENDING')
  })

  test('NÃO marca pago se o valor pago divergir do cobrado (amount mismatch)', async () => {
    gateway.chargeStatus = 'PAID'
    gateway.overrideAmountInCents = 999n // diferente do cobrado (1000)
    await webhook.execute({ items: [{ txid, endToEndId: 'E2E-MM' }] })

    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PENDING')
  })

  test('evento não-pago não consome o dedupe: reentrega quando vira pago reprocessa', async () => {
    // 1ª entrega: cobrança ainda PENDING → não confirma, não consome o token.
    gateway.chargeStatus = 'PENDING'
    await webhook.execute({ items: [{ txid, endToEndId: 'E2E-RP' }] })
    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PENDING')

    // 2ª entrega do MESMO evento, agora pago → reprocessa e confirma.
    gateway.chargeStatus = 'PAID'
    await webhook.execute({ items: [{ txid, endToEndId: 'E2E-RP' }] })
    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PAID')
  })

  test('isolamento por item: um item que falha não aborta os demais', async () => {
    gateway.chargeStatus = 'PAID'
    gateway.failGetChargeTxids.add('txid-ruim')
    await webhook.execute({
      items: [
        { txid: 'txid-ruim', endToEndId: 'E2E-BAD' }, // getPixCharge lança
        { txid, endToEndId: 'E2E-OK' }, // ainda deve ser processado
      ],
    })

    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PAID')
  })
})
