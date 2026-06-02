import type { ListQuery } from '../../domain/ports/list'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import { type OfferListItemView, toOfferListItem } from '../mappers/offer-view'
import type { Paginated } from '../mappers/paginated'

/**
 * Listagem paginada de ofertas (admin). Anexa o nome do produto principal por
 * batch lookup (1 query) — sem resolver os entitlements inclusos (caro).
 */
export class ListOffersService {
  constructor(
    private readonly offers: OfferRepository,
    private readonly products: ProductRepository,
  ) {}

  async execute(query: ListQuery & { productId?: string }): Promise<Paginated<OfferListItemView>> {
    const page = await this.offers.list(query)
    const productIds = [...new Set(page.items.map((o) => o.productId))]
    const nodes = await this.products.findNodesByIds(productIds)
    const nameById = new Map(nodes.map((n) => [n.productId, n.name]))
    return {
      items: page.items.map((o) => toOfferListItem(o, nameById.get(o.productId) ?? null)),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    }
  }
}
