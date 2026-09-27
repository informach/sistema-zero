import { describe, expect, test } from 'bun:test'
import type { GatewayClient } from '../../src/lib/gateway-client'
import { resolveCharge } from '../../src/server/catalog'

function gatewayWithQuote(body: unknown): GatewayClient {
  return {
    quoteOffer: async () => ({ status: 200, body }),
  } as unknown as GatewayClient
}

function validQuote(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    offerId: 'offer-1',
    offerSlug: 'desafio-primeiro-jogo-30-dias',
    priceCents: 6700,
    discountCents: 0,
    finalPriceCents: 6700,
    currency: 'BRL',
    pricingMode: 'one_time',
    billingIntervalMonths: null,
    guaranteeDays: 7,
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    coupon: null,
    ...patch,
  }
}

describe('cotação autoritativa da cobrança', () => {
  test('entrega preço e política de acesso do mesmo contrato', async () => {
    expect(
      await resolveCharge(gatewayWithQuote(validQuote()), 'desafio-primeiro-jogo-30-dias'),
    ).toMatchObject({
      ok: true,
      amountInCents: 6700,
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
    })
  })

  test('recusa preço incoerente antes de criar o pagamento', async () => {
    const result = await resolveCharge(
      gatewayWithQuote(validQuote({ discountCents: 3000, finalPriceCents: 6700 })),
      'desafio-primeiro-jogo-30-dias',
      'EVENTO',
    )

    expect(result).toEqual({
      ok: false,
      status: 502,
      code: 'CATALOG_ERROR',
      message: 'Resposta inválida do catálogo.',
    })
  })

  test('recusa cupom ausente ou inesperado na resposta', async () => {
    const missing = await resolveCharge(
      gatewayWithQuote(validQuote()),
      'desafio-primeiro-jogo-30-dias',
      'EVENTO',
    )
    const unexpected = await resolveCharge(
      gatewayWithQuote(validQuote({ coupon: { code: 'EVENTO' } })),
      'desafio-primeiro-jogo-30-dias',
    )

    expect(missing.ok).toBe(false)
    expect(unexpected.ok).toBe(false)
  })
})
