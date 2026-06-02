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

/** View completa do entitlement (inclui o `fulfillment` — para a futura área de membros). */
export interface EntitlementView extends EntitlementItemView {
  fulfillment: FulfillmentSpec | null
}

export function toEntitlementView(r: ResolvedEntitlement): EntitlementView {
  return { ...toEntitlementItemView(r), fulfillment: r.fulfillment }
}
