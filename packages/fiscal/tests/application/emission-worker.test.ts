import { describe, expect, test } from 'bun:test'
import { EmitInvoiceService } from '../../src/application/emit-invoice/emit-invoice.service'
import {
  buildDpsId,
  type EmitterProfile,
  INFORMACH_BASE,
} from '../../src/domain/dps/emitter-profile'
import type { ScheduleInvoiceInput } from '../../src/domain/ports/invoice-repository.port'
import { EmissionWorker } from '../../src/infrastructure/workers/emission-worker'
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

function build(opts: { staleMs?: number } = {}) {
  const invoices = new InMemoryInvoiceRepository()
  const payments = new FakePaymentsClient()
  const sefin = new ScriptedSefinGateway()
  const service = new EmitInvoiceService(
    invoices,
    payments,
    sefin,
    new ScriptedDanfseClient(),
    new RecordingMessagingClient(),
    {
      serie: '2',
      maxAttempts: 10,
      buildDpsId: (serie, numero) => buildDpsId(profile, serie, numero),
      selfUrl: 'http://fiscal.test:3009',
    },
    silentLogger,
  )
  const worker = new EmissionWorker(invoices, service, silentLogger, {
    intervalMs: 30_000,
    batchSize: 10,
    staleMs: opts.staleMs ?? 0,
    maxAttempts: 10,
  })
  return { invoices, payments, sefin, service, worker }
}

function due(
  paymentId: string,
  overrides: Partial<ScheduleInvoiceInput> = {},
): ScheduleInvoiceInput {
  return {
    paymentId,
    customer: { name: 'Maria', email: 'm@m.com', document: '52998224725' },
    amountInCents: 3700n,
    serviceDescription: 'No Comando da IA',
    offerId: null,
    guaranteeDays: 7,
    paidAt: new Date('2026-06-01T12:00:00Z'),
    scheduledFor: new Date(Date.now() - 1000),
    ambiente: 'producao-restrita',
    ...overrides,
  }
}

describe('EmissionWorker', () => {
  test('um tick emite todas as notas vencidas e renova o lease (touchClaim) por item', async () => {
    const { invoices, payments, worker } = build()
    payments.set(paidSnapshot({ id: 'pay-1' }))
    payments.set(paidSnapshot({ id: 'pay-2' }))
    payments.set(paidSnapshot({ id: 'pay-3' }))
    const a = await invoices.schedule(due('pay-1'))
    const b = await invoices.schedule(due('pay-2'))
    const c = await invoices.schedule(due('pay-3'))

    await worker.tick()

    for (const id of [a.id, b.id, c.id]) {
      expect((await invoices.findById(id))?.status).toBe('EMITTED')
      expect(invoices.touched).toContain(id) // lease renovado por nota (fix M2)
    }
  })

  test('uma nota que explode no meio NÃO envenena o lote (try/catch do tick)', async () => {
    const { invoices, payments, sefin, worker } = build()
    payments.set(paidSnapshot({ id: 'pay-1' }))
    payments.set(paidSnapshot({ id: 'pay-2' }))
    const a = await invoices.schedule(due('pay-1'))
    const b = await invoices.schedule(due('pay-2'))
    // 1ª emissão lança erro inesperado; a 2ª deve seguir.
    let first = true
    const original = sefin.emitDps.bind(sefin)
    sefin.emitDps = async (input) => {
      if (first) {
        first = false
        throw new Error('boom inesperado')
      }
      return original(input)
    }

    await worker.tick()

    const statuses = [
      (await invoices.findById(a.id))?.status,
      (await invoices.findById(b.id))?.status,
    ]
    expect(statuses).toContain('EMITTED') // pelo menos a 2ª emitiu
  })

  test('coletor: nota presa SCHEDULED com attempts > maxAttempts vira FAILED (fix do stuck)', async () => {
    const { invoices, worker } = build()
    const stuck = await invoices.schedule(due('pay-1'))
    Object.assign(stuck, { attempts: 11 }) // acima de maxAttempts=10, claim nunca pegaria

    await worker.tick()

    const after = await invoices.findById(stuck.id)
    expect(after?.status).toBe('FAILED')
    expect(after?.lastError).toContain('esgotadas')
  })

  test('coletor respeita lease vivo: tentativa final em andamento NÃO vira FAILED por outra réplica', async () => {
    const { invoices, worker } = build({ staleMs: 120_000 })
    const inFlight = await invoices.schedule(due('pay-1'))
    Object.assign(inFlight, { attempts: 11, claimedAt: new Date() })

    await worker.tick()

    expect((await invoices.findById(inFlight.id))?.status).toBe('SCHEDULED')

    Object.assign(inFlight, { claimedAt: new Date(Date.now() - 121_000) })
    await worker.tick()

    expect((await invoices.findById(inFlight.id))?.status).toBe('FAILED')
  })
})

describe('claimDueForEmission — fidelidade do fake', () => {
  test('ordena por scheduledFor antes do batchSize (oldest-due-first)', async () => {
    const invoices = new InMemoryInvoiceRepository()
    const novo = await invoices.schedule(
      due('pay-new', { scheduledFor: new Date(Date.now() - 1000) }),
    )
    const velho = await invoices.schedule(
      due('pay-old', { scheduledFor: new Date(Date.now() - 99_000) }),
    )

    const [claimed] = await invoices.claimDueForEmission({
      batchSize: 1,
      staleMs: 0,
      maxAttempts: 10,
    })
    expect(claimed?.id).toBe(velho.id) // a mais antiga primeiro, não a ordem de inserção
    expect(novo.id).not.toBe(velho.id)
  })

  test('attempts > maxAttempts NÃO é reivindicada (cutoff do claim)', async () => {
    const invoices = new InMemoryInvoiceRepository()
    const inv = await invoices.schedule(due('pay-1'))
    Object.assign(inv, { attempts: 11 })

    const claimed = await invoices.claimDueForEmission({
      batchSize: 10,
      staleMs: 0,
      maxAttempts: 10,
    })
    expect(claimed).toHaveLength(0)
  })

  test('claim antigo não consegue renovar o lease reassumido por outra réplica', async () => {
    const invoices = new InMemoryInvoiceRepository()
    const inv = await invoices.schedule(due('pay-1'))
    const [first] = await invoices.claimDueForEmission({
      batchSize: 1,
      staleMs: 0,
      maxAttempts: 10,
    })
    const firstToken = first?.claimToken
    Object.assign(inv, { claimedAt: new Date(Date.now() - 1_000) })
    const [second] = await invoices.claimDueForEmission({
      batchSize: 1,
      staleMs: 0,
      maxAttempts: 10,
    })

    expect(firstToken).toBeString()
    expect(second?.claimToken).toBeString()
    expect(firstToken).not.toBe(second?.claimToken)
    if (!firstToken) throw new Error('primeiro claim sem token')
    expect(await invoices.touchClaim(inv.id, firstToken)).toBe(false)
  })

  test('transições bumpam version (contrato de auditoria)', async () => {
    const invoices = new InMemoryInvoiceRepository()
    const inv = await invoices.schedule(due('pay-1'))
    expect(inv.version).toBe(0)
    await invoices.markFailed(inv.id, 'erro')
    expect((await invoices.findById(inv.id))?.version).toBe(1)
  })
})
