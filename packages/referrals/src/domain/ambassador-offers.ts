import type { AmbassadorOfferKind, GiftAudience } from '@sistemazero/core/referrals'
import { giftOfferProblem } from './gift-policy'
import type { GiftOffer } from './ports/gift-offer-catalog.port'

/** Uma lista longa demais vira uma página do embaixador impossível de escolher. */
export const MAX_AMBASSADOR_OFFERS = 20

export class AmbassadorOfferValidationError extends Error {}

/**
 * O motivo para recusar a oferta numa lista, ou null se serve. Presente segue a régua do presente
 * das campanhas (`giftOfferProblem`: pagamento único, sem prazo ou com prazo fixo em dias ou meses, não
 * arquivada, mesmo público). Indicação aceita qualquer oferta não arquivada do público (ter
 * página de venda é conferido no Admin, que fala com o funil).
 */
export function ambassadorOfferProblem(
  offer: GiftOffer,
  audience: GiftAudience,
  kind: AmbassadorOfferKind,
): string | null {
  if (kind === 'gift') return giftOfferProblem(offer, audience)
  if (offer.status === 'archived')
    return `A oferta ${offer.name} está arquivada no Catálogo. Escolha uma oferta ativa.`
  if (offer.status === 'draft') return `A oferta ${offer.name} ainda é rascunho no Catálogo.`
  if (offer.audience !== audience)
    return audience === 'adult'
      ? `A oferta ${offer.name} não é do público adulto.`
      : `A oferta ${offer.name} não é do público Kids.`
  return null
}

/** A oferta que a página do embaixador mostra (o essencial da oferta do Catálogo). */
export interface AmbassadorOfferOption {
  kind: AmbassadorOfferKind
  offerId: string
  offerSlug: string
  name: string
  audience: GiftAudience
  courseSlug: string | null
  accessDays: number | null
  includesMural: boolean
  /** Assinatura (a indicação que pode render bônus). */
  subscription: boolean
  /** Prazo em MESES da oferta de venda (o Cadê vendido: 12); null fora disso. */
  accessMonths?: number | null
  /** SKU do produto da oferta: o link curto `/i/<código>/<apelido>` acha a oferta por ele. */
  productSku?: string | null
}
