import type { FulfillmentSpec } from '../entitlement/fulfillment'

/** Um item entregável resolvido pela oferta (espelha o que o catálogo devolve). */
export interface ResolvedOfferItem {
  productId: string
  sku: string
  name: string
  kind: string
  isPrimary: boolean
  fulfillment: FulfillmentSpec | null
}

export interface ResolvedOffer {
  offerId: string
  offerSlug: string
  items: ResolvedOfferItem[]
}

/**
 * Porta para o catálogo (fonte da verdade do "o que a oferta dá direito"). A
 * implementação chama `GET /catalog/offers/:slug/entitlements`. `null` = oferta
 * inexistente. Usada no momento do grant para congelar o snapshot.
 */
export interface CatalogGateway {
  resolveOfferEntitlements(offerIdOrSlug: string): Promise<ResolvedOffer | null>
}
