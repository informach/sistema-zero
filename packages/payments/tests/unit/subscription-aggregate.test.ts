import { describe, expect, test } from 'bun:test'
import { InvalidStateTransitionError, ValidationError } from '../../src/domain/shared/errors'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'

function build(overrides?: Partial<Parameters<typeof SubscriptionAggregate.create>[0]>) {
  return SubscriptionAggregate.create({
    consumerId: 'sys-a',
    amount: Money.fromCents(1000),
    card: { brand: 'visa', last4: '4242' },
    providerPlanId: 'plan-1',
    intervalMonths: 1,
    idempotencyKey: IdempotencyKey.create('idem-sub-001'),
    ...overrides,
  })
}

describe('SubscriptionAggregate', () => {
  test('atualizar cartão confirmado preserva plano, preço, ciclo e histórico', () => {
    const subscription = build()
    subscription.registerProviderSubscription('provider-qa')
    subscription.activate()
    subscription.recordCharge('charge-qa', new Date('2026-10-16T12:00:00Z'))
    const before = subscription.toSnapshot()
    subscription.updateCard({ brand: 'mastercard', last4: '1234' })
    const after = subscription.toSnapshot()
    expect(after.card).toEqual({ brand: 'mastercard', last4: '1234' })
    expect(after.amountInCents).toBe(before.amountInCents)
    expect(after.providerPlanId).toBe(before.providerPlanId)
    expect(after.lastChargeAt).toEqual(before.lastChargeAt)
    expect(after.cyclesCompleted).toBe(before.cyclesCompleted)
    expect(after.status).toBe('ACTIVE')
  })

  test('pedido de cancelamento é durável e idempotente e bloqueia troca antes da confirmação', () => {
    const subscription = build()
    subscription.activate()
    expect(subscription.requestCancellation()).toBe(true)
    const requestedAt = subscription.cancelRequestedAt
    expect(requestedAt).toBeInstanceOf(Date)
    expect(subscription.requestCancellation()).toBe(false)
    expect(subscription.cancelRequestedAt).toBe(requestedAt)
    expect(subscription.status).toBe('ACTIVE')
    expect(subscription.canceledAt).toBeNull()
    const restored = SubscriptionAggregate.restore(subscription.toSnapshot())
    expect(restored.cancelRequestedAt).toEqual(requestedAt)
    expect(() => restored.updateCard({ brand: 'visa', last4: '1234' })).toThrow(
      InvalidStateTransitionError,
    )
    expect(
      subscription
        .pullEvents()
        .filter((event) => event.eventName === 'subscription.cancellation_requested'),
    ).toHaveLength(1)
  })

  test('create → PENDING + evento subscription.created', () => {
    const sub = build()
    expect(sub.status).toBe('PENDING')
    expect(sub.cyclesCompleted).toBe(0)
    expect(sub.isNew).toBe(true)
    const events = sub.pullEvents()
    expect(events.map((e) => e.eventName)).toContain('subscription.created')
  })

  test('valor não positivo → ValidationError', () => {
    expect(() => build({ amount: Money.fromCents(0) })).toThrow(ValidationError)
  })

  test('intervalo < 1 mês → ValidationError', () => {
    expect(() => build({ intervalMonths: 0 })).toThrow(ValidationError)
  })

  test('activate é idempotente e emite uma vez', () => {
    const sub = build()
    sub.pullEvents()
    sub.registerProviderSubscription('sub-ext-1')
    sub.activate()
    sub.activate()
    expect(sub.status).toBe('ACTIVE')
    expect(sub.pullEvents().filter((e) => e.eventName === 'subscription.activated')).toHaveLength(1)
  })

  test('recordCharge conta ciclos e é idempotente por chargeId', () => {
    const sub = build()
    sub.activate()
    sub.pullEvents()
    sub.recordCharge('charge-1', new Date())
    sub.recordCharge('charge-1', new Date()) // mesmo charge → no-op
    sub.recordCharge('charge-2', new Date())
    expect(sub.cyclesCompleted).toBe(2)
    expect(sub.pullEvents().filter((e) => e.eventName === 'subscription.charge_paid')).toHaveLength(
      2,
    )
  })

  test('ciclo histórico não faz lastChargeAt regredir', () => {
    const sub = build()
    sub.activate()
    sub.pullEvents()
    const maisRecente = new Date('2026-08-01T12:00:00Z')
    const historico = new Date('2026-07-01T12:00:00Z')

    sub.recordCharge('charge-agosto', maisRecente)
    sub.recordCharge('charge-julho', historico)

    expect(sub.cyclesCompleted).toBe(2)
    expect(sub.lastChargeAt?.toISOString()).toBe(maisRecente.toISOString())
    const eventos = sub
      .pullEvents()
      .filter((event) => event.eventName === 'subscription.charge_paid')
    expect(eventos.at(-1)?.toPayload().paidAt).toBe(historico.toISOString())
  })

  test('expira automaticamente ao atingir o nº de repetições', () => {
    const sub = build({ repeats: 2 })
    sub.activate()
    sub.recordCharge('c1')
    expect(sub.status).toBe('ACTIVE')
    sub.recordCharge('c2')
    expect(sub.status).toBe('EXPIRED')
    expect(sub.cyclesCompleted).toBe(2)
  })

  test('cancel é idempotente', () => {
    const sub = build()
    sub.pullEvents()
    sub.cancel()
    sub.cancel()
    expect(sub.status).toBe('CANCELED')
    expect(sub.canceledAt).not.toBeNull()
    expect(sub.pullEvents().filter((e) => e.eventName === 'subscription.canceled')).toHaveLength(1)
  })

  test('não ativa uma assinatura cancelada (transição inválida)', () => {
    const sub = build()
    sub.cancel()
    expect(() => sub.activate()).toThrow(InvalidStateTransitionError)
  })

  test('registerProviderSubscription só em PENDING', () => {
    const sub = build()
    sub.activate()
    expect(() => sub.registerProviderSubscription('x')).toThrow(InvalidStateTransitionError)
  })

  test('snapshot ↔ restore preserva o estado', () => {
    const sub = build({ repeats: 12, description: 'Plano Premium' })
    sub.registerProviderSubscription('sub-ext-9')
    sub.activate()
    sub.recordCharge('charge-x', new Date())
    const restored = SubscriptionAggregate.restore(sub.toSnapshot())
    expect(restored.status).toBe('ACTIVE')
    expect(restored.cyclesCompleted).toBe(1)
    expect(restored.providerSubscriptionId).toBe('sub-ext-9')
    expect(restored.repeats).toBe(12)
    expect(restored.isNew).toBe(false)
    // recordCharge segue idempotente após restore (lastChargeId preservado).
    restored.recordCharge('charge-x')
    expect(restored.cyclesCompleted).toBe(1)
  })
})
