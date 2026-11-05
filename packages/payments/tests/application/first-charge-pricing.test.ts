import { expect, test } from 'bun:test'
import { CreateSubscriptionService } from '../../src/application/create-subscription/create-subscription.service'
import { FirstChargeSetupService } from '../../src/application/create-subscription/first-charge-setup.service'
import { HandleSubscriptionNotificationService } from '../../src/application/handle-subscription-notification/handle-subscription-notification.service'
import { SubscriptionActivationRejectedError } from '../../src/domain/subscription/activation-rejected.error'
import { FirstChargeSetupWorker } from '../../src/infrastructure/workers/first-charge-setup-worker'
import {
  FakePixGateway,
  InMemoryIdempotencyStore,
  InMemoryPaymentRepository,
  InMemorySubscriptionPlanRegistry,
  InMemorySubscriptionRepository,
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

function fixture(intervalMonths = 1) {
  const subscriptions = new InMemorySubscriptionRepository(),
    payments = new InMemoryPaymentRepository(),
    gateway = new FakePixGateway()
  const cycles = new HandleSubscriptionNotificationService(
    subscriptions,
    payments,
    gateway,
    new InMemoryWebhookInbox(),
    silentLogger,
  )
  let now = new Date()
  const setup = new FirstChargeSetupService(
    subscriptions,
    payments,
    gateway,
    cycles,
    silentLogger,
    () => now,
  )
  const service = new CreateSubscriptionService(
    subscriptions,
    payments,
    new InMemorySubscriptionPlanRegistry(),
    gateway,
    new InMemoryIdempotencyStore(),
    { idempotencyTtlSeconds: 3600, idempotencyInFlightTtlSeconds: 120 },
    silentLogger,
    setup,
  )
  const command = {
    consumerId: 'funnel',
    idempotencyKey: crypto.randomUUID(),
    requestHash: 'same-request',
    amountInCents: intervalMonths === 1 ? 9700 : 97000,
    firstChargeAmountInCents: intervalMonths === 1 ? 4850 : 48500,
    intervalMonths,
    card: { token: 'ephemeral-token-never-store', brand: 'visa', last4: '4242' },
    metadata: { couponCode: 'FIRST50', leadId: 'lead' },
    customer: {
      name: 'Teste',
      email: 'teste@example.test',
      document: '52998224725',
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
    },
  }
  return {
    subscriptions,
    payments,
    gateway,
    cycles,
    setup,
    service,
    command,
    advance() {
      now = new Date(Date.now() + 86_400_001)
    },
  }
}

test('recusa definitiva da ativação cancela a assinatura preparada sem aguardar 24 horas', async () => {
  const f = fixture()
  f.gateway.subscriptionStatus = 'PENDING'
  f.gateway.firstChargeStatus = 'PENDING'
  f.gateway.activateCardSubscription = async () => {
    throw new SubscriptionActivationRejectedError()
  }
  const view = await f.service.execute(f.command)
  expect(view.status).toBe('CANCELED')
  expect(f.gateway.canceledSubscriptionIds).toEqual([view.providerSubscriptionId!])
  expect((await f.subscriptions.findById(view.id))?.firstChargePricing?.renewalPriceConfirmed).toBe(
    false,
  )
  expect((await f.service.execute(f.command)).id).toBe(view.id)
  expect(f.gateway.preparationCount).toBe(1)
})

for (const interval of [1, 12])
  test(`${interval} meses: desconto só na cobrança identificada, renovação integral sem resgatar cupom novamente`, async () => {
    const f = fixture(interval),
      view = await f.service.execute(f.command)
    const sub = await f.subscriptions.findById(view.id)
    expect(sub?.firstChargePricing?.renewalPriceConfirmed).toBe(true)
    expect(view.amountInCents).toBe(String(f.command.amountInCents))
    expect(view.firstPayment?.status).toBe('PAID')
    const first = await f.payments.findById(view.firstPayment!.id)
    expect(first?.amount.amountInCents).toBe(BigInt(f.command.firstChargeAmountInCents))
    expect(first?.metadata.couponCode).toBe('FIRST50')
    expect(
      JSON.stringify(sub?.toSnapshot(), (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    ).not.toContain('ephemeral-token')
    expect(f.gateway.recurringAmounts.get(view.providerSubscriptionId!)).toBe(
      BigInt(f.command.amountInCents),
    )
    f.gateway.setCycleChargeAmount('renewal-full', BigInt(f.command.amountInCents))
    await f.cycles.handleCycle({
      subscriptionId: view.providerSubscriptionId!,
      chargeId: 'renewal-full',
    })
    const renewal = await f.payments.findByProviderPaymentId('EFI', 'renewal-full')
    expect(renewal?.amount.amountInCents).toBe(BigInt(f.command.amountInCents))
    expect(renewal?.metadata.couponCode).toBeUndefined()
    f.gateway.setCycleChargeAmount('wrong-renewal', BigInt(f.command.firstChargeAmountInCents))
    await f.cycles.handleCycle({
      subscriptionId: view.providerSubscriptionId!,
      chargeId: 'wrong-renewal',
    })
    expect(await f.payments.findByProviderPaymentId('EFI', 'wrong-renewal')).toBeNull()
    expect((await f.service.execute(f.command)).id).toBe(view.id)
    expect(f.gateway.preparationCount).toBe(1)
    expect(f.gateway.activationCount).toBe(1)
  })

test('resposta perdida e atualização indisponível deixam trabalho durável, sem outro POST de cobrança', async () => {
  const f = fixture()
  f.gateway.failSubscriptionCreate = true
  f.gateway.failUpdateSubscriptionAmount = true
  const view = await f.service.execute(f.command)
  expect(view.firstPayment).toBeTruthy()
  expect((await f.subscriptions.findById(view.id))?.firstChargePricing?.renewalPriceConfirmed).toBe(
    false,
  )
  f.gateway.failUpdateSubscriptionAmount = false
  const worker = new FirstChargeSetupWorker(f.subscriptions, f.setup, silentLogger)
  await worker.tick()
  expect((await f.subscriptions.findById(view.id))?.firstChargePricing?.renewalPriceConfirmed).toBe(
    true,
  )
  await worker.tick()
  expect(f.gateway.activationCount).toBe(1)
  expect(f.payments.byId.size).toBe(1)
})

test('falha persistente cancela a renovação e mantém verdadeiro o primeiro pagamento', async () => {
  const f = fixture()
  f.gateway.failUpdateSubscriptionAmount = true
  const view = await f.service.execute(f.command)
  f.advance()
  await f.setup.resume(view.id)
  expect((await f.subscriptions.findById(view.id))?.status).toBe('CANCELED')
  expect((await f.payments.findById(view.firstPayment!.id))?.status).toBe('PAID')
  expect(f.gateway.canceledSubscriptionIds).toEqual([view.providerSubscriptionId!])
})

test('valor inválido é recusado antes de plano, assinatura ou pagamento', async () => {
  const f = fixture()
  for (const firstChargeAmountInCents of [0, 299, 9700, 10000, 400.5])
    await expect(f.service.execute({ ...f.command, firstChargeAmountInCents })).rejects.toThrow(
      'primeira cobrança',
    )
  expect(f.gateway.planCreatedCount).toBe(0)
  expect(f.subscriptions.byId.size).toBe(0)
})

test('primeira cobrança recusada cancela a recorrência antes de permitir nova tentativa', async () => {
  const f = fixture()
  f.gateway.cardStatus = 'FAILED'
  const view = await f.service.execute(f.command)
  expect(view.firstPayment?.status).toBe('FAILED')
  expect(view.status).toBe('CANCELED')
  expect(f.gateway.canceledSubscriptionIds).toEqual([view.providerSubscriptionId!])
})

test('primeira cobrança em análise mantém reconciliação durável até a aprovação', async () => {
  const f = fixture()
  f.gateway.cardStatus = 'PENDING'
  const view = await f.service.execute(f.command)
  expect(view.firstPayment?.status).toBe('PENDING')
  expect((await f.subscriptions.findById(view.id))?.firstChargePricing?.renewalPriceConfirmed).toBe(
    false,
  )
  expect(f.gateway.recurringAmounts.get(view.providerSubscriptionId!)).toBe(9700n)
  f.gateway.cardStatus = 'PAID'
  await f.setup.resume(view.id)
  expect((await f.subscriptions.findById(view.id))?.firstChargePricing?.renewalPriceConfirmed).toBe(
    true,
  )
  expect((await f.payments.findById(view.firstPayment!.id))?.status).toBe('PAID')
})
