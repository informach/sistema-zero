import { beforeEach, describe, expect, test } from 'bun:test'
import { GetPaymentService } from '../../src/application/get-payment/get-payment.service'
import { HandleBoletoNotificationService } from '../../src/application/handle-boleto-notification/handle-boleto-notification.service'
import type { ProcessPaymentCommand } from '../../src/application/process-payment/process-payment.command'
import { ProcessPaymentService } from '../../src/application/process-payment/process-payment.service'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

describe('HandleBoletoNotificationService', () => {
  let repo: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let handler: HandleBoletoNotificationService
  let getPayment: GetPaymentService
  let paymentId: string
  let chargeId: string

  const command: ProcessPaymentCommand = {
    consumerId: 'sys-a',
    idempotencyKey: 'idem-boleto-notif',
    requestHash: 'hash-A',
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

  beforeEach(async () => {
    repo = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    getPayment = new GetPaymentService(repo)
    handler = new HandleBoletoNotificationService(
      repo,
      gateway,
      new InMemoryWebhookInbox(),
      silentLogger,
    )

    const service = new ProcessPaymentService(
      repo,
      gateway,
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
    const view = await service.execute(command)
    paymentId = view.id
    chargeId = (await repo.findById(paymentId))!.providerPaymentId as string
    gateway.notificationChargeIds = [chargeId]
  })

  test('token resolve → boleto pago confirma o pagamento', async () => {
    gateway.boletoStatus = 'PAID'
    await handler.execute({ token: 'tok-1' })

    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PAID')
    expect(repo.outbox.some((e) => e.eventName === 'payment.paid')).toBe(true)
  })

  test('notificação duplicada (mesmo status) é ignorada', async () => {
    gateway.boletoStatus = 'PAID'
    await handler.execute({ token: 'tok-1' })
    await handler.execute({ token: 'tok-1' })

    expect(repo.outbox.filter((e) => e.eventName === 'payment.paid')).toHaveLength(1)
  })

  test('boleto expirado → pagamento EXPIRED', async () => {
    gateway.boletoStatus = 'EXPIRED'
    await handler.execute({ token: 'tok-1' })

    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('EXPIRED')
  })

  test('valor divergente NÃO confirma', async () => {
    gateway.boletoStatus = 'PAID'
    gateway.overrideAmountInCents = 1n
    await handler.execute({ token: 'tok-1' })

    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PENDING')
  })

  test('status não-terminal mantém PENDING', async () => {
    gateway.boletoStatus = 'PENDING'
    await handler.execute({ token: 'tok-1' })

    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PENDING')
  })

  test('isolamento por cobrança: uma que falha não aborta as demais', async () => {
    gateway.boletoStatus = 'PAID'
    gateway.notificationChargeIds = ['charge-ruim', chargeId]
    gateway.failGetBoletoChargeIds.add('charge-ruim')

    await handler.execute({ token: 'tok-1' })

    expect((await getPayment.execute('sys-a', paymentId)).status).toBe('PAID')
  })
})
