import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { SubscriptionMyReadRepository } from '../../domain/ports/subscription-my-read.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { DomainError } from '../../domain/shared/errors'
import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import type { Logger } from '../../infrastructure/logging/logger'
import {
  type MySubscriptionView,
  type SubscriptionView,
  toMySubscriptionView,
  toSubscriptionView,
} from '../mappers/subscription-view'

/**
 * Caso de uso: cancela uma assinatura. Idempotente: cancelar uma já cancelada é
 * no-op (não chama a Efí de novo).
 */
export class CancelSubscriptionService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly gateway: PaymentGateway,
    private readonly logger: Logger,
    /** Leitura escopada por e-mail — exigida SÓ pelo `executeForEmail` (self-service). */
    private readonly myRead?: SubscriptionMyReadRepository,
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

  /**
   * Cancelamento SELF-SERVICE do assinante ("minhas assinaturas"): escopado pelo
   * E-MAIL das claims (anti-IDOR — id de outro e-mail = inexistente/404). O
   * acesso segue até o fim do ciclo pago + carência (o members expira sozinho —
   * cancelar NÃO revoga na hora).
   */
  async executeForEmail(email: string, id: string): Promise<MySubscriptionView> {
    if (!this.myRead) throw new Error('executeForEmail exige o SubscriptionMyReadRepository')
    const scoped = await this.myRead.findByEmailAndId(email, id)
    if (!scoped) throw new SubscriptionNotFoundError(id)
    await this.cancel(scoped)
    const fresh = await this.subscriptions.findById(scoped.id)
    if (!fresh) throw new SubscriptionNotFoundError(scoped.id)
    return toMySubscriptionView(fresh)
  }

  private async cancel(subscription: SubscriptionAggregate): Promise<SubscriptionView> {
    if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED')
      return toSubscriptionView(subscription)

    // Antes da rede: uma aba com intenção de cartão já aberta perde autoridade.
    if (subscription.requestCancellation()) await this.subscriptions.save(subscription)
    if (!subscription.providerSubscriptionId) throw new SubscriptionCancellationPendingError()

    if (subscription.providerSubscriptionId) {
      try {
        await this.gateway.cancelSubscription(subscription.providerSubscriptionId)
      } catch {
        // PUT pode ter sido aceito sem resposta. A consulta abaixo decide, não o erro.
      }
      try {
        const confirmed = await this.gateway.getSubscription(subscription.providerSubscriptionId)
        if (
          confirmed.providerSubscriptionId !== subscription.providerSubscriptionId ||
          confirmed.status !== 'CANCELED'
        ) {
          throw new SubscriptionCancellationPendingError()
        }
      } catch {
        throw new SubscriptionCancellationPendingError()
      }
    }
    // `save` usa a versão carregada; recarregar também preserva ciclos concorrentes.
    const fresh = await this.subscriptions.findById(subscription.id)
    if (!fresh) throw new SubscriptionNotFoundError(subscription.id)
    if (fresh.status !== 'CANCELED' && fresh.status !== 'EXPIRED') {
      fresh.cancel()
      await this.subscriptions.save(fresh)
    }

    this.logger.info('subscription.canceled', {
      subscriptionId: subscription.id,
      consumerId: subscription.consumerId,
    })

    return toSubscriptionView(fresh)
  }
}

export class SubscriptionCancellationPendingError extends DomainError {
  readonly code = 'SUBSCRIPTION_CANCELLATION_PENDING'
  constructor() {
    super(
      'Pedido de cancelamento registrado. Estamos confirmando o encerramento com a operadora; não faça uma nova assinatura enquanto isso.',
    )
  }
}
