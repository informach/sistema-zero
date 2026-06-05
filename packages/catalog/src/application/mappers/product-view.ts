import type { FulfillmentSpec } from '../../domain/product/fulfillment'
import type { ProductAggregate } from '../../domain/product/product.aggregate'

export interface ProductComponentView {
  productId: string
  sortOrder: number
  isPrimary: boolean
}

/** Resumo do produto — embutido na view da oferta. */
export interface ProductSummaryView {
  id: string
  sku: string
  slug: string
  name: string
  kind: string
  status: string
  sellable: boolean
}

/** View completa do produto (resposta admin). */
export interface ProductView extends ProductSummaryView {
  version: number
  description: string | null
  currency: string
  fulfillment: FulfillmentSpec | null
  metadata: Record<string, unknown> | null
  components: ProductComponentView[]
  createdAt: string
  updatedAt: string
}

/**
 * View PÚBLICA do produto (`GET /catalog/products/:slug` via gateway, sem auth):
 * só dados de marketing. NUNCA expõe `fulfillment` (o manifesto de entrega —
 * courseRef), `metadata`, `components` nem `version` — esses são da view admin.
 */
export interface PublicProductView extends ProductSummaryView {
  description: string | null
  currency: string
  createdAt: string
  updatedAt: string
}

export function toProductSummary(product: ProductAggregate): ProductSummaryView {
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    kind: product.kind,
    status: product.status,
    sellable: product.sellable,
  }
}

export function toPublicProductView(product: ProductAggregate): PublicProductView {
  return {
    ...toProductSummary(product),
    description: product.description,
    currency: product.currency,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

export function toProductView(product: ProductAggregate): ProductView {
  return {
    ...toProductSummary(product),
    version: product.version,
    description: product.description,
    currency: product.currency,
    fulfillment: product.fulfillment,
    metadata: product.metadata,
    components: product.components.map((c) => ({
      productId: c.componentProductId,
      sortOrder: c.sortOrder,
      isPrimary: c.isPrimary,
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}
