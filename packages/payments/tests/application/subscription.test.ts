import { beforeEach, describe, expect, test } from 'bun:test'
import { CancelSubscriptionService } from '../../src/application/cancel-subscription/cancel-subscription.service'
import type { CreateSubscriptionCommand } from '../../src/application/create-subscription/create-subscription.command'
import { CreateSubscriptionService } from '../../src/application/create-subscription/create-subscription.service'
import { GetSubscriptionService } from '../../src/application/get-subscription/get-subscription.service'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import {
  IdempotencyConflictError,
  IdempotencyInFlightError,
} from '../../src/domain/payment/payment.errors'
import { SubscriptionDataIncompleteError } from '../../src/domain/subscription/subscription.errors'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemorySubscriptionPlanRegistry,
  InMemorySubscriptionRepository,
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

const customer = {
  name: 'João da Silva',
  email: 'joao@example.com',
  document: '52998224725', // CPF válido
  phone: '11999998888',
  birth: '1990-05-10',
  address: {
    street: 'Rua A',
    number: '100',
    neighborhood: 'Centro',
    zipcode: '01001000',
    city: 'São Paulo',
    state: 'SP',
  },
}

const baseCommand: CreateSubscriptionCommand = {
  consumerId: 'sys-a',
  idempotencyKey: 'idem-sub-0001',
  requestHash: 'hash-A',
  amountInCents: 1000,
  intervalMonths: 1,
  card: { token: 'paytok-abc', brand: 'visa', last4: '4242' },
  customer,
}

function buildService(deps: {
  subscriptions: InMemorySubscriptionRepository
  payments: InMemoryPaymentRepository
  planRegistry: InMemorySubscriptionPlanRegistry
  gateway: FakePixGateway
  idempotency?: InMemoryIdempotencyStore
}) {
  return new CreateSubscriptionService(
    deps.subscriptions,
    deps.payments,
    deps.planRegistry,
    deps.gateway,
    deps.idempotency ?? new InMemoryIdempotencyStore(),
    { idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120 },
    silentLogger,
  )
}

