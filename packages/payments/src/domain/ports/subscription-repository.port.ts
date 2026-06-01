import type { SubscriptionAggregate } from '../subscription/subscription.aggregate'

/**
 * Port (driven) de persistência do agregado de assinatura. Como o de pagamento,
 * `save` grava o agregado E seus eventos de domínio no outbox na MESMA transação
 * (transactional outbox).
 */
export interface SubscriptionRepository {
  save(subscription: SubscriptionAggregate): Promise<void>
  findById(id: string): Promise<SubscriptionAggregate | null>
  findByIdempotencyKey(
    consumerId: string,
    idempotencyKey: string,
  ): Promise<SubscriptionAggregate | null>
  findByProviderSubscriptionId(
    provider: string,
    providerSubscriptionId: string,
  ): Promise<SubscriptionAggregate | null>
}
