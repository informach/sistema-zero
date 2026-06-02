import type { CouponAggregate } from '../../domain/coupon/coupon.aggregate'

/** View completa do cupom (resposta admin). */
export interface CouponView {
  id: string
  version: number
  code: string
  type: string
  percentOff: number | null
  amountOffCents: number | null
  currency: string
  status: string
  appliesToAll: boolean
  minPurchaseCents: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  validFrom: string | null
  validUntil: string | null
  offerIds: string[]
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export function toCouponView(coupon: CouponAggregate): CouponView {
  return {
    id: coupon.id,
    version: coupon.version,
    code: coupon.code,
    type: coupon.type,
    percentOff: coupon.percentOff,
    amountOffCents: coupon.amountOffCents,
    currency: coupon.currency,
    status: coupon.status,
    appliesToAll: coupon.appliesToAll,
    minPurchaseCents: coupon.minPurchaseCents,
    maxRedemptions: coupon.maxRedemptions,
    timesRedeemed: coupon.timesRedeemed,
    validFrom: coupon.validFrom?.toISOString() ?? null,
    validUntil: coupon.validUntil?.toISOString() ?? null,
    offerIds: [...coupon.offerIds],
    metadata: coupon.metadata,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  }
}
