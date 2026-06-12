import { describe, expect, test } from 'bun:test'
import { EmitInvoiceService } from '../../src/application/emit-invoice/emit-invoice.service'
import {
  buildDpsId,
  type EmitterProfile,
  INFORMACH_BASE,
} from '../../src/domain/dps/emitter-profile'
import { SkipReason } from '../../src/domain/invoice/invoice.status'
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

function build(opts: { maxAttempts?: number } = {}) {
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
      maxAttempts: opts.maxAttempts ?? 10,
      buildDpsId: (serie, numero) => buildDpsId(profile, serie, numero),
      selfUrl: 'http://fiscal.test:3009',
    },
    silentLogger,
  )
  return { invoices, payments, sefin, danfse, messaging, service }
}

async function scheduledInvoice(invoices: InMemoryInvoiceRepository, paymentId = 'pay-1') {
  const invoice = await invoices.schedule({
    paymentId,
    customer: { name: 'Maria', email: 'maria@example.com', document: '52998224725' },
    amountInCents: 3700n,
    serviceDescription: 'No Comando da IA',
    offerId: 'offer-1',
    guaranteeDays: 7,
    paidAt: new Date('2026-06-01T12:00:00Z'),
    scheduledFor: new Date(Date.now() - 1000),
    ambiente: 'producao-restrita',
  })
  // Simula o claim do worker (attempts++).
  const [claimed] = await invoices.claimDueForEmission({
    batchSize: 10,
    staleMs: 0,
    maxAttempts: 10,
  })
  return claimed ?? invoice
}

