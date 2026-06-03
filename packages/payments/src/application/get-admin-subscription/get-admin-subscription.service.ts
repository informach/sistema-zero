import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import { type SubscriptionView, toSubscriptionView } from '../mappers/subscription-view'

/** Consulta admin de uma assinatura por id — **cross-consumer** (não escopada). */
export class GetAdminSubscriptionService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(id: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription) throw new SubscriptionNotFoundError(id)
    return toSubscriptionView(subscription)
  }
}
