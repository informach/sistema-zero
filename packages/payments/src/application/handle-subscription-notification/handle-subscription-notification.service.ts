import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import type { WebhookInbox } from '../../domain/ports/webhook-inbox.port'
import { ConcurrencyConflictError } from '../../infrastructure/persistence/drizzle/concurrency.error'
import type { Logger } from '../../infrastructure/logging/logger'
import { buildCyclePayment } from '../subscription/cycle-payment'

/**
 * Processa as notificações da Efí (Cobranças) que pertencem a um **ciclo de
 * assinatura**. Chamado por `HandleBoletoNotificationService` (que resolve o token
 * uma vez e despacha as entradas com `subscriptionId` para cá), de forma isolada
 * por cobrança. Para cada ciclo:
 *  1. localiza a assinatura-pai por `providerSubscriptionId`;
 *  2. **re-consulta a cobrança na Efí** (fonte da verdade) via `getCardCharge`;
 *  3. dedupe por (assinatura + cobrança + status);
 *  4. cria o pagamento-ciclo na 1ª vez (ou transiciona o existente);
 *  5. sincroniza a assinatura-pai (ativa na 1ª paga; contabiliza o ciclo).
 */
export class HandleSubscriptionNotificationService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly inbox: WebhookInbox,
    private readonly logger: Logger,
  ) {}

  async handleCycle(input: { subscriptionId: string; chargeId: string }): Promise<void> {
    const { subscriptionId, chargeId } = input

    const subscription = await this.subscriptions.findByProviderSubscriptionId(
      this.gateway.provider,
      subscriptionId,
    )
    if (!subscription) {
      // A assinatura pode ainda não ter sido persistida (corrida criação×notificação).
      // Reprocessável: a Efí reentrega.
      this.logger.warn('subscription.notification.subscription_not_found', {
        subscriptionId,
        chargeId,
      })
      return
    }

    const charge = await this.gateway.getCardCharge(chargeId)

    // Dedupe por (assinatura + cobrança + status): o token só é consumido em
    // markProcessed → falha no meio NÃO descarta a reentrega. Status novo reprocessa.
    const eventId = `sub:${subscriptionId}:charge:${chargeId}:${charge.status}`
    const isNew = await this.inbox.registerIfNew({
      provider: this.gateway.provider,
      eventId,
      eventType: 'subscription.notification',
      payload: { subscriptionId, chargeId, status: charge.status },
    })
    if (!isNew) {
      this.logger.info('subscription.notification.duplicate_ignored', { eventId })
      return
    }

    const existing = await this.payments.findByProviderPaymentId(this.gateway.provider, chargeId)

    if (existing) {
      // Ciclo já registrado (ex.: criado na assinatura ou em análise): transiciona.
      if (charge.status === 'PAID') {
        if (charge.amountInCents !== subscription.amount.amountInCents) {
          this.logAmountMismatch(subscription.id, chargeId, subscription, charge)
          await this.inbox.markProcessed(this.gateway.provider, eventId)
          return
        }
        existing.markPaid(charge.paidAt)
      } else if (charge.status === 'EXPIRED' && existing.status === 'PENDING') {
        existing.markExpired()
      } else if (charge.status === 'FAILED' && existing.status === 'PENDING') {
        existing.markFailed('Cobrança recorrente cancelada/não paga no provedor')
      } else {
        this.logger.info('subscription.notification.no_op', {
          chargeId,
          chargeStatus: charge.status,
          paymentStatus: existing.status,
        })
        await this.inbox.markProcessed(this.gateway.provider, eventId)
        return
      }
      await this.payments.save(existing)
    } else {
      // 1ª vez que vemos esta cobrança: cria o pagamento-ciclo.
      if (charge.status === 'PAID' && charge.amountInCents !== subscription.amount.amountInCents) {
        // Mismatch determinístico → consome o dedupe e NÃO cria a linha (revisão manual).
        this.logAmountMismatch(subscription.id, chargeId, subscription, charge)
        await this.inbox.markProcessed(this.gateway.provider, eventId)
        return
      }
      const cyclePayment = buildCyclePayment({
        subscription,
        chargeId,
        status: charge.status,
        paidAt: charge.paidAt,
      })
      try {
        await this.payments.save(cyclePayment)
      } catch (error) {
        // Corrida: a unique (consumerId, idempotencyKey) / version barrou um 2º insert.
        // Recarrega e transiciona o ciclo existente (idempotente).
        if (error instanceof ConcurrencyConflictError) {
          const reloaded = await this.payments.findByProviderPaymentId(
            this.gateway.provider,
            chargeId,
          )
          if (reloaded && charge.status === 'PAID') {
            reloaded.markPaid(charge.paidAt)
            await this.payments.save(reloaded)
          }
        } else {
          throw error
        }
      }
    }

    // Sincroniza a assinatura-pai apenas em cobrança PAGA. Um ciclo FALHO/EXPIRADO
    // NÃO cancela a assinatura (a Efí pode tentar de novo) — o status da assinatura
    // só muda por sinal próprio (cancelamento/expiração).
    if (charge.status === 'PAID') {
      if (subscription.status === 'PENDING') subscription.activate()
      subscription.recordCharge(chargeId, charge.paidAt) // idempotente por chargeId
      await this.subscriptions.save(subscription)
    }

    await this.inbox.markProcessed(this.gateway.provider, eventId)
    this.logger.info('subscription.notification.processed', {
      subscriptionId: subscription.id,
      chargeId,
      chargeStatus: charge.status,
    })
  }

  private logAmountMismatch(
    subscriptionId: string,
    chargeId: string,
    subscription: { amount: { amountInCents: bigint } },
    charge: { amountInCents: bigint },
  ): void {
    this.logger.error('subscription.notification.amount_mismatch', {
      subscriptionId,
      chargeId,
      expected: subscription.amount.amountInCents.toString(),
      got: charge.amountInCents.toString(),
    })
  }
}
