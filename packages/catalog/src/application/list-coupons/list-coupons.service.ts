import type { CouponRepository } from '../../domain/ports/coupon-repository.port'
import type { ListQuery } from '../../domain/ports/list'
import { type CouponView, toCouponView } from '../mappers/coupon-view'
import type { Paginated } from '../mappers/paginated'

/** Listagem paginada de cupons (admin). */
export class ListCouponsService {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(query: ListQuery): Promise<Paginated<CouponView>> {
    const page = await this.coupons.list(query)
    return {
      items: page.items.map(toCouponView),
      total: page.total,
      limit: query.limit,
      offset: query.offset,
    }
  }
}
