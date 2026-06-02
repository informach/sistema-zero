/** Tipo de desconto do cupom: percentual ou valor fixo (em centavos). */
export const COUPON_TYPES = ['percent', 'fixed'] as const

export type CouponType = (typeof COUPON_TYPES)[number]

export function isCouponType(value: unknown): value is CouponType {
  return typeof value === 'string' && (COUPON_TYPES as readonly string[]).includes(value)
}
