import { describe, expect, test } from 'bun:test'
import { HandlePaymentWebhookService } from '../../src/application/handle-payment-webhook/handle-payment-webhook.service'
import {
  FakeCatalogClient,
  FakePaymentsClient,
  InMemoryInvoiceRepository,
  paidSnapshot,
  silentLogger,
} from '../fakes/in-memory'

const CONFIG = {
  ambiente: 'producao-restrita',
  serviceDescPrefix: 'Treinamento on-line',
  defaultGuaranteeDays: 7,
  emitBufferHours: 12,
  cancelWindowDays: 180,
}

function build() {
  const invoices = new InMemoryInvoiceRepository()
  const payments = new FakePaymentsClient()
  const catalog = new FakeCatalogClient()
  const service = new HandlePaymentWebhookService(invoices, payments, catalog, CONFIG, silentLogger)
  return { invoices, payments, catalog, service }
}

const paid = (paymentId = 'pay-1') => ({
  deliveryId: `d-${paymentId}`,
  eventName: 'payment.paid',
  payload: { paymentId },
})
const refunded = (paymentId = 'pay-1') => ({
  deliveryId: `r-${paymentId}`,
  eventName: 'payment.refunded',
  payload: { paymentId },
})

describe('payment.paid → agendamento', () => {
  test('agenda com guaranteeDays da oferta + buffer, a partir do paidAt', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({
      id: 'offer-1',
      name: 'Oferta R$37',
      productName: 'No Comando da IA',
      guaranteeDays: 30,
    })

    const result = await service.execute(paid())
    expect(result.kind).toBe('ok')

    const invoice = await invoices.findActiveByPaymentId('pay-1')
    expect(invoice?.status).toBe('SCHEDULED')
    expect(invoice?.serviceDescription).toBe('Treinamento on-line - No Comando da IA')
    expect(invoice?.guaranteeDays).toBe(30)
    // paidAt 01/06 12:00Z + 30d + 12h
    expect(invoice?.scheduledFor.toISOString()).toBe('2026-07-02T00:00:00.000Z')
  })

  test('oferta sem garantia → default de 7 dias; sem offerId → idem', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'Oferta', productName: 'Curso', guaranteeDays: null })
    await service.execute(paid())
    const a = await invoices.findActiveByPaymentId('pay-1')
    expect(a?.scheduledFor.toISOString()).toBe('2026-06-09T00:00:00.000Z') // 7d + 12h

    payments.set(paidSnapshot({ id: 'pay-2', metadata: {} }))
    await service.execute(paid('pay-2'))
    const b = await invoices.findActiveByPaymentId('pay-2')
    expect(b?.scheduledFor.toISOString()).toBe('2026-06-09T00:00:00.000Z')
  })

  test('re-entrega do MESMO pagamento não duplica (unique de ativa)', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())
    await service.execute({ ...paid(), deliveryId: 'd-outra-entrega' })
    expect(invoices.invoices.size).toBe(1)
  })

  test('payments fora do ar → retryable (502, sem consumir a entrega)', async () => {
    const { payments, service } = build()
    payments.failWith = new Error('ECONNREFUSED')
    const result = await service.execute(paid())
    expect(result.kind).toBe('retryable')
  })

  test('catalog fora do ar → retryable (guaranteeDays errado emitiria CEDO)', async () => {
    const { payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.failWith = new Error('timeout')
    const result = await service.execute(paid())
    expect(result.kind).toBe('retryable')
  })

  test('oferta paga 404 no catalog → retryable (não emite cedo com garantia default)', async () => {
    const { invoices, payments, service } = build()
    payments.set(paidSnapshot()) // metadata.offerId = 'offer-1', mas o catalog está vazio
    const result = await service.execute(paid())
    expect(result.kind).toBe('retryable') // fail-closed: oferta paga DEVE existir
    expect(invoices.invoices.size).toBe(0) // nada agendado
  })

  test('pagamento que já não está PAID (corrida c/ refund) → consome sem agendar', async () => {
    const { invoices, payments, service } = build()
    payments.set(paidSnapshot({ status: 'REFUNDED' }))
    const result = await service.execute(paid())
    expect(result.kind).toBe('ok')
    expect(invoices.invoices.size).toBe(0)
  })

  test('CPF ausente/inválido → nota nasce FAILED com erro legível', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot({ customer: { name: 'X', email: 'x@x.com', document: 'abc' } }))
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())
    const [invoice] = [...invoices.invoices.values()]
    expect(invoice?.status).toBe('FAILED')
    expect(invoice?.lastError).toContain('CPF')
  })
})

