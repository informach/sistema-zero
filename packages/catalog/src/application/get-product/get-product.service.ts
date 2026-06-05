import type { ProductRepository } from '../../domain/ports/product-repository.port'
import {
  type ProductView,
  type PublicProductView,
  toProductView,
  toPublicProductView,
} from '../mappers/product-view'

/** Leitura de produto por slug ou id. */
export class GetProductService {
  constructor(private readonly products: ProductRepository) {}

  /**
   * Leitura PÚBLICA (gateway, sem auth): view sanitizada (sem `fulfillment`/
   * `metadata`/`components`) e `draft` tratado como inexistente — rascunho não
   * vaza preço/campanha por adivinhação de slug. `archived` segue legível
   * (página histórica degrada graciosamente).
   */
  async getPublicBySlug(slug: string): Promise<PublicProductView | null> {
    const product = await this.products.findBySlug(slug)
    if (!product || product.status === 'draft') return null
    return toPublicProductView(product)
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
