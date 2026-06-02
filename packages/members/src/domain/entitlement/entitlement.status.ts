/** Estado da matrícula. Só `active` (e não expirada) concede acesso. */
export const ENTITLEMENT_STATUSES = ['active', 'revoked', 'expired', 'pending'] as const
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number]

/** Origem do direito de acesso: compra única, assinatura, ou concessão manual (admin). */
export const ENTITLEMENT_SOURCE_KINDS = ['payment', 'subscription', 'manual'] as const
export type EntitlementSourceKind = (typeof ENTITLEMENT_SOURCE_KINDS)[number]
