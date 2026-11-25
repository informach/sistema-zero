import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import {
  AMBASSADOR_OFFER_KINDS,
  type AmbassadorOfferKind,
  type AmbassadorOffersInput,
  type AmbassadorOfferView,
  type GiftAudience,
  isGiftAudience,
} from '@sistemazero/core/referrals'
import {
  type AmbassadorOfferOption,
  AmbassadorOfferValidationError,
  ambassadorOfferProblem,
  MAX_AMBASSADOR_OFFERS,
} from '../../domain/ambassador-offers'
import { GiftCatalogUnavailableError } from '../../domain/campaign'
import { giftAdvertisedDays } from '../../domain/gift-policy'
import type { AmbassadorOfferRepository } from '../../domain/ports/ambassador-offer-repository.port'
import type { GiftOffer, GiftOfferCatalog } from '../../domain/ports/gift-offer-catalog.port'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * As listas do Admin com as ofertas que os embaixadores podem mandar (25/11/2026), por público e
 * tipo. A página do embaixador só oferece o que está aqui, ligado; a resolução do link confere a
 * oferta contra a mesma lista.
 */
export class AmbassadorOffersService {
  constructor(
    private readonly repo: AmbassadorOfferRepository,
    private readonly catalog: GiftOfferCatalog,
    private readonly logger: Logger,
  ) {}

  async list(audience: GiftAudience): Promise<Record<AmbassadorOfferKind, AmbassadorOfferView[]>> {
    const rows = await this.repo.list(audience)
    return {
      gift: rows.filter((r) => r.kind === 'gift'),
      referral: rows.filter((r) => r.kind === 'referral'),
    }
  }

  async replace(input: AmbassadorOffersInput): Promise<AmbassadorOfferView[]> {
    if (!isGiftAudience(input.audience) || !AMBASSADOR_OFFER_KINDS.includes(input.kind))
      throw new AmbassadorOfferValidationError('Escolha o público e o tipo da lista.')
    if (input.items.length > MAX_AMBASSADOR_OFFERS)
      throw new AmbassadorOfferValidationError(
        `A lista aceita até ${MAX_AMBASSADOR_OFFERS} ofertas.`,
      )
    const seen = new Set<string>()
    for (const item of input.items) {
      if (!UUID.test(item.offerId))
        throw new AmbassadorOfferValidationError('Escolha ofertas válidas do Catálogo.')
      const id = item.offerId.toLowerCase()
      if (seen.has(id))
        throw new AmbassadorOfferValidationError('A mesma oferta aparece duas vezes na lista.')
      seen.add(id)
    }
    // Só as ligadas precisam servir AGORA; uma desligada pode ficar na lista (pausada no
    // Catálogo, por exemplo) sem bloquear o save.
    for (const item of input.items.filter((i) => i.enabled)) {
      const offer = await this.resolve(item.offerId)
      if (!offer)
        throw new AmbassadorOfferValidationError('Uma das ofertas não foi encontrada no Catálogo.')
      const problem = ambassadorOfferProblem(offer, input.audience, input.kind)
      if (problem) throw new AmbassadorOfferValidationError(problem)
    }
    return this.repo.replace(input.audience, input.kind, input.items)
  }

  /**
   * As opções ligadas do público, já com o essencial da oferta, na ordem do Admin. Oferta que
   * deixou de servir (arquivada, público trocado) some da página sem derrubar as outras; o
   * catálogo fora devolve o que der (as falhas ficam no log).
   */
  async options(audience: GiftAudience): Promise<AmbassadorOfferOption[]> {
    const rows = (await this.repo.list(audience)).filter((r) => r.enabled)
    const result: AmbassadorOfferOption[] = []
    for (const row of rows) {
      let offer: GiftOffer | null
      try {
        offer = await this.catalog.resolve(row.offerId)
      } catch (error) {
        this.logger.warn('referrals.ambassador_offer_catalog_failed', {
          offerId: row.offerId,
          error: serializeError(error),
        })
        continue
      }
      if (!offer || ambassadorOfferProblem(offer, audience, row.kind)) continue
      result.push({
        kind: row.kind,
        offerId: offer.offerId,
        offerSlug: offer.offerSlug,
        name: offer.name,
        audience,
        courseSlug: offer.courseSlug,
        // O prazo que a página e a mensagem mostram (o divulgado, quando a oferta tem um).
        accessDays: offer.accessMode === 'billing_cycle' ? null : giftAdvertisedDays(offer),
        includesMural: offer.includesMural,
        subscription: offer.accessMode === 'billing_cycle',
      })
    }
    return result
  }

  /** A opção ligada do público e tipo com este slug ou id; null se não está na lista. */
  async allowed(
    audience: GiftAudience,
    kind: AmbassadorOfferKind,
    offerRef: string,
  ): Promise<AmbassadorOfferOption | null> {
    const ref = offerRef.trim().toLowerCase()
    const options = await this.options(audience)
    return (
      options.find(
        (o) =>
          o.kind === kind && (o.offerSlug.toLowerCase() === ref || o.offerId.toLowerCase() === ref),
      ) ?? null
    )
  }

  private async resolve(offerId: string): Promise<GiftOffer | null> {
    try {
      return await this.catalog.resolve(offerId)
    } catch {
      throw new GiftCatalogUnavailableError()
    }
  }
}
