import { describe, expect, test } from 'bun:test'
import { PaymentAggregate } from '../../src/domain/payment/payment.aggregate'
import { PaymentMethod } from '../../src/domain/value-objects/payment-method'
import { snapshotToRow } from '../../src/infrastructure/persistence/drizzle/payment.repository'

/**
 * O `payment_token` da Efí é single-use e consumido na cobrança — NÃO pode ficar
 * em repouso no banco (ampliaria o raio de um vazamento sem nenhum uso legítimo).
 * Estes testes fixam: (a) o strip na fronteira de persistência; (b) a reidratação
 * preservando as parcelas (linhas novas SEM token e legadas COM token).
 */
describe('card.token nunca vai para o banco (PCI hardening)', () => {
  const SNAPSHOT = {
    id: '11111111-1111-1111-1111-111111111111',
    version: 0,
    consumerId: 'sys-a',
    amountInCents: 3700n,
    currency: 'BRL' as const,
    methodType: 'CREDIT_CARD' as const,
    card: { token: 'paytok-segredo', brand: 'visa', last4: '4242', installments: 3 },
    status: 'PAID' as const,
    provider: 'EFI',
    idempotencyKey: 'idem-1',
    providerPaymentId: 'charge-1',
    txid: null,
    pixQrCode: null,
    boleto: null,
    boletoRequest: null,
    customer: null,
    description: null,
    metadata: {},
    failureReason: null,
    subscriptionId: null,
    createdAt: new Date('2026-06-01T12:00:00Z'),
    updatedAt: new Date('2026-06-01T12:00:00Z'),
    paidAt: new Date('2026-06-01T12:00:05Z'),
    expiresAt: null,
  }

  test('snapshotToRow remove o token e preserva brand/last4/parcelas', () => {
    const row = snapshotToRow(SNAPSHOT)
    expect(row.card).toEqual({ brand: 'visa', last4: '4242', installments: 3 })
    expect((row.card as { token?: string }).token).toBeUndefined()
  })

  test('restore SEM token (linha nova) preserva as parcelas — não vira 1', () => {
    const restored = PaymentAggregate.restore({
      ...SNAPSHOT,
      card: { brand: 'visa', last4: '4242', installments: 3 },
    })
    expect(restored.card).toEqual({ brand: 'visa', last4: '4242', installments: 3 })
  })

  test('restore COM token (linha legada) continua legível', () => {
    const restored = PaymentAggregate.restore(SNAPSHOT)
    expect(restored.card?.last4).toBe('4242')
    expect(restored.card?.installments).toBe(3)
  })

  test('storedCard valida estrutura mas não exige token; creditCard segue exigindo', () => {
    expect(() =>
      PaymentMethod.storedCard({ brand: 'visa', last4: 'abcd', installments: 1 }),
    ).toThrow(/last4/)
    expect(() =>
      PaymentMethod.storedCard({ brand: 'visa', last4: '4242', installments: 0 }),
    ).toThrow(/parcelas/)
    expect(() =>
      PaymentMethod.creditCard({ brand: 'visa', last4: '4242', installments: 1 }),
    ).toThrow(/Token/)
  })
})
