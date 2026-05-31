import { describe, expect, test } from 'bun:test'
import { PaymentAggregate } from '../../src/domain/payment/payment.aggregate'
import {
  canTransition,
  isTerminal,
  type PaymentStatus,
} from '../../src/domain/payment/payment.status'
import { InvalidStateTransitionError } from '../../src/domain/shared/errors'
import { IdempotencyKey } from '../../src/domain/value-objects/idempotency-key'
import { Money } from '../../src/domain/value-objects/money'
import { PaymentMethod } from '../../src/domain/value-objects/payment-method'

function newPixPayment() {
  return PaymentAggregate.create({
    consumerId: 'sys-a',
    amount: Money.fromCents(1000),
    method: PaymentMethod.pix(),
    idempotencyKey: IdempotencyKey.create('idem-12345678'),
    metadata: { orderId: 'order-1' },
  })
}

describe('PaymentAggregate', () => {
  test('cria no estado PENDING e emite payment.created', () => {
    const payment = newPixPayment()
    expect(payment.status).toBe('PENDING')
    const events = payment.pullEvents()
    expect(events).toHaveLength(1)
    expect(events[0]!.eventName).toBe('payment.created')
  })

  test('PENDING → PAID emite payment.paid e é idempotente', () => {
    const payment = newPixPayment()
    payment.registerProviderCharge({ providerPaymentId: 'txid-1', txid: 'txid-1' })
    payment.markPaid()
    expect(payment.status).toBe('PAID')
    const names = payment.pullEvents().map((e) => e.eventName)
    expect(names).toContain('payment.paid')

    // chamar de novo não transita nem reemite
    payment.markPaid()
    expect(payment.pullEvents()).toHaveLength(0)
  })

  test('rejeita transição inválida (FAILED → PAID)', () => {
    const payment = newPixPayment()
    payment.markFailed('recusado')
    expect(payment.status).toBe('FAILED')
    expect(() => payment.markPaid()).toThrow(InvalidStateTransitionError)
  })

  test('snapshot/restore preserva o estado', () => {
    const payment = newPixPayment()
    payment.registerProviderCharge({
      providerPaymentId: 'txid-9',
      txid: 'txid-9',
      pixQrCode: { copiaECola: '000201...' },
    })
    const restored = PaymentAggregate.restore(payment.toSnapshot())
    expect(restored.id).toBe(payment.id)
    expect(restored.status).toBe('PENDING')
    expect(restored.txid).toBe('txid-9')
    expect(restored.amount.amountInCents).toBe(1000n)
    expect(restored.metadata).toEqual({ orderId: 'order-1' })
  })

  test('boleto: registerProviderCharge anexa o boleto e mantém PENDING', () => {
    const payment = PaymentAggregate.create({
      consumerId: 'sys-a',
      amount: Money.fromCents(5000),
      method: PaymentMethod.boleto(),
      idempotencyKey: IdempotencyKey.create('idem-boleto-1'),
      boletoRequest: { dueDate: '2026-06-10', fine: 200 },
    })
    payment.registerProviderCharge({
      providerPaymentId: '12345',
      boleto: { barcode: '3419...', digitableLine: '34191.7900...', pdfUrl: 'https://x/b.pdf' },
      expiresAt: new Date('2026-06-10T00:00:00Z'),
    })
    expect(payment.status).toBe('PENDING')
    expect(payment.providerPaymentId).toBe('12345')
    expect(payment.boleto?.digitableLine).toBe('34191.7900...')

    // snapshot/restore preserva boleto + boletoRequest
    const restored = PaymentAggregate.restore(payment.toSnapshot())
    expect(restored.boleto?.barcode).toBe('3419...')
    expect(restored.boletoRequest?.dueDate).toBe('2026-06-10')
    expect(restored.boletoRequest?.fine).toBe(200)
  })

  test('rejeita valor não-positivo na criação', () => {
    expect(() =>
      PaymentAggregate.create({
        consumerId: 'sys-a',
        amount: Money.fromCents(0),
        method: PaymentMethod.pix(),
        idempotencyKey: IdempotencyKey.create('idem-12345678'),
      }),
    ).toThrow()
  })

  describe('máquina de estados', () => {
    // Arestas PROIBIDAS representativas — uma corrupção na tabela (ex.: liberar
    // EXPIRED→PAID) seria pega aqui.
    const forbidden: [PaymentStatus, PaymentStatus][] = [
      ['PAID', 'FAILED'],
      ['EXPIRED', 'PAID'],
      ['REFUNDED', 'PAID'],
      ['AUTHORIZED', 'EXPIRED'],
      ['FAILED', 'PAID'],
      ['CANCELED', 'PAID'],
    ]
    for (const [from, to] of forbidden) {
      test(`proíbe ${from} → ${to}`, () => {
        expect(canTransition(from, to)).toBe(false)
      })
    }

    const allowed: [PaymentStatus, PaymentStatus][] = [
      ['PENDING', 'PAID'],
      ['PENDING', 'EXPIRED'],
      ['AUTHORIZED', 'PAID'],
      ['PAID', 'REFUNDED'],
    ]
    for (const [from, to] of allowed) {
      test(`permite ${from} → ${to}`, () => {
        expect(canTransition(from, to)).toBe(true)
      })
    }

    test('isTerminal cobre os estados finais', () => {
      expect(isTerminal('PAID')).toBe(false)
      expect(isTerminal('FAILED')).toBe(true)
      expect(isTerminal('EXPIRED')).toBe(true)
      expect(isTerminal('REFUNDED')).toBe(true)
    })
  })

  test('registerProviderCharge num pagamento não-PENDING lança erro', () => {
    const payment = newPixPayment()
    payment.registerProviderCharge({ providerPaymentId: 'txid-1', txid: 'txid-1' })
    payment.markPaid()
    expect(() =>
      payment.registerProviderCharge({ providerPaymentId: 'txid-2', txid: 'txid-2' }),
    ).toThrow(InvalidStateTransitionError)
  })

  test('agregado novo é isNew=true/version 0; restaurado é isNew=false', () => {
    const payment = newPixPayment()
    expect(payment.isNew).toBe(true)
    expect(payment.version).toBe(0)
    const restored = PaymentAggregate.restore(payment.toSnapshot())
    expect(restored.isNew).toBe(false)
    expect(restored.version).toBe(0)
  })
})
