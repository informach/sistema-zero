import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import { type SubscriptionView, toSubscriptionView } from '../mappers/subscription-view'

/** Caso de uso de consulta de uma assinatura pelo identificador. */
export class GetSubscriptionService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  /**
   * Consulta **escopada por consumidor**: um consumidor só enxerga as próprias
   * assinaturas. Assinatura de outro dono é 404 (sem revelar o id) — evita IDOR/BOLA.
   */
  async execute(consumerId: string, id: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription || subscription.consumerId !== consumerId) {
      throw new SubscriptionNotFoundError(id)
    }
    return toSubscriptionView(subscription)
  }
}
