import { z } from 'zod'

const CouponQueryCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .transform((code) => code.toUpperCase())

export type CouponRequest =
  | { requested: false; code: null; invalid: false }
  | { requested: true; code: string; invalid: false }
  | { requested: true; code: string; invalid: true }

/**
 * Aceita o parâmetro público em português (`cupom`) e o alias legado/internacional
 * (`coupon`). Daqui em diante existe um único código normalizado em maiúsculas.
 */
export function couponRequestFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
): CouponRequest {
  const raw = searchParams.get('cupom') ?? searchParams.get('coupon')
  if (raw === null) return { requested: false, code: null, invalid: false }

  const parsed = CouponQueryCodeSchema.safeParse(raw)
  if (parsed.success) return { requested: true, code: parsed.data, invalid: false }

  return {
    requested: true,
    code: raw.trim().slice(0, 60).toUpperCase(),
    invalid: true,
  }
}

export type CouponPresentation =
  | { status: 'none' }
  | {
      status: 'valid'
      code: string
      listPriceCents: number
      discountCents: number
      finalPriceCents: number
    }
  | { status: 'invalid' | 'error'; code: string; message: string }
