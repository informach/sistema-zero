import { beforeEach, describe, expect, test } from 'bun:test'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import {
  BoletoDataIncompleteError,
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
        boletoDefaultExpiresDays: 3,
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

  test('método ainda não suportado (cartão) libera a reserva de idempotência', async () => {
    const card = { token: 'tok-1', brand: 'visa', last4: '4242', installments: 1 }
    await expect(
      service.execute({ ...baseCommand, method: 'CREDIT_CARD', card }),
    ).rejects.toBeInstanceOf(UnsupportedPaymentMethodError)

    // Reserva liberada → uma nova tentativa (corrigida) não fica presa em conflito.
    const retry = await service.execute({ ...baseCommand, method: 'PIX' })
    expect(retry.status).toBe('PENDING')
  })
})

describe('ProcessPaymentService (Boleto)', () => {
  let repo: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let idempotency: InMemoryIdempotencyStore
  let service: ProcessPaymentService

  const baseBoleto: ProcessPaymentCommand = {
    consumerId: 'sys-a',
    idempotencyKey: 'idem-boleto-001',
    requestHash: 'hash-B',
    amountInCents: 5000,
    method: 'BOLETO',
    customer: {
      name: 'João da Silva',
      email: 'joao@example.com',
      document: '52998224725', // CPF válido (529.982.247-25)
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

  const buildService = (asyncChargeCreation: boolean) =>
    new ProcessPaymentService(
      repo,
      gateway,
      idempotency,
      {
        pixKey: 'pix@loja.com',
        idempotencyTtlSeconds: 3600,
        idempotencyInFlightTtlSeconds: 120,
        asyncChargeCreation,
        boletoDefaultExpiresDays: 3,
      },
      silentLogger,
    )

  beforeEach(() => {
    repo = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    idempotency = new InMemoryIdempotencyStore()
    service = buildService(false)
  })

  test('cria a cobrança de boleto, persiste e emite evento', async () => {
    const view = await service.execute(baseBoleto)

    expect(view.status).toBe('PENDING')
    expect(view.method).toBe('BOLETO')
    expect(view.boleto?.digitableLine).toBeDefined()
    expect(view.boleto?.pdfUrl).toContain('boleto')
    expect(view.pix).toBeUndefined()
    expect(gateway.boletoCreatedCount).toBe(1)
    expect(repo.outbox.some((e) => e.eventName === 'payment.created')).toBe(true)
  })

  test('rejeita boleto sem pagador (customer)', async () => {
    const { customer: _drop, ...noCustomer } = baseBoleto
    await expect(service.execute(noCustomer)).rejects.toBeInstanceOf(BoletoDataIncompleteError)
    expect(gateway.boletoCreatedCount).toBe(0)
  })

  test('rejeita boleto sem telefone do pagador', async () => {
    const { phone: _drop, ...customer } = baseBoleto.customer!
    await expect(service.execute({ ...baseBoleto, customer })).rejects.toBeInstanceOf(
      BoletoDataIncompleteError,
    )
  })

  test('rejeita boleto sem endereço do pagador', async () => {
    const { address: _drop, ...customer } = baseBoleto.customer!
    await expect(service.execute({ ...baseBoleto, customer })).rejects.toBeInstanceOf(
      BoletoDataIncompleteError,
    )
  })

  test('é idempotente: mesma chave+payload não cobra de novo', async () => {
    const first = await service.execute(baseBoleto)
    const second = await service.execute(baseBoleto)
    expect(second.id).toBe(first.id)
    expect(gateway.boletoCreatedCount).toBe(1)
  })

  test('modo assíncrono aceita sem chamar a Efí (sem boleto ainda)', async () => {
    const asyncService = buildService(true)
    const view = await asyncService.execute(baseBoleto)

    expect(view.status).toBe('PENDING')
    expect(view.boleto).toBeUndefined()
    expect(gateway.boletoCreatedCount).toBe(0)
  })
})