describe('CreateSubscriptionService', () => {
  let subscriptions: InMemorySubscriptionRepository
  let payments: InMemoryPaymentRepository
  let planRegistry: InMemorySubscriptionPlanRegistry
  let gateway: FakePixGateway

  beforeEach(() => {
    subscriptions = new InMemorySubscriptionRepository()
    payments = new InMemoryPaymentRepository()
    planRegistry = new InMemorySubscriptionPlanRegistry()
    gateway = new FakePixGateway()
  })

  test('cria plano + assinatura, ativa e cria o pagamento do 1º ciclo (PAID)', async () => {
    const view = await buildService({ subscriptions, payments, planRegistry, gateway }).execute(
      baseCommand,
    )

    expect(view.status).toBe('ACTIVE')
    expect(view.cyclesCompleted).toBe(1)
    expect(view.card).toEqual({ brand: 'visa', last4: '4242' })
    expect(view.providerSubscriptionId).toBeTruthy()
    expect(gateway.planCreatedCount).toBe(1)
    expect(gateway.subscriptionCreatedCount).toBe(1)

    // Pagamento do 1º ciclo criado, PAGO, ligado à assinatura.
    expect(payments.byId.size).toBe(1)
    const cycle = [...payments.byId.values()][0]!
    expect(cycle.status).toBe('PAID')
    expect(cycle.subscriptionId).toBe(view.id)
    expect(cycle.method.type).toBe('CREDIT_CARD')
    expect(payments.outbox.some((e) => e.eventName === 'payment.paid')).toBe(true)
    expect(subscriptions.outbox.some((e) => e.eventName === 'subscription.activated')).toBe(true)

    // A view da criação expõe o pagamento do 1º ciclo (o funil linka ao lead
    // sem esperar o webhook) e o `payment.paid` carrega o subscriptionId.
    expect(view.firstPayment).toEqual({ id: cycle.id, status: 'PAID' })
    const paidEvent = payments.outbox.find((e) => e.eventName === 'payment.paid')!
    expect(paidEvent.payload.subscriptionId).toBe(view.id)
  })

  test('metadata da assinatura (leadId/offerId) propaga ao pagamento do ciclo', async () => {
    const view = await buildService({ subscriptions, payments, planRegistry, gateway }).execute({
      ...baseCommand,
      metadata: { leadId: 'lead-1', offerId: 'offer-1' },
    })

    const cycle = [...payments.byId.values()][0]!
    expect(cycle.metadata.leadId).toBe('lead-1')
    expect(cycle.metadata.offerId).toBe('offer-1')
    expect(cycle.metadata.subscriptionId).toBe(view.id)
  })

  test('reusa o plano para o mesmo (intervalo, repetições)', async () => {
    const service = buildService({ subscriptions, payments, planRegistry, gateway })
    await service.execute(baseCommand)
    await service.execute({
      ...baseCommand,
      idempotencyKey: 'idem-sub-0002',
      requestHash: 'hash-B',
    })

    expect(gateway.planCreatedCount).toBe(1) // 2ª assinatura reaproveitou o plano
    expect(gateway.subscriptionCreatedCount).toBe(2)
  })

  test('é idempotente: mesma chave+payload não cria 2ª assinatura', async () => {
    const idempotency = new InMemoryIdempotencyStore()
    const service = buildService({ subscriptions, payments, planRegistry, gateway, idempotency })
    const first = await service.execute(baseCommand)
    const second = await service.execute(baseCommand)

    expect(second.id).toBe(first.id)
    expect(gateway.subscriptionCreatedCount).toBe(1)
  })

  test('mesma chave com payload diferente → conflito', async () => {
    const idempotency = new InMemoryIdempotencyStore()
    const service = buildService({ subscriptions, payments, planRegistry, gateway, idempotency })
    await service.execute(baseCommand)
    await expect(
      service.execute({ ...baseCommand, requestHash: 'hash-DIFERENTE' }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError)
  })

  test('rejeita assinatura sem data de nascimento (422) e não cria nada', async () => {
    const { birth: _drop, ...noBirth } = customer
    await expect(
      buildService({ subscriptions, payments, planRegistry, gateway }).execute({
        ...baseCommand,
        customer: noBirth,
      }),
    ).rejects.toBeInstanceOf(SubscriptionDataIncompleteError)
    expect(gateway.subscriptionCreatedCount).toBe(0)
  })

  test('1ª cobrança em análise (waiting) → assinatura e ciclo PENDING', async () => {
    gateway.subscriptionStatus = 'PENDING'
    gateway.firstChargeStatus = 'PENDING'
    const view = await buildService({ subscriptions, payments, planRegistry, gateway }).execute(
      baseCommand,
    )
    expect(view.status).toBe('PENDING')
    expect(view.cyclesCompleted).toBe(0)
    const cycle = [...payments.byId.values()][0]!
    expect(cycle.status).toBe('PENDING')
  })

  test('reserva em andamento → IdempotencyInFlightError', async () => {
    const idempotency = new InMemoryIdempotencyStore()
    await idempotency.reserve({
      consumerId: 'sys-a',
      key: baseCommand.idempotencyKey,
      requestHash: baseCommand.requestHash,
      inFlightTtlSeconds: 120,
    })
    await expect(
      buildService({ subscriptions, payments, planRegistry, gateway, idempotency }).execute(
        baseCommand,
      ),
    ).rejects.toBeInstanceOf(IdempotencyInFlightError)
  })

  test('falha após plano externo deixa IN_FLIGHT; retry imediato não cria 2ª assinatura', async () => {
    const idempotency = new InMemoryIdempotencyStore()
    const service = buildService({ subscriptions, payments, planRegistry, gateway, idempotency })

    gateway.failSubscriptionCreate = true
    await expect(service.execute(baseCommand)).rejects.toThrow(
      'falha simulada na criação da assinatura',
    )
    expect(gateway.planCreatedCount).toBe(1)

    gateway.failSubscriptionCreate = false
    await expect(service.execute(baseCommand)).rejects.toBeInstanceOf(IdempotencyInFlightError)
    expect(gateway.subscriptionCreatedCount).toBe(0)

    idempotency.clockSkewMs = 121_000
    const view = await service.execute(baseCommand)
    expect(view.status).toBe('ACTIVE')
    expect(gateway.subscriptionCreatedCount).toBe(1)
  })
})

describe('CancelSubscriptionService', () => {
  let subscriptions: InMemorySubscriptionRepository
  let payments: InMemoryPaymentRepository
  let planRegistry: InMemorySubscriptionPlanRegistry
  let gateway: FakePixGateway
  let subId: string
  let providerSubId: string

  beforeEach(async () => {
    subscriptions = new InMemorySubscriptionRepository()
    payments = new InMemoryPaymentRepository()
    planRegistry = new InMemorySubscriptionPlanRegistry()
    gateway = new FakePixGateway()
    const view = await buildService({ subscriptions, payments, planRegistry, gateway }).execute(
      baseCommand,
    )
    subId = view.id
    providerSubId = view.providerSubscriptionId as string
  })

  test('cancela na Efí e marca CANCELED; escopado por consumidor', async () => {
    const cancel = new CancelSubscriptionService(subscriptions, gateway, silentLogger)
    const view = await cancel.execute('sys-a', subId)

    expect(view.status).toBe('CANCELED')
    expect(view.canceledAt).not.toBeNull()
    expect(gateway.canceledSubscriptionIds).toContain(providerSubId)
    expect(subscriptions.outbox.some((e) => e.eventName === 'subscription.canceled')).toBe(true)
  })

  test('assinatura de outro consumidor → 404 (SubscriptionNotFound)', async () => {
    const cancel = new CancelSubscriptionService(subscriptions, gateway, silentLogger)
    await expect(cancel.execute('sys-b', subId)).rejects.toThrow()
  })

  test('cancelar uma já cancelada é idempotente (não chama a Efí de novo)', async () => {
    const cancel = new CancelSubscriptionService(subscriptions, gateway, silentLogger)
    await cancel.execute('sys-a', subId)
    await cancel.execute('sys-a', subId)
    expect(gateway.canceledSubscriptionIds.filter((id) => id === providerSubId)).toHaveLength(1)
  })

  test('GetSubscription é escopado por consumidor', async () => {
    const get = new GetSubscriptionService(subscriptions)
    expect((await get.execute('sys-a', subId)).id).toBe(subId)
    await expect(get.execute('sys-b', subId)).rejects.toThrow()
  })
})

describe('HandleSubscriptionNotificationService (ciclos)', () => {
  let subscriptions: InMemorySubscriptionRepository
  let payments: InMemoryPaymentRepository
  let gateway: FakePixGateway
  let inbox: InMemoryWebhookInbox
  let handler: HandleSubscriptionNotificationService
  let providerSubId: string
  let subId: string

  beforeEach(async () => {
    subscriptions = new InMemorySubscriptionRepository()
    payments = new InMemoryPaymentRepository()
    gateway = new FakePixGateway()
    // Assinatura criada SEM 1ª cobrança na resposta → o handler cria os ciclos.
    gateway.firstChargeStatus = undefined
    gateway.subscriptionStatus = 'PENDING'
    const view = await buildService({
      subscriptions,
      payments,
      planRegistry: new InMemorySubscriptionPlanRegistry(),
      gateway,
    }).execute(baseCommand)
    subId = view.id
    providerSubId = view.providerSubscriptionId as string

    inbox = new InMemoryWebhookInbox()
    handler = new HandleSubscriptionNotificationService(
      subscriptions,
      payments,
      gateway,
      inbox,
      silentLogger,
    )
  })

  test('1º ciclo pago cria o pagamento-filho, ativa o pai e emite payment.paid', async () => {
    gateway.cardStatus = 'PAID'
    gateway.setCycleChargeAmount('cycle-1', 1000n)
    await handler.handleCycle({ subscriptionId: providerSubId, chargeId: 'cycle-1' })

    const cycle = await payments.findByProviderPaymentId('EFI', 'cycle-1')
    expect(cycle?.status).toBe('PAID')
    expect(cycle?.subscriptionId).toBe(subId)
    expect(payments.outbox.some((e) => e.eventName === 'payment.paid')).toBe(true)

    const sub = await subscriptions.findById(subId)
    expect(sub?.status).toBe('ACTIVE')
    expect(sub?.cyclesCompleted).toBe(1)
  })

  test('notificação duplicada (mesmo status) é ignorada', async () => {
    gateway.cardStatus = 'PAID'
    gateway.setCycleChargeAmount('cycle-1', 1000n)
    await handler.handleCycle({ subscriptionId: providerSubId, chargeId: 'cycle-1' })
    await handler.handleCycle({ subscriptionId: providerSubId, chargeId: 'cycle-1' })

    expect(payments.outbox.filter((e) => e.eventName === 'payment.paid')).toHaveLength(1)
    expect((await subscriptions.findById(subId))?.cyclesCompleted).toBe(1)
  })

  test('valor divergente NÃO cria a linha do ciclo', async () => {
    gateway.cardStatus = 'PAID'
    gateway.overrideAmountInCents = 1n // assinatura é de 1000
    await handler.handleCycle({ subscriptionId: providerSubId, chargeId: 'cycle-x' })

    expect(await payments.findByProviderPaymentId('EFI', 'cycle-x')).toBeNull()
    expect((await subscriptions.findById(subId))?.cyclesCompleted).toBe(0)
  })

  test('2º ciclo cria um 2º pagamento-filho e conta o ciclo', async () => {
    gateway.cardStatus = 'PAID'
    gateway.setCycleChargeAmount('cycle-1', 1000n)
    gateway.setCycleChargeAmount('cycle-2', 1000n)
    await handler.handleCycle({ subscriptionId: providerSubId, chargeId: 'cycle-1' })
    await handler.handleCycle({ subscriptionId: providerSubId, chargeId: 'cycle-2' })

    expect(payments.byId.size).toBe(2)
    expect((await subscriptions.findById(subId))?.cyclesCompleted).toBe(2)
  })

  test('assinatura ainda não persistida → no-op (reprocessável), sem lançar', async () => {
    gateway.cardStatus = 'PAID'
    await handler.handleCycle({ subscriptionId: 'sub-desconhecida', chargeId: 'cycle-1' })
    expect(payments.byId.size).toBe(0)
  })

  test('ciclo FALHO emite payment.failed com o subscriptionId (dunning do funil)', async () => {
    gateway.cardStatus = 'FAILED'
    gateway.setCycleChargeAmount('cycle-1', 1000n)
    await handler.handleCycle({ subscriptionId: providerSubId, chargeId: 'cycle-1' })

    const failed = payments.outbox.find((e) => e.eventName === 'payment.failed')
    expect(failed).toBeDefined()
    expect(failed!.payload.subscriptionId).toBe(subId)
    // Um ciclo falho NÃO cancela a assinatura (a Efí pode retentar).
    expect((await subscriptions.findById(subId))?.status).not.toBe('CANCELED')
  })
})
