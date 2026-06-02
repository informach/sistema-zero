/**
 * Modo de cobrança da oferta. `one_time` = pagamento único (Pix/boleto/cartão à
 * vista ou parcelado); `subscription` = recorrência (cartão). O payments já suporta
 * ambos — a oferta só declara qual modo usar.
 */
export const PRICING_MODES = ['one_time', 'subscription'] as const

export type PricingMode = (typeof PRICING_MODES)[number]

export const DEFAULT_PRICING_MODE: PricingMode = 'one_time'

export function isPricingMode(value: unknown): value is PricingMode {
  return typeof value === 'string' && (PRICING_MODES as readonly string[]).includes(value)
}
