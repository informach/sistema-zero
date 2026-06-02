import type { AccessType, FulfillmentSpec } from './fulfillment'

/**
 * Snapshot CONGELADO do que a oferta concedeu no momento do grant (padrão "pedido
 * imutável" do e-commerce + Stripe Entitlements). Mudar a oferta no catálogo
 * depois NÃO altera o que já foi concedido. É gravado em `entitlements.snapshot`.
 */
export interface EntitlementSnapshot {
  offerId: string
  offerSlug: string
  productId: string
  sku: string
  name: string
  /** `kind` do produto no catálogo (snapshot textual — não acopla ao enum do catálogo). */
  kind: string
  accessType: AccessType
  courseRef: string | null
  fulfillment: FulfillmentSpec | null
  /** ISO-8601 de quando o catálogo foi resolvido. */
  resolvedAt: string
}
