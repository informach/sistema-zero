import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import type { Logger } from '../../infrastructure/logging/logger'
import { type SubscriptionView, toSubscriptionView } from '../mappers/subscription-view'

/**
 * Caso de uso: cancela uma assinatura. Idempotente: cancelar uma já cancelada é
 * no-op (não chama a Efí de novo).
 */
export class CancelSubscriptionService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly gateway: PaymentGateway,
    private readonly logger: Logger,
  ) {}

  /**
   * Cancelamento do CONSUMIDOR — **escopado** (anti-IDOR): só o dono cancela;
   * assinatura de outro é tratada como inexistente (404).
   */
  async execute(consumerId: string, id: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription || subscription.consumerId !== consumerId) {
      throw new SubscriptionNotFoundError(id)
    }
    return this.cancel(subscription)
  }

  /** Cancelamento ADMIN (painel) — **cross-consumer** (não escopado). */
  async executeAdmin(id: string): Promise<SubscriptionView> {
    const subscription = await this.subscriptions.findById(id)
    if (!subscription) throw new SubscriptionNotFoundError(id)
    return this.cancel(subscription)
  }

  private async cancel(subscription: SubscriptionAggregate): Promise<SubscriptionView> {
    if (subscription.status === 'CANCELED') return toSubscriptionView(subscription)

    if (subscription.providerSubscriptionId) {
      await this.gateway.cancelSubscription(subscription.providerSubscriptionId)
    }
    subscription.cancel()
    await this.subscriptions.save(subscription)

    this.logger.info('subscription.canceled', {
      subscriptionId: subscription.id,
      consumerId: subscription.consumerId,
    })

    return toSubscriptionView(subscription)
  }
}
