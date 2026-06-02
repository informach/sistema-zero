import type { ListQuery } from '../../domain/ports/list'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import type { Paginated } from '../mappers/paginated'
import { type ProductView, toProductView } from '../mappers/product-view'

/** Listagem paginada de produtos (admin). */
export class ListProductsService {
  constructor(private readonly products: ProductRepository) {}

  async execute(query: ListQuery): Promise<Paginated<ProductView>> {
    const page = await this.products.list(query)
    return {
      items: page.items.map(toProductView),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    }
  }
}