describe('payment.refunded', () => {
  test('antes da emissão → SKIPPED', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())

    const result = await service.execute(refunded())
    expect(result.kind).toBe('ok')
    const [invoice] = [...invoices.invoices.values()]
    expect(invoice?.status).toBe('SKIPPED')
    expect(invoice?.skipReason).toContain('REFUNDED_BEFORE_EMISSION')
  })

  test('depois da emissão (dentro da janela) → CANCEL_PENDING automático', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())
    const [invoice] = [...invoices.invoices.values()]
    Object.assign(invoice!, { status: 'EMITTED', emittedAt: new Date() })

    await service.execute(refunded())
    expect(invoice?.status).toBe('CANCEL_PENDING')
    expect(invoice?.cancelRequestedBy).toBe('system:refund')
  })

  test('depois da emissão FORA da janela de 180d → só sinaliza (sem transição)', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())
    const [invoice] = [...invoices.invoices.values()]
    Object.assign(invoice!, {
      status: 'EMITTED',
      emittedAt: new Date(Date.now() - 200 * 24 * 3600_000),
    })

    await service.execute(refunded())
    expect(invoice?.status).toBe('EMITTED')
    expect(invoices.events.some((e) => e.type === 'CANCEL_REQUESTED_OUT_OF_WINDOW')).toBe(true)
  })

  test('estorno sem nota (venda pré-fiscal) → consome sem efeito', async () => {
    const { service } = build()
    const result = await service.execute(refunded('pay-desconhecido'))
    expect(result.kind).toBe('ok')
  })

  test('estorno de EMITTED com emittedAt NULO → CANCEL_PENDING (fail-closed, não fora-da-janela)', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())
    const [invoice] = [...invoices.invoices.values()]
    Object.assign(invoice!, { status: 'EMITTED', emittedAt: null }) // estado anômalo

    await service.execute(refunded())
    // emittedAt nulo NÃO pode virar idade ~56 anos (epoch) e pular o cancelamento.
    expect(invoice?.status).toBe('CANCEL_PENDING')
  })
})

describe('idempotência por pagamento (não só por nota ativa)', () => {
  test('re-entrega do paid após a nota já ter virado SKIPPED não cria 2ª nota', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())
    await service.execute(refunded()) // SCHEDULED → SKIPPED
    expect([...invoices.invoices.values()][0]?.status).toBe('SKIPPED')

    // Crash entre execute() e markProcessed → MESMO paid re-entregue (deliveryId novo):
    const result = await service.execute({ ...paid(), deliveryId: 'd-reentrega' })
    expect(result.kind).toBe('ok')
    expect(invoices.invoices.size).toBe(1) // NÃO ressuscita uma 2ª nota p/ venda estornada
  })

  test('re-entrega do paid após FAILED (CPF inválido) não cria 2ª nota', async () => {
    const { invoices, payments, catalog, service } = build()
    payments.set(paidSnapshot({ customer: { name: 'X', email: 'x@x.com', document: 'abc' } }))
    catalog.set({ id: 'offer-1', name: 'O', productName: 'C', guaranteeDays: 7 })
    await service.execute(paid())
    expect([...invoices.invoices.values()][0]?.status).toBe('FAILED')

    await service.execute({ ...paid(), deliveryId: 'd-reentrega' })
    expect(invoices.invoices.size).toBe(1)
  })
})

describe('payloads inválidos', () => {
  test('sem paymentId → consome (re-entrega não conserta)', async () => {
    const { service } = build()
    const result = await service.execute({
      deliveryId: 'd-x',
      eventName: 'payment.paid',
      payload: {},
    })
    expect(result.kind).toBe('ok')
  })

  test('evento não-assinado → consome sem efeito', async () => {
    const { invoices, service } = build()
    const result = await service.execute({
      deliveryId: 'd-y',
      eventName: 'subscription.activated',
      payload: { paymentId: 'pay-1' },
    })
    expect(result.kind).toBe('ok')
    expect(invoices.invoices.size).toBe(0)
  })
})
