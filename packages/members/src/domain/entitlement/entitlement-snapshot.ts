import type { AccessType, FulfillmentSpec } from './fulfillment'

/** Política comercial comprada, congelada junto com a matrícula. */
export type PurchasedAccessPolicy =
  | { mode: 'lifetime'; durationValue: null; durationUnit: null }
  | { mode: 'fixed'; durationValue: number; durationUnit: 'days' | 'months' }
  | { mode: 'billing_cycle'; durationValue: null; durationUnit: null }

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
  /** Ausente somente em snapshots gravados antes do contrato versionado. */
  accessPolicy?: PurchasedAccessPolicy
  /**
   * Público do PRESENTE (curso concedido pelo `grant-manual` S2S, 20/10/2026). Ausente em
   * snapshots anteriores e fora do presente: os avisos de fim do presente tratam como `kids`.
   */
  giftAudience?: 'kids' | 'adult'
}
