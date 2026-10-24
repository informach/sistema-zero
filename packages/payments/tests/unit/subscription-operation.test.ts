import { describe, expect, test } from 'bun:test'
import { createSubscriptionOperation } from '../../src/domain/subscription/subscription-operation'

const input = {
  subscriptionId: 'subscription-qa',
  consumerId: 'owner-qa',
  providerSubscriptionId: 'provider-qa',
  now: new Date('2026-10-23T12:00:00Z'),
}

describe('Intenção financeira de assinatura', () => {
  test('troca preventiva não carrega cobrança, preço ou token e vence em dez minutos', () => {
    const operation = createSubscriptionOperation({ ...input, kind: 'CARD_UPDATE' })
    expect(operation.state).toBe('READY')
    expect(operation.providerPaymentId).toBeNull()
    expect(operation.amountInCents).toBeNull()
    expect(operation.expiresAt.toISOString()).toBe('2026-10-23T12:10:00.000Z')
    expect(Object.keys(operation).some((key) => /token|pan|cvv/i.test(key))).toBe(false)
  })

  test('regularização fixa identidade e valor da cobrança original', () => {
    const operation = createSubscriptionOperation({
      ...input,
      kind: 'RETRY',
      providerPaymentId: 'charge-qa',
      amountInCents: 9700n,
    })
    expect(operation.providerPaymentId).toBe('charge-qa')
    expect(operation.amountInCents).toBe(9700n)
    expect(operation.currency).toBe('BRL')
  })

  test('regularização sem cobrança ou valor positivo é recusada', () => {
    expect(() => createSubscriptionOperation({ ...input, kind: 'RETRY' })).toThrow()
    expect(() =>
      createSubscriptionOperation({
        ...input,
        kind: 'RETRY',
        providerPaymentId: 'charge-qa',
        amountInCents: 0n,
      }),
    ).toThrow()
  })

  test.each([
    'CARD_UPDATE',
    'CANCEL',
  ] as const)('ação sem débito rejeita valor embutido: %s', (kind) => {
    expect(() => createSubscriptionOperation({ ...input, kind, amountInCents: 9700n })).toThrow()
    expect(() =>
      createSubscriptionOperation({ ...input, kind, providerPaymentId: 'charge-qa' }),
    ).toThrow()
  })

  test('cópia defensiva do relógio e recusa de relógio inválido', () => {
    const clock = new Date(input.now)
    const operation = createSubscriptionOperation({ ...input, now: clock, kind: 'CANCEL' })
    clock.setFullYear(2030)
    expect(operation.createdAt.toISOString()).toBe('2026-10-23T12:00:00.000Z')
    expect(() =>
      createSubscriptionOperation({ ...input, now: new Date('invalid'), kind: 'CANCEL' }),
    ).toThrow()
  })
})
