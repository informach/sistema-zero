import { describe, expect, test } from 'bun:test'
import { paymentApprovedAt } from '../../src/server/payment-approved-at'

describe('paymentApprovedAt', () => {
  const fallback = new Date('2026-09-16T18:00:00.000Z')

  test('preserva o instante autoritativo informado pelo Payments', () => {
    expect(paymentApprovedAt('2026-09-16T14:25:30.000Z', fallback).toISOString()).toBe(
      '2026-09-16T14:25:30.000Z',
    )
  })

  test('usa o fallback somente quando o evento legado omite ou invalida paidAt', () => {
    expect(paymentApprovedAt(null, fallback)).toBe(fallback)
    expect(paymentApprovedAt('data-inválida', fallback)).toBe(fallback)
  })
})
