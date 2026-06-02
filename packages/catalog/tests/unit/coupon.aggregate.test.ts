import { describe, expect, it } from 'bun:test'
import { CouponAggregate } from '../../src/domain/coupon/coupon.aggregate'
import {
  CouponExhaustedError,
  CouponNotApplicableError,
} from '../../src/domain/coupon/coupon.errors'
import { ValidationError } from '../../src/domain/shared/errors'
import { CouponCode } from '../../src/domain/value-objects/coupon-code'

function percentCoupon(
  percentOff: number,
  overrides?: Partial<Parameters<typeof CouponAggregate.create>[0]>,
) {
  return CouponAggregate.create({
    id: 'coupon-1',
    code: CouponCode.create('PROMO'),
    type: 'percent',
    percentOff,
    appliesToAll: true,
    ...overrides,
  })
}

describe('CouponAggregate', () => {
  it('normaliza o código para maiúsculas', () => {
    expect(CouponCode.create(' promo10 ').value).toBe('PROMO10')
  })

  it('percentual: desconto = floor(preço * percent / 100), limitado ao preço', () => {
    const coupon = percentCoupon(10)
    expect(coupon.computeDiscountCents(3700)).toBe(370)
    expect(percentCoupon(33).computeDiscountCents(3700)).toBe(1221) // floor(1221.0)
    expect(percentCoupon(100).computeDiscountCents(3700)).toBe(3700)
  })

  it('fixo: desconto = min(amountOff, preço)', () => {
    const coupon = CouponAggregate.create({
      id: 'c',
      code: CouponCode.create('MENOS10'),
      type: 'fixed',
      amountOffCents: 1000,
      appliesToAll: true,
    })
    expect(coupon.computeDiscountCents(3700)).toBe(1000)
    expect(coupon.computeDiscountCents(500)).toBe(500) // não passa do preço
  })

  it('percentual exige percentOff 1..100', () => {
    expect(() => percentCoupon(0)).toThrow(ValidationError)
    expect(() => percentCoupon(101)).toThrow(ValidationError)
  })

  it('assertApplicable: inativo → não aplicável', () => {
    const coupon = percentCoupon(10, { status: 'inactive' })
    expect(() => coupon.assertApplicable('offer-1', 3700)).toThrow(CouponNotApplicableError)
  })

  it('assertApplicable: expirado → não aplicável', () => {
    const coupon = percentCoupon(10, { validUntil: new Date(Date.now() - 1000) })
    expect(() => coupon.assertApplicable('offer-1', 3700)).toThrow(CouponNotApplicableError)
  })

  it('assertApplicable: fora do escopo (não appliesToAll, oferta não listada)', () => {
    const coupon = percentCoupon(10, { appliesToAll: false, offerIds: ['outra'] })
    expect(() => coupon.assertApplicable('offer-1', 3700)).toThrow(CouponNotApplicableError)
    expect(() => coupon.assertApplicable('outra', 3700)).not.toThrow()
  })

  it('assertApplicable: abaixo do mínimo → não aplicável', () => {
    const coupon = percentCoupon(10, { minPurchaseCents: 5000 })
    expect(() => coupon.assertApplicable('offer-1', 3700)).toThrow(CouponNotApplicableError)
  })

  it('assertApplicable: esgotado → CouponExhaustedError', () => {
    const coupon = CouponAggregate.restore({
      ...percentCoupon(10, { maxRedemptions: 1 }).toSnapshot(),
      timesRedeemed: 1,
    })
    expect(() => coupon.assertApplicable('offer-1', 3700)).toThrow(CouponExhaustedError)
  })
})
