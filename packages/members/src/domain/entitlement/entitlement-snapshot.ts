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
  /**
   * Prazo DIVULGADO em dias (25/11/2026, `advertisedAccessDays` da oferta), menor que o prazo
   * real do `accessPolicy`. Não muda o acesso: no fim do divulgado sai o e-mail dos dias a mais.
   */
  advertisedAccessDays?: number
  /**
   * Fim DIVULGADO (ISO), calculado na concessão: o e-mail dos dias a mais sai nesta data e não é
   * recalculado se o fim real mudar depois (extensão, nova compra, ajuste do admin).
   */
  advertisedEndsAt?: string
}

/**
 * O prazo divulgado só vai ao snapshot abaixo de um prazo real em dias (o e-mail dos dias de
 * surpresa sai no fim dele).
 */
export function advertisedDaysFor(
  advertised: number | undefined,
  policy: PurchasedAccessPolicy | null | undefined,
  /** O fim real gravado nesta concessão: dele sai o fim divulgado. */
  expiresAt?: Date | null,
): { advertisedAccessDays?: number; advertisedEndsAt?: string } {
  if (advertised === undefined || !policy || policy.mode !== 'fixed') return {}
  if (policy.durationUnit !== 'days' || advertised >= policy.durationValue) return {}
  const extraMs = (policy.durationValue - advertised) * 86_400_000
  return {
    advertisedAccessDays: advertised,
    ...(expiresAt
      ? { advertisedEndsAt: new Date(expiresAt.getTime() - extraMs).toISOString() }
      : {}),
  }
}
