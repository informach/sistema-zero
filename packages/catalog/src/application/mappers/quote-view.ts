/** Cupom aplicado (resumo) na cotação. */
export interface AppliedCouponView {
  code: string
  type: string
  percentOff: number | null
  amountOffCents: number | null
}

/**
 * Cotação de uma oferta (com cupom opcional) — o que o funil usa para cobrar o
 * valor AUTORITATIVO no checkout: `finalPriceCents` é o que vai ao payments.
 */
export interface OfferQuoteView {
  offerId: string
  offerSlug: string
  currency: string
  priceCents: number
  discountCents: number
  finalPriceCents: number
  coupon: AppliedCouponView | null
}
