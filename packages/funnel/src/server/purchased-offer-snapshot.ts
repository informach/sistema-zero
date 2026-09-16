import type {
  CatalogAccessDurationUnit,
  CatalogAccessMode,
  CatalogPricingMode,
  ResolvedCharge,
} from './catalog'

export interface PurchasedOfferSnapshotV1 {
  version: 1
  offerId: string
  offerSlug: string
  pricingMode: CatalogPricingMode
  billingIntervalMonths: number | null
  accessMode: CatalogAccessMode
  accessDurationValue: number | null
  accessDurationUnit: CatalogAccessDurationUnit | null
  listPriceCents: number
  couponCode: string | null
  discountCents: number
  chargedPriceCents: number
  currency: 'BRL'
  guaranteeDays: number | null
  termsVersion: string
}

export class InvalidPurchasedOfferSnapshotError extends Error {
  constructor(message = 'Snapshot da oferta comprada é inválido.') {
    super(message)
    this.name = 'InvalidPurchasedOfferSnapshotError'
  }
}

export function termsVersionForFunnel(funnel: string | null): string {
  return funnel?.startsWith('kids/') ? 'kids-2026-09-16' : 'pro-2026-06-04'
}

/**
 * Congela a cotação aceita. `annualUpfront` representa a exceção comercial já
 * existente: a oferta anual de assinatura também pode ser quitada uma vez por
 * Pix/boleto, resultando em 12 meses fixos, sem renovação automática.
 */
export function createPurchasedOfferSnapshot(
  charge: ResolvedCharge,
  input: { termsVersion: string; annualUpfront?: boolean },
): PurchasedOfferSnapshotV1 {
  const snapshot: PurchasedOfferSnapshotV1 = input.annualUpfront
    ? {
        version: 1,
        offerId: charge.offerId,
        offerSlug: charge.offerSlug,
        pricingMode: 'one_time',
        billingIntervalMonths: null,
        accessMode: 'fixed',
        accessDurationValue: 12,
        accessDurationUnit: 'months',
        listPriceCents: charge.listPriceCents,
        couponCode: charge.couponCode,
        discountCents: charge.discountCents,
        chargedPriceCents: charge.amountInCents,
        currency: charge.currency,
        guaranteeDays: charge.guaranteeDays,
        termsVersion: input.termsVersion,
      }
    : {
        version: 1,
        offerId: charge.offerId,
        offerSlug: charge.offerSlug,
        pricingMode: charge.pricingMode,
        billingIntervalMonths: charge.billingIntervalMonths,
        accessMode: charge.accessMode,
        accessDurationValue: charge.accessDurationValue,
        accessDurationUnit: charge.accessDurationUnit,
        listPriceCents: charge.listPriceCents,
        couponCode: charge.couponCode,
        discountCents: charge.discountCents,
        chargedPriceCents: charge.amountInCents,
        currency: charge.currency,
        guaranteeDays: charge.guaranteeDays,
        termsVersion: input.termsVersion,
      }

  const parsed = parsePurchasedOfferSnapshot(snapshot)
  if (!parsed) throw new InvalidPurchasedOfferSnapshotError()
  return parsed
}

export function parsePurchasedOfferSnapshot(value: unknown): PurchasedOfferSnapshotV1 | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Record<string, unknown>
  if (s.version !== 1) return null
  if (typeof s.offerId !== 'string' || !s.offerId) return null
  if (typeof s.offerSlug !== 'string' || !s.offerSlug) return null
  if (s.pricingMode !== 'one_time' && s.pricingMode !== 'subscription') return null
  if (s.currency !== 'BRL') return null
  if (typeof s.termsVersion !== 'string' || !s.termsVersion) return null
  if (!positiveInteger(s.listPriceCents) || !positiveInteger(s.chargedPriceCents)) return null
  if (!nonNegativeInteger(s.discountCents)) return null
  if ((s.listPriceCents as number) - (s.discountCents as number) !== s.chargedPriceCents) {
    return null
  }
  if (s.couponCode !== null && (typeof s.couponCode !== 'string' || !s.couponCode)) return null
  if ((s.discountCents as number) > 0 && s.couponCode === null) return null
  if (s.guaranteeDays !== null && !positiveInteger(s.guaranteeDays)) return null

  const billingIntervalMonths = s.billingIntervalMonths
  if (s.pricingMode === 'subscription') {
    if (!positiveInteger(billingIntervalMonths)) return null
    if (
      s.accessMode !== 'billing_cycle' ||
      s.accessDurationValue !== null ||
      s.accessDurationUnit !== null
    ) {
      return null
    }
  } else {
    if (billingIntervalMonths !== null || s.accessMode === 'billing_cycle') return null
    if (s.accessMode === 'lifetime') {
      if (s.accessDurationValue !== null || s.accessDurationUnit !== null) return null
    } else if (s.accessMode === 'fixed') {
      if (!positiveInteger(s.accessDurationValue)) return null
      if (s.accessDurationUnit !== 'days' && s.accessDurationUnit !== 'months') return null
    } else {
      return null
    }
  }

  return s as unknown as PurchasedOfferSnapshotV1
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}
