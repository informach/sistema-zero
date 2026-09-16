import { describe, expect, test } from 'bun:test'
import { couponRequestFromSearchParams } from '../../src/lib/coupon-query'
import { resolveCouponPresentation } from '../../src/server/coupon-presentation'
import { gatewayWithQuote, validQuote } from './catalog-charge.test-helpers'

describe('cupom vindo de link ou QR Code', () => {
  test('normaliza ?cupom= e aceita ?coupon= como alias', () => {
    expect(couponRequestFromSearchParams(new URLSearchParams('cupom= evento-abc '))).toEqual({
      requested: true,
      code: 'EVENTO-ABC',
      invalid: false,
    })
    expect(couponRequestFromSearchParams(new URLSearchParams('coupon=clinica37'))).toEqual({
      requested: true,
      code: 'CLINICA37',
      invalid: false,
    })
  })

  test('nunca apresenta desconto sem cotação autoritativa válida', async () => {
    const valid = await resolveCouponPresentation(
      gatewayWithQuote(
        validQuote({
          priceCents: 6_700,
          discountCents: 3_000,
          finalPriceCents: 3_700,
          coupon: { code: 'EVENTO' },
        }),
      ),
      'desafio-primeiro-jogo-30-dias',
      new URLSearchParams('cupom=evento'),
    )
    expect(valid).toEqual({
      status: 'valid',
      code: 'EVENTO',
      listPriceCents: 6_700,
      discountCents: 3_000,
      finalPriceCents: 3_700,
    })

    const inconsistent = await resolveCouponPresentation(
      gatewayWithQuote(
        validQuote({
          priceCents: 6_700,
          discountCents: 3_000,
          finalPriceCents: 6_700,
          coupon: { code: 'EVENTO' },
        }),
      ),
      'desafio-primeiro-jogo-30-dias',
      new URLSearchParams('cupom=evento'),
    )
    expect(inconsistent.status).toBe('error')
  })
})
