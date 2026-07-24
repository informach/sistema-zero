import { describe, expect, test } from 'bun:test'
import { EmitInvoiceService } from '../../src/application/emit-invoice/emit-invoice.service'
import {
  buildDpsId,
  type EmitterProfile,
  INFORMACH_BASE,
} from '../../src/domain/dps/emitter-profile'
import { createNullMessagingClient } from '../../src/infrastructure/messaging/gateway-messaging-client'
import { CancellationWorker } from '../../src/infrastructure/workers/cancellation-worker'
import { DeliveryWorker } from '../../src/infrastructure/workers/delivery-worker'
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

    await service.execute(invoice, invoice.claimToken!)

    expect(messaging.sent).toHaveLength(1)
    const sent = messaging.sent[0]!
    expect(sent.idempotencyKey).toBe(`nfse-${invoice.id}`)
    expect(sent.recipient).toEqual({ name: 'Maria', email: 'maria@example.com' })
    expect(sent.variables.valor).toBe('R$ 1.234,56')
    expect(sent.variables.chave).toBe('1'.repeat(50))
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

    await service.execute(invoice, invoice.claimToken!)

    expect((await invoices.findById(invoice.id))?.status).toBe('EMITTED')
    expect(messaging.sent).toHaveLength(0)
  })

  test('messaging falhou → emissão NÃO reverte (best-effort), emailSentAt fica nulo', async () => {
    const { invoices, payments, messaging, service } = build()
    payments.set(paidSnapshot())
    messaging.failWith = new Error('gateway 503')
    const invoice = await claimed(invoices)

    await service.execute(invoice, invoice.claimToken!)

    const after = await invoices.findById(invoice.id)
    expect(after?.status).toBe('EMITTED')
    expect(after?.emailSentAt).toBeNull()
  })

  test('DeliveryWorker recupera DANFSe/e-mail pendentes sem reemitir a nota', async () => {
    const { invoices, payments, danfse, messaging, sefin, service } = build()
    payments.set(paidSnapshot())
    danfse.failWith = new Error('DANFSe fora do ar')
    const invoice = await claimed(invoices)

    await service.execute(invoice, invoice.claimToken!)
    const afterEmission = await invoices.findById(invoice.id)
    expect(afterEmission?.status).toBe('EMITTED')
    expect(invoices.pdfs.has(invoice.id)).toBe(false)
    expect(messaging.sent).toHaveLength(0)
    expect(sefin.emitted).toHaveLength(1)

    danfse.failWith = null
    Object.assign(afterEmission!, { nextAttemptAt: null, claimedAt: null })
    const worker = new DeliveryWorker(invoices, service, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
      retryDelayMs: 60_000,
      deliverEmail: true,
    })

    await worker.tick()

    const afterRetry = await invoices.findById(invoice.id)
    expect(invoices.pdfs.has(invoice.id)).toBe(true)
    expect(messaging.sent).toHaveLength(1)
    expect(afterRetry?.emailSentAt).not.toBeNull()
    expect(sefin.emitted).toHaveLength(1) // não reemite DPS
  })

  test('DeliveryWorker reenvia e-mail pendente quando o PDF já está armazenado', async () => {
    const { invoices, payments, messaging, service } = build()
    payments.set(paidSnapshot())
    messaging.failWith = new Error('gateway 503')
    const invoice = await claimed(invoices)

    await service.execute(invoice, invoice.claimToken!)
    const afterEmission = await invoices.findById(invoice.id)
    expect(invoices.pdfs.has(invoice.id)).toBe(true)
    expect(afterEmission?.emailSentAt).toBeNull()

    messaging.failWith = null
    Object.assign(afterEmission!, { nextAttemptAt: null, claimedAt: null })
    const worker = new DeliveryWorker(invoices, service, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
      retryDelayMs: 60_000,
      deliverEmail: true,
    })

    await worker.tick()

    expect(messaging.sent).toHaveLength(1)
    expect((await invoices.findById(invoice.id))?.emailSentAt).not.toBeNull()
  })

  test('DeliveryWorker sem messaging não reivindica nota que só aguarda e-mail', async () => {
    const { invoices, payments, sefin, danfse } = build()
    const service = new EmitInvoiceService(
      invoices,
      payments,
      sefin,
      danfse,
      createNullMessagingClient(),
      {
        serie: '2',
        maxAttempts: 10,
        buildDpsId: (serie, numero) => buildDpsId(profile, serie, numero),
        selfUrl: 'http://fiscal.test:3009',
      },
      silentLogger,
    )
    payments.set(paidSnapshot())
    const invoice = await claimed(invoices)
    await service.execute(invoice, invoice.claimToken!)
    expect((await invoices.findById(invoice.id))?.pdfStoredAt).not.toBeNull()
    expect((await invoices.findById(invoice.id))?.emailSentAt).toBeNull()
    invoices.touched = []

    const worker = new DeliveryWorker(invoices, service, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
      retryDelayMs: 60_000,
      deliverEmail: false,
    })
    await worker.tick()

    expect(invoices.touched).toEqual([])
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

    // Chaves DISTINTAS p/ provar a LIGAÇÃO por nota (não só o conjunto {2,9}):
    // cMotivo 2 = "Serviço não Prestado" (dinheiro voltou) vs 9 = "Outros" (admin).
    const byRefund = await emittedInvoice(invoices)
    Object.assign(byRefund, { accessKey: '1'.repeat(50) })
    await invoices.requestCancel(
      byRefund.id,
      'system:refund',
      'Pagamento reembolsado ao consumidor',
    )
    const byAdmin = await emittedInvoice(invoices)
    Object.assign(byAdmin, { accessKey: '8'.repeat(50) })
    await invoices.requestCancel(byAdmin.id, 'admin:u-1', 'Dados cadastrais corrigidos na nota')

    await worker.tick()

    expect((await invoices.findById(byRefund.id))?.status).toBe('CANCELLED')
    expect((await invoices.findById(byAdmin.id))?.status).toBe('CANCELLED')
    const refundCancel = sefin.cancelled.find((c) => c.accessKey === '1'.repeat(50))
    const adminCancel = sefin.cancelled.find((c) => c.accessKey === '8'.repeat(50))
    expect(refundCancel?.cMotivo).toBe('2') // estorno → 2
    expect(adminCancel?.cMotivo).toBe('9') // admin → 9
  })

  test('xMotivo curto é normalizado p/ ≥15 chars (TSMotivo) antes de ir à Sefin', async () => {
    const { invoices } = build()
    const sefin = new ScriptedSefinGateway()
    const worker = new CancellationWorker(invoices, sefin, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
    })
    const invoice = await emittedInvoice(invoices)
    // Dado legado curto (a borda do admin já valida 15-255, mas o worker é defensivo).
    Object.assign(invoice, {
      status: 'CANCEL_PENDING',
      cancelReason: 'erro',
      cancelRequestedBy: 'admin:u-1',
    })

    await worker.tick()

    expect(sefin.cancelled[0]?.xMotivo.length).toBeGreaterThanOrEqual(15)
  })

  test('rejeição determinística da Sefin → CANCEL_FAILED e não é reenviada automaticamente', async () => {
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

    expect((await invoices.findById(invoice.id))?.status).toBe('CANCEL_FAILED')
    expect(invoices.events.some((e) => e.type === 'CANCEL_FAILED')).toBe(true)

    await worker.tick()
    expect(sefin.cancelled).toHaveLength(1)
  })

  test('rejeição de cancelamento redige CPF antes de persistir a auditoria', async () => {
    const { invoices } = build()
    const sefin = new ScriptedSefinGateway()
    sefin.nextCancelResults.push({
      kind: 'rejected',
      errors: [{ code: 'E0207', message: 'CPF 52998224725 não encontrado' }],
    })
    const worker = new CancellationWorker(invoices, sefin, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
    })
    const invoice = await emittedInvoice(invoices)
    await invoices.requestCancel(invoice.id, 'admin:u-1', 'Dados cadastrais incorretos')

    await worker.tick()

    expect((await invoices.findById(invoice.id))?.lastError).not.toContain('52998224725')
    const event = invoices.events.find((e) => e.type === 'CANCEL_FAILED')
    expect(JSON.stringify(event?.detail)).not.toContain('52998224725')
  })

  test('rejeição de cancelamento também redige CPF formatado e e-mail', async () => {
    const { invoices } = build()
    const sefin = new ScriptedSefinGateway()
    sefin.nextCancelResults.push({
      kind: 'rejected',
      errors: [
        { code: 'E0207', message: 'CPF 529.982.247-25 de maria@example.com não encontrado' },
      ],
    })
    const worker = new CancellationWorker(invoices, sefin, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
    })
    const invoice = await emittedInvoice(invoices)
    await invoices.requestCancel(invoice.id, 'admin:u-1', 'Dados cadastrais incorretos')

    await worker.tick()

    const persisted = await invoices.findById(invoice.id)
    const event = invoices.events.find((e) => e.type === 'CANCEL_FAILED')
    expect(persisted?.lastError).not.toContain('529.982.247-25')
    expect(persisted?.lastError).not.toContain('maria@example.com')
    expect(JSON.stringify(event?.detail)).not.toContain('529.982.247-25')
    expect(JSON.stringify(event?.detail)).not.toContain('maria@example.com')
  })

  test('não cria evento CANCELLED quando perde a transição guardada', async () => {
    class LostCancellationTransitionRepository extends InMemoryInvoiceRepository {
      override async markCancelled(): Promise<boolean> {
        return false
      }
    }

    const invoices = new LostCancellationTransitionRepository()
    const sefin = new ScriptedSefinGateway()
    const worker = new CancellationWorker(invoices, sefin, silentLogger, {
      intervalMs: 60_000,
      batchSize: 10,
      staleMs: 0,
    })
    const invoice = await emittedInvoice(invoices)
    await invoices.requestCancel(invoice.id, 'admin:u-1', 'Dados cadastrais incorretos')

    await worker.tick()

    expect(invoices.events.some((event) => event.type === 'CANCELLED')).toBe(false)
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
