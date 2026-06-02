/** Ciclo de vida do cupom. Só `active` aplica desconto. */
export const COUPON_STATUSES = ['active', 'inactive', 'archived'] as const

export type CouponStatus = (typeof COUPON_STATUSES)[number]

export const DEFAULT_COUPON_STATUS: CouponStatus = 'active'

export function isCouponStatus(value: unknown): value is CouponStatus {
  return typeof value === 'string' && (COUPON_STATUSES as readonly string[]).includes(value)
}
