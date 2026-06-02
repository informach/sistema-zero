/**
 * Ciclo de vida do produto. `draft` = em cadastro; `active` = publicável/vendável;
 * `archived` = aposentado (não some, preserva histórico/entitlements).
 */
export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const DEFAULT_PRODUCT_STATUS: ProductStatus = 'draft'

export function isProductStatus(value: unknown): value is ProductStatus {
  return typeof value === 'string' && (PRODUCT_STATUSES as readonly string[]).includes(value)
}
