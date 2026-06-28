import type { Logger } from '@sistemazero/core/logging'
import type { OfferAggregate } from '../../domain/offer/offer.aggregate'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import { ProductNotFoundError } from '../../domain/product/product.errors'
import {
  type EntitlementView,
  toEntitlementItemView,
  toEntitlementView,
} from '../mappers/entitlement-view'
import { type OfferView, toOfferView } from '../mappers/offer-view'
import { toProductSummary } from '../mappers/product-view'
import type { ResolveOfferEntitlementsService } from '../resolve-offer-entitlements/resolve-offer-entitlements.service'

export interface OfferEntitlementsResult {
  offerId: string
  offerSlug: string
  items: EntitlementView[]
}

/**
 * Leitura de oferta (consumo do funil): monta a `OfferView` (preço + condições +
 * itens inclusos resolvidos) e a definição de acesso completa (entitlements).
 */
export class GetOfferService {
  constructor(
    private readonly offers: OfferRepository,
    private readonly products: ProductRepository,
    private readonly resolver: ResolveOfferEntitlementsService,
    private readonly logger: Logger,
  ) {}

  async getBySlug(slug: string): Promise<OfferView | null> {
    const offer = await this.offers.findBySlug(slug)
    return offer ? this.toView(offer) : null
  }

  async getById(id: string): Promise<OfferView | null> {
    const offer = await this.offers.findById(id)
    return offer ? this.toView(offer) : null
  }

  /**
   * Leitura pública por slug com fallback por id (UUID) — o serviço fiscal só
   * conhece o `metadata.offerId` do pagamento. Mesmo dado já público por slug
   * (zero vazamento novo); a regra de draft-404 é aplicada na rota, igual ao slug.
   */
  async getBySlugOrId(slugOrId: string): Promise<OfferView | null> {
    const offer = await this.offers.findBySlug(slugOrId)
    if (offer) return this.toView(offer)
    return isUuid(slugOrId) ? this.getById(slugOrId) : null
  }

  /** Definição de acesso resolvida (com `fulfillment`) — funil + futura área de membros. */
  async getEntitlements(idOrSlug: string): Promise<OfferEntitlementsResult | null> {
    // A rota passa o slug; só tenta por id se parecer um UUID (evita cast inválido no Postgres).
    const offer =
      (await this.offers.findBySlug(idOrSlug)) ??
      (isUuid(idOrSlug) ? await this.offers.findById(idOrSlug) : null)
    if (!offer) return null
    const resolved = await this.resolver.execute(offer)
    // `maxProfiles` (teto de perfis kids) vem da OFERTA, não do produto. Injeta no
    // fulfillment do entitlement PRIMÁRIO (e descarta qualquer valor legado vindo do
    // produto) → é o que o members congela no snapshot e o auth usa ao criar perfil.
    const offerMaxProfiles = offer.content?.maxProfiles
    let applied = false
    const items = resolved.map(toEntitlementView).map((it) => {
      if (!it.fulfillment) return it
      const { maxProfiles: _legacy, ...fulfillment } = it.fulfillment
      if (it.isPrimary && offerMaxProfiles) {
        applied = true
        return { ...it, fulfillment: { ...fulfillment, maxProfiles: offerMaxProfiles } }
      }
      return { ...it, fulfillment }
    })
    // A oferta define um teto de perfis mas ele não pôde ser injetado: o item
    // primário não tem fulfillment, ou o grafo não resolveu um primário (oferta
    // quebrada/draft). Sem isto o comprador cairia no default do members em silêncio.
    if (offerMaxProfiles && !applied) {
      this.logger.warn('catalog.max_profiles_unapplied', {
        offerId: offer.id,
        offerSlug: offer.slug,
        maxProfiles: offerMaxProfiles,
      })
    }
    return { offerId: offer.id, offerSlug: offer.slug, items }
  }

  private async toView(offer: OfferAggregate): Promise<OfferView> {
    const product = await this.products.findById(offer.productId)
    if (!product) throw new ProductNotFoundError('Produto principal da oferta não encontrado')
    const resolved = await this.resolver.execute(offer)
    return toOfferView(offer, toProductSummary(product), resolved.map(toEntitlementItemView))
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
