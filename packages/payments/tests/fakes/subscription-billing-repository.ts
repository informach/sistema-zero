import {
  emptySubscriptionBilling,
  readScheduleObservation,
  type SubscriptionBillingRepository,
  type SubscriptionBillingView,
  type SubscriptionScheduleObservation,
} from '../../src/domain/subscription/subscription-billing'

/** Advisory projection fake for application/HTTP tests; SQL invariants use PostgreSQL. */
export class InMemorySubscriptionBillingRepository implements SubscriptionBillingRepository {
  readonly observations = new Map<string, SubscriptionScheduleObservation>()
  async recordSchedule(input: Parameters<SubscriptionBillingRepository['recordSchedule']>[0]) {
    const next = readScheduleObservation(input.observation)
    const prior = this.observations.get(input.subscriptionId)
    if (!prior || prior.observedAt < next.observedAt)
      this.observations.set(input.subscriptionId, next)
  }
  async readForSubscriptions(ids: string[]): Promise<Map<string, SubscriptionBillingView>> {
    return new Map(ids.map((id) => [id, emptySubscriptionBilling()]))
  }
}
