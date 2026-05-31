import { beforeEach, describe, expect, test } from 'bun:test'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import { ConcurrencyConflictError } from '../../src/infrastructure/persistence/drizzle/concurrency.error'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  silentLogger,
} from '../fakes/in-memory'

const command: ProcessPaymentCommand = {
  consumerId: 'sys-a',
  idempotencyKey: 'idem-conc-001',
  requestHash: 'hash-A',
  amountInCents: 1000,
  method: 'PIX',
}

describe('Concorrência otimista (version)', () => {
  let repo: InMemoryPaymentRepository
  let paymentId: string

  beforeEach(async () => {
    repo = new InMemoryPaymentRepository()
    const service = new ProcessPaymentService(
      repo,
      new FakePixGateway(),
      new InMemoryIdempotencyStore(),
      {
        pixKey: 'pix@loja.com',
        idempotencyTtlSeconds: 3600,
        idempotencyInFlightTtlSeconds: 120,
        asyncChargeCreation: false,
        boletoDefaultExpiresDays: 3,
      },
      silentLogger,
    )
    paymentId = (await service.execute(command)).id
  })

  test('dois writers defasados: o segundo save conflita (lost-update evitado)', async () => {
    const a = await repo.findById(paymentId)
    const b = await repo.findById(paymentId)
    expect(a && b).toBeTruthy()

    a!.markPaid()
    await repo.save(a!) // vence

    b!.markPaid()
    await expect(repo.save(b!)).rejects.toBeInstanceOf(ConcurrencyConflictError)
  })

  test('reconciliação vs webhook: apenas UM evento payment.paid é emitido', async () => {
    // Duas réplicas carregam o mesmo pagamento PENDING e tentam confirmar.
    const reconcile = await repo.findById(paymentId)
    const webhook = await repo.findById(paymentId)

    reconcile!.markPaid()
    await repo.save(reconcile!)

    webhook!.markPaid()
    await repo.save(webhook!).catch(() => {
      /* conflito esperado — o outro venceu */
    })

    const paidEvents = repo.outbox.filter((e) => e.eventName === 'payment.paid')
    expect(paidEvents).toHaveLength(1)
  })
})
