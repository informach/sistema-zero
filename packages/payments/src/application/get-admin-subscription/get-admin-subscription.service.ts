import type { BusinessAudienceFilter } from '../../domain/business-audience'
import type { SubscriptionAdminReadRepository } from '../../domain/ports/subscription-admin-read.port'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import { type SubscriptionView, toSubscriptionView } from '../mappers/subscription-view'

/** Consulta admin de uma assinatura por id — **cross-consumer** (não escopada). */
export class GetAdminSubscriptionService {
  constructor(private readonly subscriptions: Pick<SubscriptionAdminReadRepository, 'findById'>) {}

  async execute(id: string, audience?: BusinessAudienceFilter): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id, audience)
    if (!subscription) throw new SubscriptionNotFoundError(id)
    return toSubscriptionView(subscription)
  }
}
