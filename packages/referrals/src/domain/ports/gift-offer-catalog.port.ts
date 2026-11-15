import type { GiftAudience } from '@sistemazero/core/referrals'

/**
 * A oferta do catálogo que o presente concede (15/11/2026), resumida no que o referrals usa:
 * público (do produto principal), política de acesso, o curso principal e se inclui o Mural
 * completo. Quem concede de fato é o members (`grant-manual` `mode:'offer'`).
 */
export interface GiftOffer {
  offerId: string
  offerSlug: string
  /** Nome comercial da oferta (título do presente na leitura pública). */
  name: string
  status: string
  /** Público do produto principal da oferta; null se o catálogo não informou. */
  audience: GiftAudience | null
  accessMode: 'fixed' | 'lifetime' | 'billing_cycle'
  accessDurationValue: number | null
  accessDurationUnit: 'days' | 'months' | null
  /** `courseRef` do curso principal (item `isPrimary` com acesso `course`); null se não há. */
  courseSlug: string | null
  /** A oferta inclui o Mural completo (Kids ou adulto) como item. */
  includesMural: boolean
}

export interface GiftOfferCatalog {
  /** Resolve por UUID ou slug. `null` = oferta inexistente (ou rascunho); lança se o Catálogo falhar. */
  resolve(offerRef: string): Promise<GiftOffer | null>
}
