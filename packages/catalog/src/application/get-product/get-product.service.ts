import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import {
  type ProductView,
  type PublicProductView,
  toProductView,
  toPublicProductView,
} from '../mappers/product-view'

/** Leitura de produto por slug ou id. */
export class GetProductService {
  constructor(
    private readonly products: ProductRepository,
    /** Resolve o slug da oferta principal na leitura pública (sem ele, sai null). */
    private readonly offers?: Pick<OfferRepository, 'findById'>,
  ) {}

  /**
   * Leitura PÚBLICA (gateway, sem auth): view sanitizada (sem `fulfillment`/
   * `metadata`/`components`) e `draft` tratado como inexistente — rascunho não
   * vaza preço/campanha por adivinhação de slug. `archived` segue legível
   * (página histórica degrada graciosamente).
   */
  async getPublicBySlug(slug: string): Promise<PublicProductView | null> {
    // Slug com fallback pelo SKU: o funil identifica a página pelo SKU do produto.
    const product = (await this.products.findBySlug(slug)) ?? (await this.products.findBySku(slug))
    if (!product || product.status === 'draft') return null
    let primaryOfferSlug: string | null = null
    if (product.primaryOfferId && this.offers) {
      const offer = await this.offers.findById(product.primaryOfferId)
      // Rascunho nunca é público; a oferta precisa continuar sendo deste produto.
      if (offer && offer.status !== 'draft' && offer.productId === product.id)
        primaryOfferSlug = offer.slug
    }
    return toPublicProductView(product, primaryOfferSlug)
  }

  async getBySlug(slug: string): Promise<ProductView | null> {
    const product = await this.products.findBySlug(slug)
    return product ? toProductView(product) : null
  }

  async getById(id: string): Promise<ProductView | null> {
    const product = await this.products.findById(id)
    return product ? toProductView(product) : null
  }
}
