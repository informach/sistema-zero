import { describe, expect, test } from 'bun:test'
import { RefundPaymentService } from '../../src/application/refund-payment/refund-payment.service'
import { PaymentAggregate, type PaymentSnapshot } from '../../src/domain/payment/payment.aggregate'
import type { Currency } from '../../src/domain/value-objects/money'
import { FakePixGateway, InMemoryPaymentRepository, silentLogger } from '../fakes/in-memory'

function snapshot(over: Partial<PaymentSnapshot> = {}): PaymentSnapshot {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    version: 1,
    consumerId: 'sys-a',
    amountInCents: 1000n,
    currency: 'BRL' as Currency,
    methodType: 'PIX',
    card: null,
    status: 'PAID',
    provider: 'EFI',
    idempotencyKey: 'idem-1',
    providerPaymentId: 'prov-1',
    txid: 'txidabc123',
    pixQrCode: { copiaECola: 'x' },
    boleto: null,
    boletoRequest: null,
    customer: null,
    description: null,
    metadata: {},
    failureReason: null,
    subscriptionId: null,
    createdAt: now,
    updatedAt: now,
    paidAt: now,
    expiresAt: null,
    ...over,
  }
}

async function seed(repo: InMemoryPaymentRepository, over: Partial<PaymentSnapshot> = {}) {
  const snap = snapshot(over)
  await repo.save(PaymentAggregate.restore(snap))
  return snap.id
}

describe('RefundPaymentService', () => {
  test('estorna um Pix PAID → REFUNDED + devolução no provedor', async () => {
    const repo = new InMemoryPaymentRepository()
    const gateway = new FakePixGateway()
    const service = new RefundPaymentService(repo, gateway, silentLogger)
    const id = await seed(repo, { txid: 'txidpix01' })

    const view = await service.execute(id)

    expect(view.status).toBe('REFUNDED')
    expect(view.refundedAt).not.toBeNull()
    expect(view.providerRefundId).toBe('dev-txidpix0')
    expect(gateway.refundedPix).toHaveLength(1)
    expect(gateway.refundedPix[0]).toMatchObject({ txid: 'txidpix01', amountInCents: 1000n })
    expect((await repo.findById(id))?.status).toBe('REFUNDED')
  })

  test('estorna um cartão PAID → refund da cobrança', async () => {
    const repo = new InMemoryPaymentRepository()
    const gateway = new FakePixGateway()
    const service = new RefundPaymentService(repo, gateway, silentLogger)
    const id = await seed(repo, {
      methodType: 'CREDIT_CARD',
      card: { token: 'tok', brand: 'visa', last4: '4242', installments: 1 },
      pixQrCode: null,
      txid: null,
      providerPaymentId: 'charge-99',
    })

    const view = await service.execute(id)

    expect(view.status).toBe('REFUNDED')
    expect(gateway.refundedCard).toHaveLength(1)
    expect(gateway.refundedCard[0]).toMatchObject({
      providerPaymentId: 'charge-99',
      amountInCents: 1000n,
    })
  })

  test('é idempotente: estornar de novo não chama o provedor outra vez', async () => {
    const repo = new InMemoryPaymentRepository()
    const gateway = new FakePixGateway()
    const service = new RefundPaymentService(repo, gateway, silentLogger)
    const id = await seed(repo)

    await service.execute(id)
    const again = await service.execute(id)

    expect(again.status).toBe('REFUNDED')
    expect(gateway.refundedPix).toHaveLength(1)
  })

  test('pagamento não-PAID → PAYMENT_NOT_REFUNDABLE', async () => {
    const repo = new InMemoryPaymentRepository()
    const gateway = new FakePixGateway()
    const service = new RefundPaymentService(repo, gateway, silentLogger)
    const id = await seed(repo, { status: 'PENDING', paidAt: null })

    await expect(service.execute(id)).rejects.toMatchObject({ code: 'PAYMENT_NOT_REFUNDABLE' })
    expect(gateway.refundedPix).toHaveLength(0)
  })

  test('boleto não tem estorno programático → REFUND_NOT_SUPPORTED', async () => {
    const repo = new InMemoryPaymentRepository()
    const gateway = new FakePixGateway()
    const service = new RefundPaymentService(repo, gateway, silentLogger)
    const id = await seed(repo, {
      methodType: 'BOLETO',
      pixQrCode: null,
      txid: null,
      boleto: { barcode: 'b', digitableLine: 'd', pdfUrl: 'u' },
    })

    await expect(service.execute(id)).rejects.toMatchObject({ code: 'REFUND_NOT_SUPPORTED' })
  })

  test('pagamento inexistente → PAYMENT_NOT_FOUND', async () => {
    const repo = new InMemoryPaymentRepository()
    const gateway = new FakePixGateway()
    const service = new RefundPaymentService(repo, gateway, silentLogger)

    await expect(service.execute(crypto.randomUUID())).rejects.toMatchObject({
      code: 'PAYMENT_NOT_FOUND',
    })
  })

  test('falha do provedor propaga e NÃO marca REFUNDED', async () => {
    const repo = new InMemoryPaymentRepository()
    const gateway = new FakePixGateway()
    gateway.failRefund = true
    const service = new RefundPaymentService(repo, gateway, silentLogger)
    const id = await seed(repo)

    await expect(service.execute(id)).rejects.toThrow()
    expect((await repo.findById(id))?.status).toBe('PAID')
  })
})
