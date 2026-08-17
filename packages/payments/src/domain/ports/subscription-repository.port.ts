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
  /**
   * Assinaturas ATIVAS a varrer na reconciliação de ciclos. SELECT simples, sem
   * claim/lease: o trabalho por item é idempotente (o `handleCycle` deduplica no
   * inbox), então duas réplicas pegando a mesma assinatura não duplicam nada —
   * mesma decisão do `findStalePendingCharges`.
   */
  findActiveForReconcile(limit: number): Promise<SubscriptionAggregate[]>
}
