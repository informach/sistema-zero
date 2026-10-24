import type { SubscriptionMyReadRepository } from '../../domain/ports/subscription-my-read.port'
import {
  emptySubscriptionBilling,
  type SubscriptionBillingRepository,
} from '../../domain/subscription/subscription-billing'
import type { SubscriptionOperationRepository } from '../../domain/subscription/subscription-operation'
import {
  type MySubscriptionView,
  pendingOperationView,
  toMySubscriptionView,
} from '../mappers/subscription-view'

/** "Minhas assinaturas" (self-service): escopado pelo e-mail das claims. */
export class ListMySubscriptionsService {
  constructor(
    private readonly subscriptions: SubscriptionMyReadRepository,
    private readonly operations: SubscriptionOperationRepository,
    private readonly billing: SubscriptionBillingRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(email: string): Promise<{ items: MySubscriptionView[] }> {
    const items = await this.subscriptions.listByEmail(email)
    const operations = await this.operations.listActiveForSubscriptions(
      items.map((item) => item.id),
      this.clock(),
    )
    const pending = new Map(operations.map((operation) => [operation.subscriptionId, operation]))
    const billing = await this.billing.readForSubscriptions(
      items.map((item) => item.id),
      this.clock(),
    )
    return {
      items: items.map((subscription) => ({
        ...toMySubscriptionView(subscription),
        pendingOperation: pendingOperationView(pending.get(subscription.id) ?? null),
        billing: billing.get(subscription.id) ?? emptySubscriptionBilling(),
      })),
    }
  }
}
