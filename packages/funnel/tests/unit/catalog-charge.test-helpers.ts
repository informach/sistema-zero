import type { GatewayClient } from '../../src/lib/gateway-client'

export function validQuote(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    offerId: 'offer-1',
    offerSlug: 'desafio-primeiro-jogo-30-dias',
    priceCents: 6_700,
    discountCents: 0,
    finalPriceCents: 6_700,
    currency: 'BRL',
    pricingMode: 'one_time',
    billingIntervalMonths: null,
    guaranteeDays: 7,
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    coupon: null,
    ...overrides,
  }
}

export function gatewayWithQuote(body: unknown, status = 200): GatewayClient {
  return {
    quoteOffer: async () => ({ status, body }),
  } as unknown as GatewayClient
}
