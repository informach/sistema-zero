import { beforeEach, describe, expect, test } from 'bun:test'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import {
  IdempotencyConflictError,
  UnsupportedPaymentMethodError,
} from '../../src/domain/payment/payment.errors'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  silentLogger,
} from '../fakes/in-memory'

describe('ProcessPaymentService (Pix)', () => {
  let repo: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let idempotency: InMemoryIdempotencyStore
  let service: ProcessPaymentService

  const baseCommand: ProcessPaymentCommand = {
    consumerId: 'sys-a',
    idempotencyKey: 'idem-12345678',
    requestHash: 'hash-A',
    amountInCents: 1000,
    method: 'PIX',
    description: 'Pedido #1',
    metadata: { orderId: 'order-1' },
  }

  beforeEach(() => {
    repo = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    idempotency = new InMemoryIdempotencyStore()
    service = new ProcessPaymentService(
      repo,
      gateway,
      idempotency,
      {
        pixKey: 'pix@loja.com',
        idempotencyTtlSeconds: 3600,
        idempotencyInFlightTtlSeconds: 120,
        asyncChargeCreation: false,
      },
      silentLogger,
    )
  })

  test('cria a cobrança Pix, persiste e emite evento', async () => {
    const view = await service.execute(baseCommand)

    expect(view.status).toBe('PENDING')
    expect(view.method).toBe('PIX')
    expect(view.amountInCents).toBe('1000')
    expect(view.pix?.copiaECola).toContain('PIX-FAKE')
    expect(repo.byId.size).toBe(1)
    expect(repo.outbox.some((e) => e.eventName === 'payment.created')).toBe(true)
  })

  test('é idempotente: mesma chave+payload não cobra de novo', async () => {
    const first = await service.execute(baseCommand)
    const second = await service.execute(baseCommand)

    expect(second.id).toBe(first.id)
    expect(gateway.createdCount).toBe(1)
  })

  test('mesma chave com payload diferente → conflito', async () => {
    await service.execute(baseCommand)
    await expect(
      service.execute({ ...baseCommand, requestHash: 'hash-DIFERENTE' }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError)
  })

  test('método ainda não suportado libera a reserva de idempotência', async () => {
    await expect(service.execute({ ...baseCommand, method: 'BOLETO' })).rejects.toBeInstanceOf(
      UnsupportedPaymentMethodError,
    )

    // Reserva liberada → uma nova tentativa (corrigida) não fica presa em conflito.
    const retry = await service.execute({ ...baseCommand, method: 'PIX' })
    expect(retry.status).toBe('PENDING')
  })
})