describe('emissão', () => {
  test('caminho feliz: re-verifica, aloca número, emite, EMITTED + PDF + pdfToken', async () => {
    const { invoices, payments, sefin, service } = build()
    payments.set(paidSnapshot())
    const invoice = await scheduledInvoice(invoices)

    await service.execute(invoice)

    const after = await invoices.findById(invoice.id)
    expect(after?.status).toBe('EMITTED')
    expect(after?.accessKey).toBe('1'.repeat(50))
    expect(after?.dpsNumber).toBe(1n)
    expect(after?.pdfToken).toMatch(/^[0-9a-f]{64}$/)
    expect(after?.competenceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(invoices.pdfs.has(invoice.id)).toBe(true)
    expect(sefin.emitted[0]?.dpsId).toBe(
      `DPS3106200243588758000103000020000000000000${'01'.padStart(2, '0')}`.slice(0, 45),
    )
  })

  test('re-verificação: pagamento estornado no meio tempo → SKIPPED sem chamar a Sefin', async () => {
    const { invoices, payments, sefin, service } = build()
    payments.set(paidSnapshot({ status: 'REFUNDED', refundedAt: new Date() }))
    const invoice = await scheduledInvoice(invoices)

    await service.execute(invoice)

    expect((await invoices.findById(invoice.id))?.status).toBe('SKIPPED')
    expect(sefin.emitted).toHaveLength(0)
  })

  test('re-verificação fail-closed: payments fora do ar → backoff, NÃO emite', async () => {
    const { invoices, payments, sefin, service } = build()
    payments.failWith = new Error('ECONNREFUSED')
    const invoice = await scheduledInvoice(invoices)

    await service.execute(invoice)

    const after = await invoices.findById(invoice.id)
    expect(after?.status).toBe('SCHEDULED')
    expect(after?.nextAttemptAt).not.toBeNull()
    expect(sefin.emitted).toHaveLength(0)
  })

  test('retry REUSA o número alocado (nunca aloca um segundo)', async () => {
    const { invoices, payments, sefin, service } = build()
    payments.set(paidSnapshot())
    sefin.emitError = new Error('rede caiu')
    const invoice = await scheduledInvoice(invoices)

    await service.execute(invoice)
    const after1 = await invoices.findById(invoice.id)
    expect(after1?.status).toBe('SCHEDULED')
    expect(after1?.dpsNumber).toBe(1n)

    // Segunda tentativa com a Sefin de volta:
    sefin.emitError = null
    Object.assign(after1!, { nextAttemptAt: null, claimedAt: null })
    const [claimed] = await invoices.claimDueForEmission({
      batchSize: 10,
      staleMs: 0,
      maxAttempts: 10,
    })
    await service.execute(claimed!)

    const after2 = await invoices.findById(invoice.id)
    expect(after2?.status).toBe('EMITTED')
    expect(after2?.dpsNumber).toBe(1n) // mesmo número — sem nota dobrada
  })

  test('rejeição determinística da Sefin → FAILED direto com os códigos', async () => {
    const { invoices, payments, sefin, service } = build()
    payments.set(paidSnapshot())
    sefin.nextResults.push({
      kind: 'rejected',
      errors: [{ code: 'E0207', message: 'CPF do tomador não encontrado' }],
      dpsXml: '<DPS/>',
    })
    const invoice = await scheduledInvoice(invoices)

    await service.execute(invoice)

    const after = await invoices.findById(invoice.id)
    expect(after?.status).toBe('FAILED')
    expect(after?.lastError).toContain('E0207')
  })

  test('estorno corre com a emissão: nota REAL vira CANCEL_PENDING com a chave (não some)', async () => {
    const { invoices, payments, sefin, service } = build()
    payments.set(paidSnapshot())
    const invoice = await scheduledInvoice(invoices)
    // O refund chega DURANTE a chamada à Sefin (entre o claim e o markEmitted):
    // a NFS-e é autorizada, mas o status já é SKIPPED quando vamos gravar.
    sefin.onEmit = async () => {
      await invoices.skip(invoice.id, SkipReason.REFUNDED_BEFORE_EMISSION)
    }

    await service.execute(invoice)

    const after = await invoices.findById(invoice.id)
    expect(after?.status).toBe('CANCEL_PENDING') // será cancelada, não perdida
    expect(after?.accessKey).toBe('1'.repeat(50)) // a chave REAL foi preservada
    expect(after?.cancelRequestedBy).toBe('system:refund') // cMotivo 2 no worker
  })

  test('duplicate (re-POST pós-timeout) → recupera pela consulta, EMITTED sem nota dobrada', async () => {
    const { invoices, payments, sefin, service } = build()
    payments.set(paidSnapshot())
    sefin.nextResults.push({ kind: 'duplicate', dpsXml: '<DPS/>' })
    sefin.lookupResult = { accessKey: '9'.repeat(50) }
    const invoice = await scheduledInvoice(invoices)

    await service.execute(invoice)

    const after = await invoices.findById(invoice.id)
    expect(after?.status).toBe('EMITTED')
    expect(after?.accessKey).toBe('9'.repeat(50))
  })

  test('tentativas esgotadas → FAILED', async () => {
    const { invoices, payments, sefin, service } = build({ maxAttempts: 1 })
    payments.set(paidSnapshot())
    sefin.emitError = new Error('rede')
    const invoice = await scheduledInvoice(invoices)
    invoice.attempts = 2 // acima do teto

    await service.execute(invoice)

    expect((await invoices.findById(invoice.id))?.status).toBe('FAILED')
  })

  test('falha ao baixar o DANFSe NÃO falha a emissão', async () => {
    const { invoices, payments, danfse, service } = build()
    payments.set(paidSnapshot())
    danfse.failWith = new Error('DANFSe mudou em jul/2026')
    const invoice = await scheduledInvoice(invoices)

    await service.execute(invoice)

    expect((await invoices.findById(invoice.id))?.status).toBe('EMITTED')
    expect(invoices.pdfs.has(invoice.id)).toBe(false)
  })

  test('nota substituta emitida → original vira SUBSTITUTED', async () => {
    const { invoices, payments, service } = build()
    payments.set(paidSnapshot())
    // original EMITTED
    const original = await invoices.schedule({
      paymentId: 'pay-0',
      customer: { name: 'X', email: 'x@x.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso',
      offerId: null,
      guaranteeDays: null,
      paidAt: new Date(),
      scheduledFor: new Date(),
      ambiente: 'producao-restrita',
    })
    Object.assign(original, { status: 'EMITTED', emittedAt: new Date(), accessKey: '5'.repeat(50) })

    const substitute = await invoices.schedule({
      paymentId: 'pay-1',
      customer: { name: 'Maria', email: 'm@m.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso (corrigido)',
      offerId: null,
      guaranteeDays: null,
      paidAt: new Date(),
      scheduledFor: new Date(Date.now() - 1000),
      ambiente: 'producao-restrita',
      substitutesId: original.id,
    })
    const [claimed] = await invoices.claimDueForEmission({
      batchSize: 10,
      staleMs: 0,
      maxAttempts: 10,
    })
    await service.execute(claimed ?? substitute)

    expect((await invoices.findById(original.id))?.status).toBe('SUBSTITUTED')
    expect((await invoices.findById(original.id))?.substitutedById).toBe(substitute.id)
  })
})

describe('buildDpsId', () => {
  test('45 posições: DPS + cMun(7) + tpInscr(1) + inscrição(14) + série(5) + número(15)', () => {
    const id = buildDpsId(profile, '2', 1n)
    expect(id).toHaveLength(45)
    expect(id).toBe('DPS310620024358875800010300002000000000000001')
  })
})
