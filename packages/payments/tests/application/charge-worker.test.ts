import { beforeEach, describe, expect, test } from 'bun:test'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import { ChargeCreationWorker } from '../../src/infrastructure/workers/charge-creation-worker'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  silentLogger,
} from '../fakes/in-memory'

describe('Modo assíncrono + ChargeCreationWorker', () => {
  let repo: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let asyncService: ProcessPaymentService

  const command: ProcessPaymentCommand = {
    consumerId: 'sys-a',
    idempotencyKey: 'idem-async-001',
    requestHash: 'hash-A',
    amountInCents: 1000,
    method: 'PIX',
  }

  beforeEach(() => {
    repo = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    asyncService = new ProcessPaymentService(
      repo,
      gateway,
      new InMemoryIdempotencyStore(),
      {
        pixKey: 'pix@loja.com',
        idempotencyTtlSeconds: 3600,
        idempotencyInFlightTtlSeconds: 120,
        asyncChargeCreation: true,
        boletoDefaultExpiresDays: 3,
      },
      silentLogger,
    )
  })

  test('POST assíncrono aceita SEM chamar a Efí (sem QR ainda)', async () => {
    const view = await asyncService.execute(command)

    expect(view.status).toBe('PENDING')
    expect(view.pix).toBeUndefined() // ainda não tem cobrança/QR
    expect(gateway.createdCount).toBe(0) // Efí não foi chamada na request
  })

  test('worker cria a cobrança depois (QR aparece) ', async () => {
    const view = await asyncService.execute(command)
    const worker = new ChargeCreationWorker(repo, gateway, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 5,
      pixKey: 'pix@loja.com',
    })

    await worker.tick()

    expect(gateway.createdCount).toBe(1)
    const updated = await repo.findById(view.id)
    expect(updated?.txid).not.toBeNull()
    expect(updated?.pixQrCode?.copiaECola).toContain('PIX-FAKE')
  })

  test('worker cria o boleto assíncrono depois (linha digitável aparece)', async () => {
    const boletoCmd: ProcessPaymentCommand = {
      consumerId: 'sys-a',
      idempotencyKey: 'idem-async-boleto',
      requestHash: 'hash-B',
      amountInCents: 5000,
      method: 'BOLETO',
      customer: {
        name: 'João da Silva',
        email: 'joao@example.com',
        document: '52998224725',
        phone: '11999998888',
        address: {
          street: 'Rua A',
          number: '100',
          neighborhood: 'Centro',
          zipcode: '01001000',
          city: 'São Paulo',
          state: 'SP',
        },
      },
    }
    const view = await asyncService.execute(boletoCmd)
    expect(view.boleto).toBeUndefined()

    const worker = new ChargeCreationWorker(repo, gateway, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 5,
      pixKey: 'pix@loja.com',
    })
    await worker.tick()

    expect(gateway.boletoCreatedCount).toBe(1)
    const updated = await repo.findById(view.id)
    expect(updated?.boleto?.digitableLine).toBeDefined()
  })

  test('após maxAttempts falhando, o pagamento vira FAILED', async () => {
    const view = await asyncService.execute(command)
    gateway.failCreate = true
    const worker = new ChargeCreationWorker(repo, gateway, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 2,
      pixKey: 'pix@loja.com',
      staleAfterMs: 0, // re-claim imediato entre ticks neste teste
    })

    await worker.tick() // attempt 1 — falha, continua PENDING
    expect((await repo.findById(view.id))?.status).toBe('PENDING')

    await worker.tick() // attempt 2 — atinge maxAttempts → FAILED
    expect((await repo.findById(view.id))?.status).toBe('FAILED')
  })

  test('lease: um claim recente NÃO é re-reivindicado dentro do staleAfterMs', async () => {
    await asyncService.execute(command)
    gateway.failCreate = true // falha → segue PENDING e claimado, mas não re-claimável
    const worker = new ChargeCreationWorker(repo, gateway, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 5,
      pixKey: 'pix@loja.com',
      staleAfterMs: 60_000, // lease longo
    })

    await worker.tick() // claim 1 (falha)
    await worker.tick() // dentro do lease → NÃO re-reivindica
    await worker.tick()

    // Apenas a primeira tentativa ocorreu — o lease impediu re-claim em dobro.
    expect(gateway.createCalls).toBe(1)
  })
})
