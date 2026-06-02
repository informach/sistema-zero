import type { OfferAggregate, OfferContent } from '../../domain/offer/offer.aggregate'
import type { EntitlementItemView } from './entitlement-view'
import type { ProductSummaryView } from './product-view'

/**
 * View da oferta — o CONTRATO que o funil consome (fonte da verdade comercial):
 * preço, condições e os itens inclusos resolvidos (combo + extras), com o principal.
 */
export interface OfferView {
  id: string
  code: string
  slug: string
  name: string
  status: string
  priceCents: number
  compareAtPriceCents: number | null
  currency: string
  pricingMode: string
  installmentsMax: number | null
  trialDays: number | null
  guaranteeDays: number | null
  availableFrom: string | null
  availableUntil: string | null
  content: OfferContent | null
  isAvailable: boolean
  product: ProductSummaryView
  includes: EntitlementItemView[]
  createdAt: string
  updatedAt: string
}

export function toOfferView(
  offer: OfferAggregate,
  product: ProductSummaryView,
  includes: EntitlementItemView[],
  now: Date = new Date(),
): OfferView {
  return {
    id: offer.id,
    code: offer.code,
    slug: offer.slug,
    name: offer.name,
    status: offer.status,
    priceCents: offer.priceCents,
    compareAtPriceCents: offer.compareAtPriceCents,
    currency: offer.currency,
    pricingMode: offer.pricingMode,
    installmentsMax: offer.installmentsMax,
    trialDays: offer.trialDays,
    guaranteeDays: offer.guaranteeDays,
    availableFrom: offer.availableFrom?.toISOString() ?? null,
    availableUntil: offer.availableUntil?.toISOString() ?? null,
    content: offer.content,
    isAvailable: offer.isAvailable(now),
    product,
    includes,
    createdAt: offer.createdAt.toISOString(),
    updatedAt: offer.updatedAt.toISOString(),
  }
}
