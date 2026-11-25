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
    return this.publicView(await this.products.findBySlug(slug))
  }

  /**
   * Leitura pública pelo SKU (o funil identifica a página pelo SKU do produto). Rota PRÓPRIA:
   * slug e SKU são espaços de nome separados, e um slug igual ao SKU de outro produto abriria a
   * página com a oferta errada.
   */
  async getPublicBySku(sku: string): Promise<PublicProductView | null> {
    return this.publicView(await this.products.findBySku(sku))
  }

  private async publicView(product: Awaited<ReturnType<ProductRepository['findBySlug']>>) {
    if (!product || product.status === 'draft') return null
    let primaryOfferSlug: string | null = null
    if (product.primaryOfferId && this.offers) {
      const offer = await this.offers.findById(product.primaryOfferId)
      // Só oferta ATIVA vende: pausada/arquivada/rascunho como principal deixa a página sem oferta
      // (o funil responde "indisponível" e loga), em vez de abrir sem preço vivo.
      if (offer && offer.status === 'active' && offer.productId === product.id)
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
