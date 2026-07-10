import type {
  AdminSubscriptionListFilters,
  SubscriptionAdminReadRepository,
} from '../../domain/ports/subscription-admin-read.port'
import type { Paginated } from '../mappers/paginated'
import { type SubscriptionView, toSubscriptionView } from '../mappers/subscription-view'

/** Listagem paginada de assinaturas (painel admin). */
export class ListSubscriptionsService {
  constructor(private readonly subscriptions: SubscriptionAdminReadRepository) {}

  async execute(filters: AdminSubscriptionListFilters): Promise<Paginated<SubscriptionView>> {
    const page = await this.subscriptions.list(filters)
    return {
      items: page.items.map((subscription) => toSubscriptionView(subscription)),
      total: page.total,
      limit: filters.limit,
      offset: filters.offset,
    }
  }
}
