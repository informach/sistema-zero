/**
 * Ciclo de vida da oferta. `draft` = em cadastro; `active` = à venda; `paused` =
 * fora do ar temporariamente; `archived` = aposentada.
 */
export const OFFER_STATUSES = ['draft', 'active', 'paused', 'archived'] as const

export type OfferStatus = (typeof OFFER_STATUSES)[number]

export const DEFAULT_OFFER_STATUS: OfferStatus = 'draft'

export function isOfferStatus(value: unknown): value is OfferStatus {
  return typeof value === 'string' && (OFFER_STATUSES as readonly string[]).includes(value)
}
