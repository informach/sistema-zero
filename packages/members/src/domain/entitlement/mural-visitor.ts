import type { EntitlementSnapshot } from './entitlement-snapshot'

/** Direito independente de leitura do Mural; não depende de um produto do catálogo. */
export const MURAL_VISITOR_PRODUCT_ID = '00000000-0000-0000-0000-000000000002'
export const MURAL_VISITOR_REF = 'mural-dos-criadores-visitante'
export const MURAL_FULL_REF = 'mural-dos-criadores'

export function createMuralVisitorSnapshot(
  offerId: string,
  offerSlug: string,
  grantedAt: Date,
): EntitlementSnapshot {
  return {
    offerId,
    offerSlug,
    productId: MURAL_VISITOR_PRODUCT_ID,
    sku: MURAL_VISITOR_REF,
    name: 'Visita ao Mural dos Criadores',
    kind: 'community',
    accessType: 'community',
    courseRef: MURAL_VISITOR_REF,
    fulfillment: { accessType: 'community', courseRef: MURAL_VISITOR_REF },
    resolvedAt: grantedAt.toISOString(),
    accessPolicy: { mode: 'lifetime', durationValue: null, durationUnit: null },
  }
}
