import type { SubscriptionMyReadRepository } from '../../domain/ports/subscription-my-read.port'
import { type MySubscriptionView, toMySubscriptionView } from '../mappers/subscription-view'

/** "Minhas assinaturas" (self-service): escopado pelo e-mail das claims. */
export class ListMySubscriptionsService {
  constructor(private readonly subscriptions: SubscriptionMyReadRepository) {}

  async execute(email: string): Promise<{ items: MySubscriptionView[] }> {
    const items = await this.subscriptions.listByEmail(email)
    return { items: items.map(toMySubscriptionView) }
  }
}
