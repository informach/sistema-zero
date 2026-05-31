import { beforeEach, describe, expect, test } from 'bun:test'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import {
  IdempotencyConflictError,
  IdempotencyInFlightError,
} from '../../src/domain/payment/payment.errors'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  silentLogger,
} from '../fakes/in-memory'

describe('Idempotência (escopo por consumidor + estados)', () => {
  let repo: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let store: InMemoryIdempotencyStore
  let service: ProcessPaymentService

  const cmd: ProcessPaymentCommand = {
    consumerId: 'sys-a',
    idempotencyKey: 'shared-key-001',
    requestHash: 'hash-A',
    amountInCents: 1000,
    method: 'PIX',
  }

  beforeEach(() => {
    repo = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    store = new InMemoryIdempotencyStore()
    service = new ProcessPaymentService(
      repo,
      gateway,
      store,
      { pixKey: 'pix@loja.com', idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120, asyncChargeCreation: false },
      silentLogger,
    )
  })

  test('replay COMPLETED devolve a resposta cacheada sem recobrar', async () => {
    const first = await service.execute(cmd)
    const second = await service.execute(cmd)
    expect(second.id).toBe(first.id)
    expect(gateway.createdCount).toBe(1)
  })

  test('mesma chave + payload diferente → 409 conflito', async () => {
    await service.execute(cmd)
    await expect(service.execute({ ...cmd, requestHash: 'hash-B' })).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    )
  })

  test('reserva IN_FLIGHT em andamento → 409 in-flight', async () => {
    // Simula uma request anterior que reservou e ainda não concluiu.
    await store.reserve({ consumerId: 'sys-a', key: cmd.idempotencyKey, requestHash: 'hash-A', inFlightTtlSeconds: 120 })
    await expect(service.execute(cmd)).rejects.toBeInstanceOf(IdempotencyInFlightError)
    expect(gateway.createdCount).toBe(0)
  })

  test('reserva IN_FLIGHT expirada (crash) é reciclada → processa normalmente', async () => {
    await store.reserve({ consumerId: 'sys-a', key: cmd.idempotencyKey, requestHash: 'hash-A', inFlightTtlSeconds: 120 })
    store.clockSkewMs = 121_000 // avança além do TTL curto
    const view = await service.execute(cmd)
    expect(view.status).toBe('PENDING')
    expect(gateway.createdCount).toBe(1)
  })

  test('isolamento entre consumidores: mesma chave, consumidores diferentes não colidem', async () => {
    const a = await service.execute({ ...cmd, consumerId: 'sys-a' })
    const b = await service.execute({ ...cmd, consumerId: 'sys-b' }) // MESMA chave + payload
    expect(b.id).not.toBe(a.id) // pagamentos independentes
    expect(b.consumerId).toBe('sys-b')
    expect(gateway.createdCount).toBe(2) // ambos cobraram (sem vazar resposta de A p/ B)
  })
})
