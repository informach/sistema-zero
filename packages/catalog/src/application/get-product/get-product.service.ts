import type { ProductRepository } from '../../domain/ports/product-repository.port'
import { type ProductView, toProductView } from '../mappers/product-view'

/** Leitura de produto por slug ou id. */
export class GetProductService {
  constructor(private readonly products: ProductRepository) {}

  async getBySlug(slug: string): Promise<ProductView | null> {
    const product = await this.products.findBySlug(slug)
    return product ? toProductView(product) : null
  }

  async getById(id: string): Promise<ProductView | null> {
    const product = await this.products.findById(id)
    return product ? toProductView(product) : null
  }
}
