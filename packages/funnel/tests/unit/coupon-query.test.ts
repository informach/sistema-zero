import { describe, expect, test } from 'bun:test'
import { couponRequestFromSearchParams } from '../../src/lib/coupon-query'
import { resolveCharge } from '../../src/server/catalog'
import { resolveCouponPresentation } from '../../src/server/coupon-presentation'
import { gatewayWithQuote, validQuote } from './catalog-charge.test-helpers'

describe('cupom vindo de link ou QR Code', () => {
  test('cupom existente fora do período não aparece como código inexistente na página ou checkout', async () => {
    const gateway = gatewayWithQuote(
      {
        error: {
          code: 'COUPON_NOT_APPLICABLE',
          message: 'O cupom não está disponível no período desta campanha.',
        },
      },
      422,
    )
    const message =
      'Este cupom não está disponível para esta compra agora. Você pode continuar pelo preço normal.'
    expect(
      await resolveCouponPresentation(
        gateway,
        'desafio-primeiro-jogo-30-dias',
        new URLSearchParams('cupom=LAOPA50'),
      ),
    ).toMatchObject({ status: 'invalid', message })
    expect(await resolveCharge(gateway, 'desafio-primeiro-jogo-30-dias', 'LAOPA50')).toMatchObject({
      ok: false,
      code: 'INVALID_COUPON',
      message,
    })
  })

  test('expiração informa preço normal e falha de infraestrutura não vira cupom inválido', async () => {
    const params = new URLSearchParams('cupom=EVENTO50')
    const expired = await resolveCouponPresentation(
      gatewayWithQuote({ error: { code: 'COUPON_EXPIRED' } }, 422),
      'desafio-primeiro-jogo-30-dias',
      params,
    )
    expect(expired).toMatchObject({
      status: 'invalid',
      message: 'Este cupom expirou. Você ainda pode comprar pelo preço normal.',
    })
    const unavailable = await resolveCouponPresentation(
      gatewayWithQuote({ error: { code: 'INTERNAL_ERROR' } }, 500),
      'desafio-primeiro-jogo-30-dias',
      params,
    )
    expect(unavailable).toMatchObject({ status: 'error' })
    expect(JSON.stringify(unavailable)).not.toContain('expirou')
  })
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
