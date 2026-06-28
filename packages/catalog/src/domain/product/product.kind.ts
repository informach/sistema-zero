/**
 * Natureza do entregável. Guia como a área de membros libera o produto.
 * `bundle` = combo (um produto que inclui outros — ver `product_components`).
 */
export const PRODUCT_KINDS = [
  'ebook',
  'course',
  'template_kit',
  'community',
  'service',
  'bundle',
  // Ferramenta/app vendável fora de trilha (ex.: Estúdio Completo). Taxonomia
  // comercial — a entrega segue via fulfillment (`accessType: 'community'`, a CHAVE
  // casa com o `/members/access`); o `kind` só diz "o que é", não como libera.
  'tool',
  'other',
] as const

export type ProductKind = (typeof PRODUCT_KINDS)[number]

export const DEFAULT_PRODUCT_KIND: ProductKind = 'other'

export function isProductKind(value: unknown): value is ProductKind {
  return typeof value === 'string' && (PRODUCT_KINDS as readonly string[]).includes(value)
}
