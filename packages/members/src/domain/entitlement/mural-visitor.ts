import { creatorCommunityAccessRef } from '@sistemazero/core/creations'
import type { EntitlementSnapshot } from './entitlement-snapshot'

/** Direito independente de leitura do Mural; não depende de um produto do catálogo. */
export const MURAL_VISITOR_PRODUCT_ID = '00000000-0000-0000-0000-000000000002'
export const MURAL_VISITOR_REF = 'mural-dos-criadores-visitante'
export const MURAL_FULL_REF = 'mural-dos-criadores'
/** Concessão temporária do presente, independente de produtos pagos e da visita. */
export const MURAL_TRIAL_PRODUCT_ID = '00000000-0000-0000-0000-000000000003'

/**
 * Mural ADULTO (Mostra `mural-dos-criadores-adulto`, 20/10/2026): mesmas regras do Kids com as
 * chaves adultas de `creatorCommunityAccessRef`. Sentinels próprios: o presente adulto e o Kids da
 * mesma conta nunca compartilham matrícula.
 */
export const ADULT_MURAL_FULL_REF = creatorCommunityAccessRef(MURAL_FULL_REF, 'adult')
export const ADULT_MURAL_VISITOR_REF = creatorCommunityAccessRef(MURAL_VISITOR_REF, 'adult')
export const ADULT_MURAL_TRIAL_PRODUCT_ID = '00000000-0000-0000-0000-000000000004'
export const ADULT_MURAL_VISITOR_PRODUCT_ID = '00000000-0000-0000-0000-000000000005'

export type MuralAudience = 'kids' | 'adult'

/** As chaves e os produtos sintéticos do Mural de cada público. */
export const MURAL_GIFT_ACCESS = {
  kids: {
    fullRef: MURAL_FULL_REF,
    visitorRef: MURAL_VISITOR_REF,
    trialProductId: MURAL_TRIAL_PRODUCT_ID,
    visitorProductId: MURAL_VISITOR_PRODUCT_ID,
    visitorName: 'Visita ao Mural dos Criadores',
  },
  adult: {
    fullRef: ADULT_MURAL_FULL_REF,
    visitorRef: ADULT_MURAL_VISITOR_REF,
    trialProductId: ADULT_MURAL_TRIAL_PRODUCT_ID,
    visitorProductId: ADULT_MURAL_VISITOR_PRODUCT_ID,
    visitorName: 'Visita ao Mural dos Criadores (adultos)',
  },
} as const satisfies Record<
  MuralAudience,
  {
    fullRef: string
    visitorRef: string
    trialProductId: string
    visitorProductId: string
    visitorName: string
  }
>

export function createMuralVisitorSnapshot(
  offerId: string,
  offerSlug: string,
  grantedAt: Date,
  audience: MuralAudience = 'kids',
): EntitlementSnapshot {
  const access = MURAL_GIFT_ACCESS[audience]
  return {
    offerId,
    offerSlug,
    productId: access.visitorProductId,
    sku: access.visitorRef,
    name: access.visitorName,
    kind: 'community',
    accessType: 'community',
    courseRef: access.visitorRef,
    fulfillment: { accessType: 'community', courseRef: access.visitorRef },
    resolvedAt: grantedAt.toISOString(),
    accessPolicy: { mode: 'lifetime', durationValue: null, durationUnit: null },
  }
}
