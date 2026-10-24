import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { SubscriptionMyReadRepository } from '../../domain/ports/subscription-my-read.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import { DomainError, ValidationError } from '../../domain/shared/errors'
import type {
  SubscriptionAggregate,
  SubscriptionCard,
} from '../../domain/subscription/subscription.aggregate'
import { SubscriptionNotFoundError } from '../../domain/subscription/subscription.errors'
import {
  createSubscriptionOperation,
  type SubscriptionOperation,
  type SubscriptionOperationRepository,
} from '../../domain/subscription/subscription-operation'

export class SubscriptionOperationInProgressError extends DomainError {
  readonly code = 'SUBSCRIPTION_OPERATION_IN_PROGRESS'
  constructor() {
    super(
      'Há uma solicitação desta assinatura em conferência. Aguarde a confirmação antes de tentar novamente.',
    )
  }
}

export interface CardUpdateIntentView {
  id: string
  subscriptionId: string
  state: SubscriptionOperation['state']
  expiresAt: string
  /** Identifica explicitamente a troca SEM débito. */
  chargesNow: false
  result: string | null
}

function toView(operation: SubscriptionOperation): CardUpdateIntentView {
  return {
    id: operation.id,
    subscriptionId: operation.subscriptionId,
    state: operation.state,
    expiresAt: operation.expiresAt.toISOString(),
    chargesNow: false,
    result: operation.result,
  }
}

/** Só atualização preventiva. Não conhece nem chama o endpoint de retry/débito. */
export class UpdateSubscriptionCardService {
  constructor(
    private readonly mySubscriptions: SubscriptionMyReadRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly operations: SubscriptionOperationRepository,
    private readonly gateway: PaymentGateway,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createIntent(email: string, subscriptionId: string): Promise<CardUpdateIntentView> {
    const subscription = await this.ownedSubscription(email, subscriptionId)
    const providerId = this.requireActive(subscription)
    const source = await this.gateway.getSubscription(providerId)
    if (
      source.status !== 'ACTIVE' ||
      source.providerSubscriptionId !== subscription.providerSubscriptionId
    ) {
      throw new ValidationError('Assinatura não aceita atualização de cartão neste momento')
    }
    const operation = createSubscriptionOperation({
      subscriptionId,
      consumerId: subscription.consumerId,
      providerSubscriptionId: source.providerSubscriptionId,
      kind: 'CARD_UPDATE',
      now: this.clock(),
    })
    if (!(await this.operations.create(operation))) throw new SubscriptionOperationInProgressError()
    return toView(operation)
  }

  async getIntent(
    email: string,
    subscriptionId: string,
    id: string,
  ): Promise<CardUpdateIntentView> {
    await this.ownedSubscription(email, subscriptionId)
    return toView(await this.ownedOperation(subscriptionId, id))
  }

  async getActiveIntent(
    email: string,
    subscriptionId: string,
  ): Promise<{ intent: CardUpdateIntentView | null }> {
    await this.ownedSubscription(email, subscriptionId)
    const operation = await this.operations.findActiveForSubscription(subscriptionId, this.clock())
    if (operation && operation.kind !== 'CARD_UPDATE')
      throw new SubscriptionOperationInProgressError()
    return { intent: operation ? toView(operation) : null }
  }

  async execute(
    email: string,
    subscriptionId: string,
    id: string,
    input: {
      paymentToken: string
      card: SubscriptionCard
    },
  ): Promise<CardUpdateIntentView> {
    // Validação adicional ao DTO; nenhum objeto sensível é persistido ou logado.
    if (
      !input.paymentToken ||
      input.paymentToken.length > 255 ||
      !/^[a-z][a-z0-9-]{1,31}$/.test(input.card.brand) ||
      !/^\d{4}$/.test(input.card.last4)
    ) {
      throw new ValidationError('Dados do cartão inválidos')
    }
    const paymentToken = input.paymentToken
    const card = { brand: input.card.brand, last4: input.card.last4 }
    const subscription = await this.ownedSubscription(email, subscriptionId)
    const original = await this.ownedOperation(subscriptionId, id)
    // Reentrega responde com o estado registrado; jamais volta a usar o token.
    if (original.state !== 'READY') return toView(original)
    this.requireActive(subscription)
    if (
      original.consumerId !== subscription.consumerId ||
      original.providerSubscriptionId !== subscription.providerSubscriptionId
    ) {
      throw new ValidationError('A assinatura mudou; abra uma nova solicitação')
    }
    const operation = await this.operations.start(id, subscriptionId, this.clock())
    if (!operation) throw new SubscriptionOperationInProgressError()
    let externalStarted = false
    try {
      const source = await this.gateway.getSubscription(operation.providerSubscriptionId)
      const fresh = await this.subscriptions.findById(subscriptionId)
      if (!fresh) throw new SubscriptionNotFoundError(subscriptionId)
      this.requireActive(fresh)
      if (
        source.status !== 'ACTIVE' ||
        source.providerSubscriptionId !== operation.providerSubscriptionId ||
        fresh.providerSubscriptionId !== operation.providerSubscriptionId ||
        fresh.consumerId !== operation.consumerId
      ) {
        throw new ValidationError('A assinatura não está ativa no provedor')
      }
      externalStarted = true
      await this.gateway.updateSubscriptionCard(operation.providerSubscriptionId, paymentToken)
      // A escrita tem versão e conserva pedido concorrente de cancelamento.
      fresh.updateCard(card)
      await this.subscriptions.save(fresh)
      await this.operations.finish(id, 'SUCCEEDED', 'CARD_UPDATED', this.clock())
    } catch {
      // Não propagar o erro cru da operadora, que pode repetir o token/dados do cartão.
      // Se o banco caiu após a Efí aceitar, EXECUTING continua impedindo outro efeito.
      try {
        await this.operations.finish(
          id,
          externalStarted ? 'UNKNOWN' : 'REJECTED',
          externalStarted ? 'PROVIDER_UNKNOWN' : 'PRECONDITION_CHANGED',
          this.clock(),
        )
      } catch {
        /* Banco indisponível: a intenção EXECUTING já é durável. */
      }
    }
    return toView(await this.ownedOperation(subscriptionId, id))
  }

  private async ownedSubscription(
    email: string,
    subscriptionId: string,
  ): Promise<SubscriptionAggregate> {
    const subscription = await this.mySubscriptions.findByEmailAndId(email, subscriptionId)
    if (!subscription) throw new SubscriptionNotFoundError(subscriptionId)
    return subscription
  }

  private async ownedOperation(subscriptionId: string, id: string): Promise<SubscriptionOperation> {
    const operation = await this.operations.findById(id)
    if (
      !operation ||
      operation.subscriptionId !== subscriptionId ||
      operation.kind !== 'CARD_UPDATE'
    ) {
      throw new SubscriptionNotFoundError(subscriptionId)
    }
    return operation
  }

  private requireActive(subscription: SubscriptionAggregate): string {
    if (
      subscription.status !== 'ACTIVE' ||
      subscription.cancelRequestedAt ||
      !subscription.providerSubscriptionId
    ) {
      throw new ValidationError('Assinatura encerrada ou com cancelamento solicitado')
    }
    return subscription.providerSubscriptionId
  }
}
