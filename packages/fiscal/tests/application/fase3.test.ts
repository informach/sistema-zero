import { describe, expect, test } from 'bun:test'
import { EmitInvoiceService } from '../../src/application/emit-invoice/emit-invoice.service'
import {
  buildDpsId,
  type EmitterProfile,
  INFORMACH_BASE,
} from '../../src/domain/dps/emitter-profile'
import { CancellationWorker } from '../../src/infrastructure/workers/cancellation-worker'
import {
  FakePaymentsClient,
  InMemoryInvoiceRepository,
  paidSnapshot,
  RecordingMessagingClient,
  ScriptedDanfseClient,
  ScriptedSefinGateway,
  silentLogger,
} from '../fakes/in-memory'

const profile: EmitterProfile = {
  ...INFORMACH_BASE,
  tpAmb: '2',
  im: '13372670018',
  serie: '2',
  cTribMun: '001',
  pTotTribSN: '8.24',
}

function build() {
  const invoices = new InMemoryInvoiceRepository()
  const payments = new FakePaymentsClient()
  const sefin = new ScriptedSefinGateway()
  const danfse = new ScriptedDanfseClient()
  const messaging = new RecordingMessagingClient()
  const service = new EmitInvoiceService(
    invoices,
    payments,
    sefin,
    danfse,
    messaging,
    {
      serie: '2',
      maxAttempts: 10,
      buildDpsId: (serie, numero) => buildDpsId(profile, serie, numero),
      selfUrl: 'http://fiscal.test:3009',
    },
    silentLogger,
  )
  return { invoices, payments, sefin, danfse, messaging, service }
}

async function claimed(invoices: InMemoryInvoiceRepository) {
  await invoices.schedule({
    paymentId: 'pay-1', // casa com o paidSnapshot() do FakePaymentsClient
    customer: { name: 'Maria', email: 'maria@example.com', document: '52998224725' },
    amountInCents: 123456n,
    serviceDescription: 'No Comando da IA',
    offerId: null,
    guaranteeDays: 7,
    paidAt: new Date(),
    scheduledFor: new Date(Date.now() - 1000),
    ambiente: 'producao-restrita',
  })
  const [inv] = await invoices.claimDueForEmission({ batchSize: 10, staleMs: 0, maxAttempts: 10 })
  return inv!
}

describe('e-mail da nota (pós-emissão, best-effort)', () => {
  test('emitiu + PDF ok → e-mail com anexo capability-URL, valor formatado e dedupe nfse-<id>', async () => {
    const { invoices, payments, messaging, service } = build()
    payments.set(paidSnapshot())
    const invoice = await claimed(invoices)

    await service.execute(invoice)

    expect(messaging.sent).toHaveLength(1)
    const sent = messaging.sent[0]!
    expect(sent.idempotencyKey).toBe(`nfse-${invoice.id}`)
    expect(sent.recipient).toEqual({ name: 'Maria', email: 'maria@example.com' })
    expect(sent.variables['valor']).toBe('R$ 1.234,56')
    expect(sent.variables['chave']).toBe('1'.repeat(50))
    const after = await invoices.findById(invoice.id)
    expect((sent as unknown as { attachments: Array<{ url: string }> }).attachments[0]?.url).toBe(
      `http://fiscal.test:3009/fiscal/files/${after?.pdfToken}.pdf`,
    )
    expect(after?.emailSentAt).not.toBeNull()
  })

  test('PDF falhou → NÃO envia e-mail (anexo seria 404); emissão segue EMITTED', async () => {
    const { invoices, payments, danfse, messaging, service } = build()
    payments.set(paidSnapshot())
    danfse.failWith = new Error('DANFSe fora do ar')
    const invoice = await claimed(invoices)

    await service.execute(invoice)

    expect((await invoices.findById(invoice.id))?.status).toBe('EMITTED')
    expect(messaging.sent).toHaveLength(0)
  })

  test('messaging falhou → emissão NÃO reverte (best-effort), emailSentAt fica nulo', async () => {
    const { invoices, payments, messaging, service } = build()
    payments.set(paidSnapshot())
    messaging.failWith = new Error('gateway 503')
    const invoice = await claimed(invoices)

    await service.execute(invoice)

    const after = await invoices.findById(invoice.id)
    expect(after?.status).toBe('EMITTED')
    expect(after?.emailSentAt).toBeNull()
  })
})

describe('CancellationWorker', () => {
  async function emittedInvoice(invoices: InMemoryInvoiceRepository) {
    const invoice = await invoices.schedule({
      paymentId: crypto.randomUUID(),
      customer: { name: 'M', email: 'm@m.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso',
      offerId: null,
      guaranteeDays: 7,
      paidAt: new Date(),
      scheduledFor: new Date(),
      ambiente: 'producao-restrita',
    })
    Object.assign(invoice, { status: 'EMITTED', emittedAt: new Date(), accessKey: '4'.repeat(50) })
    return invoice
  }

  test('estorno automático cancela com motivo 2; admin com motivo 9 → CANCELLED', async () => {
    const { invoices } = build()
    const sefin = new ScriptedSefinGateway()
    const worker = new CancellationWorker(invoices, sefin, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
    })

    const byRefund = await emittedInvoice(invoices)
    await invoices.requestCancel(byRefund.id, 'system:refund', 'Pagamento reembolsado')
    const byAdmin = await emittedInvoice(invoices)
    await invoices.requestCancel(byAdmin.id, 'admin:u-1', 'Dados errados')

    await worker.tick()

    expect((await invoices.findById(byRefund.id))?.status).toBe('CANCELLED')
    expect((await invoices.findById(byAdmin.id))?.status).toBe('CANCELLED')
    expect(sefin.cancelled.map((c) => c.cMotivo).sort()).toEqual(['2', '9'])
  })

  test('rejeição da Sefin → permanece CANCEL_PENDING (visível) com evento CANCEL_FAILED', async () => {
    const { invoices } = build()
    const sefin = new ScriptedSefinGateway()
    sefin.nextCancelResults.push({
      kind: 'rejected',
      errors: [{ code: 'E9999', message: 'prazo expirado' }],
    })
    const worker = new CancellationWorker(invoices, sefin, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
    })

    const invoice = await emittedInvoice(invoices)
    await invoices.requestCancel(invoice.id, 'admin:u-1', 'Motivo')
    await worker.tick()

    expect((await invoices.findById(invoice.id))?.status).toBe('CANCEL_PENDING')
    expect(invoices.events.some((e) => e.type === 'CANCEL_FAILED')).toBe(true)
  })

  test('erro de rede → permanece CANCEL_PENDING e re-tenta no próximo ciclo (lease)', async () => {
    const { invoices } = build()
    const sefin = new ScriptedSefinGateway()
    sefin.cancelError = new Error('rede caiu') // consumido na 1ª chamada
    const worker = new CancellationWorker(invoices, sefin, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0, // lease imediato p/ o teste
    })

    const invoice = await emittedInvoice(invoices)
    await invoices.requestCancel(invoice.id, 'system:refund', 'Estorno')
    await worker.tick()
    expect((await invoices.findById(invoice.id))?.status).toBe('CANCEL_PENDING')
    await worker.tick()
    expect((await invoices.findById(invoice.id))?.status).toBe('CANCELLED')
  })
})
