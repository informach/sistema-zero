import { expect, test } from 'bun:test'
import { buildCyclePayment } from '../../src/application/subscription/cycle-payment'
import { RecoverySourceService } from '../../src/application/subscription-recovery/recovery-source.service'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'
import { SubscriptionRecoveryCase } from '../../src/domain/subscription-recovery/recovery-case'
import { INITIAL_RECOVERY_POLICY } from '../../src/domain/subscription-recovery/recovery-policy'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import {
  FakePixGateway,
  InMemoryPaymentRepository,
  InMemorySubscriptionRepository,
} from '../fakes/in-memory'
import { InMemorySubscriptionOperationRepository } from '../fakes/subscription-operation-repository'

async function setup() {
  let now = new Date('2026-10-24T12:00:00Z')
  const subscriptions = new InMemorySubscriptionRepository()
  const payments = new InMemoryPaymentRepository()
  const operations = new InMemorySubscriptionOperationRepository()
  const gateway = new FakePixGateway()
  const subscription = SubscriptionAggregate.create({
    consumerId: 'qa-recovery',
    amount: Money.fromCents(9700),
    intervalMonths: 1,
    card: { brand: 'visa', last4: '4242' },
    providerPlanId: 'qa-plan',
    idempotencyKey: IdempotencyKey.create(crypto.randomUUID()),
  })
  subscription.registerProviderSubscription('qa-subscription')
  subscription.activate()
  await subscriptions.save(subscription)
  const payment = buildCyclePayment({ subscription, chargeId: 'qa-charge', status: 'FAILED' })
  await payments.save(payment)
  gateway.getCardCharge = async () => ({
    providerPaymentId: 'qa-charge',
    status: 'FAILED',
    amountInCents: 9700n,
  })
  gateway.setSubscriptionCharges('qa-subscription', [{ chargeId: 'qa-charge', status: 'FAILED' }])
  const item = SubscriptionRecoveryCase.open({
    subscriptionId: subscription.id,
    consumerId: subscription.consumerId,
    providerSubscriptionId: 'qa-subscription',
    paymentId: payment.id,
    providerPaymentId: 'qa-charge',
    audience: 'kids',
    amountInCents: 9700n,
    policy: INITIAL_RECOVERY_POLICY,
    firstFailureAt: now,
    now,
  }).toSnapshot()
  return {
    item,
    gateway,
    payments,
    operations,
    service: new RecoverySourceService(
      subscriptions,
      payments,
      operations,
      gateway,
      () => new Date(now),
    ),
    advance: () => {
      now = new Date(now.getTime() + 60_001)
    },
  }
}

test('prova usa posse local, vínculo da cobrança no provedor e estado novo de ambas as fontes', async () => {
  const { service, item } = await setup()
  expect(await service.inspect(item)).toMatchObject({
    providerSubscriptionId: 'qa-subscription',
    providerPaymentId: 'qa-charge',
    amountInCents: 9700n,
    subscriptionStatus: 'ACTIVE',
    paymentStatus: 'FAILED',
    paymentOperationPending: false,
  })
})

test('intenção de débito preparada, executando ou incerta impede concluir ausência de operação', async () => {
  const { service, item, operations } = await setup()
  const operation = createSubscriptionOperation({
    subscriptionId: item.subscriptionId,
    consumerId: item.consumerId,
    providerSubscriptionId: item.providerSubscriptionId,
    kind: 'RETRY',
    retryTerms: {
      period: { startsAt: '2026-10-16T12:00:00.000Z', endsAt: '2026-11-16T12:00:00.000Z' },
      nextExecution: '2026-11-16',
    },
    providerPaymentId: item.providerPaymentId,
    amountInCents: item.amountInCents,
    now: item.openedAt,
  })
  await operations.create(operation)
  expect((await service.inspect(item)).paymentOperationPending).toBe(true)
  const running = await operations.start(operation.id, item.subscriptionId, item.openedAt)
  if (!running?.executionId) throw new Error('Missing QA execution')
  expect((await service.inspect(item)).paymentOperationPending).toBe(true)
  await operations.finish(
    operation.id,
    running.executionId,
    'UNKNOWN',
    'PROVIDER_UNKNOWN',
    item.openedAt,
  )
  expect((await service.inspect(item)).paymentOperationPending).toBe(true)
})

test('falha de consulta não vira prova de recusa e não cria cobrança ou cancelamento', async () => {
  const { service, item, gateway } = await setup()
  gateway.getCardCharge = async () => {
    throw new Error('QA provider unavailable')
  }
  await expect(service.inspect(item)).rejects.toThrow('QA provider unavailable')
  expect(gateway.canceledSubscriptionIds).toHaveLength(0)
})

test('cancelamento incerto é identificado, preservando a autoridade da própria execução cercada', async () => {
  const { service, item, operations } = await setup()
  const operation = createSubscriptionOperation({
    subscriptionId: item.subscriptionId,
    consumerId: item.consumerId,
    providerSubscriptionId: item.providerSubscriptionId,
    kind: 'CANCEL',
    now: item.openedAt,
  })
  await operations.create(operation)
  const executing = await operations.start(operation.id, item.subscriptionId, item.openedAt)
  if (!executing?.executionId) throw new Error('Missing QA cancellation execution')
  expect((await service.inspect(item)).cancellationOperationPending).toBe(true)
  expect((await service.inspect(item, executing.executionId)).cancellationOperationPending).toBe(
    false,
  )
  expect((await service.inspect(item, crypto.randomUUID())).cancellationOperationPending).toBe(true)
})

test('prova com GETs demorados expira a partir do início, não do fim da resposta', async () => {
  const { service, item, gateway, advance } = await setup()
  gateway.getCardCharge = async () => {
    advance()
    return { providerPaymentId: 'qa-charge', status: 'FAILED', amountInCents: 9700n }
  }
  await expect(service.inspect(item)).rejects.toThrow('vencida')
})

test('renovação posterior paga impede usar a recusa antiga como prova para cancelar', async () => {
  const { service, item, gateway } = await setup()
  gateway.setSubscriptionCharges('qa-subscription', [
    { chargeId: 'qa-charge', status: 'FAILED', createdAt: new Date('2026-10-01T12:00:00Z') },
    { chargeId: 'qa-later-paid', status: 'PAID', createdAt: new Date('2026-10-24T12:00:00Z') },
  ])
  await expect(service.inspect(item)).rejects.toThrow('posterior paga')
  expect(gateway.canceledSubscriptionIds).toHaveLength(0)
})

test('identidade, valor, posse e vínculo divergentes são recusados, sem inferência por texto', async () => {
  for (const variant of ['identity', 'amount', 'owner', 'provider-link', 'refunded'] as const) {
    const { service, item, gateway } = await setup()
    if (variant === 'owner') item.consumerId = 'qa-other-owner'
    if (variant === 'provider-link') gateway.setSubscriptionCharges('qa-subscription', [])
    gateway.getCardCharge = async () => ({
      providerPaymentId: variant === 'identity' ? 'qa-other-charge' : 'qa-charge',
      status: variant === 'refunded' ? 'REFUNDED' : 'FAILED',
      amountInCents: variant === 'amount' ? 1n : 9700n,
    })
    await expect(service.inspect(item)).rejects.toThrow()
  }
})
