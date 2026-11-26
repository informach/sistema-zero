import type { GiftAudience } from '@sistemazero/core/referrals'

/** As situações de oferta do Catálogo (`OFFER_STATUSES` do catalog). */
export const GIFT_OFFER_STATUSES = ['draft', 'active', 'paused', 'archived'] as const
export type GiftOfferStatus = (typeof GIFT_OFFER_STATUSES)[number]

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
  /**
   * Situação no Catálogo. A leitura pública devolve a oferta ativa, pausada ou arquivada (o
   * rascunho é 404); arquivada não serve de presente, pausada serve (`giftOfferProblem`).
   */
  status: GiftOfferStatus
  /** Público do produto principal da oferta; null se o catálogo não informou. */
  audience: GiftAudience | null
  accessMode: 'fixed' | 'lifetime' | 'billing_cycle'
  accessDurationValue: number | null
  accessDurationUnit: 'days' | 'months' | null
  /**
   * Prazo DIVULGADO em dias (25/11/2026, `content.advertisedAccessDays` do catálogo), menor que o
   * real; null sem ele. Só o que as pessoas veem usa este prazo; o acesso real é o da oferta.
   */
  advertisedAccessDays: number | null
  /** `courseRef` do curso principal (item `isPrimary` com acesso `course`); null se não há. */
  courseSlug: string | null
  /** A oferta inclui o Mural completo (Kids ou adulto) como item. */
  includesMural: boolean
  /**
   * SKU do produto da oferta (25/11/2026): a página de venda é por produto, e as listas dos
   * embaixadores aceitam uma oferta por produto. Ausente nas leituras antigas.
   */
  productSku?: string | null
  /**
   * `content.pageSellable` (25/11/2026): a oferta pode ser vendida na página do produto pelo
   * `?oferta=`. Ausente nas leituras antigas (vale como `false`).
   */
  pageSellable?: boolean
}

export interface GiftOfferCatalog {
  /** Resolve por UUID ou slug. `null` = oferta inexistente (ou rascunho); lança se o Catálogo falhar. */
  resolve(offerRef: string): Promise<GiftOffer | null>
  /**
   * O slug da oferta PRINCIPAL do produto (a da página de venda), ou null sem principal/produto;
   * lança se o Catálogo falhar. Opcional: sem ele, a conferência da campanha de venda só olha a
   * marca `pageSellable`.
   */
  primaryOfferSlugOf?(productSku: string): Promise<string | null>
}
