import type { FulfillmentSpec } from '../../domain/product/fulfillment'
import type { ResolvedEntitlement } from '../../domain/services/resolve-entitlements'

/** Item incluso (resumo) — o que o funil exibe em "o que está incluído". */
export interface EntitlementItemView {
  productId: string
  sku: string
  name: string
  kind: string
  isPrimary: boolean
}

export function toEntitlementItemView(r: ResolvedEntitlement): EntitlementItemView {
  return { productId: r.productId, sku: r.sku, name: r.name, kind: r.kind, isPrimary: r.isPrimary }
}

/**
 * Fulfillment ENTREGUE (fio/snapshot) — é o `FulfillmentSpec` do produto MAIS o
 * `maxProfiles` (teto de perfis kids), que NÃO vive no produto: a OFERTA o injeta aqui
 * na resolução de `/entitlements` (`GetOfferService.getEntitlements`). O members congela
 * isto no snapshot do grant e o `auth` usa ao criar perfil.
 */
export type EntitlementFulfillment = FulfillmentSpec & { maxProfiles?: number }

/** View completa do entitlement (inclui o `fulfillment` — para a área de membros). */
export interface EntitlementView extends EntitlementItemView {
  fulfillment: EntitlementFulfillment | null
}

export function toEntitlementView(r: ResolvedEntitlement): EntitlementView {
  return { ...toEntitlementItemView(r), fulfillment: r.fulfillment }
}
