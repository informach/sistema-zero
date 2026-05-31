import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { WebhookInbox } from '../../domain/ports/webhook-inbox.port'
import type { Logger } from '../../infrastructure/logging/logger'

export interface PixWebhookItem {
  txid: string
  endToEndId?: string
}

export interface HandlePixWebhookInput {
  items: PixWebhookItem[]
}

/** Limite de itens processados por notificação (limita amplificação de chamadas à Efí). */
const MAX_ITEMS_PER_NOTIFICATION = 100

/**
 * Processa notificações de Pix recebido. Para cada item, de forma **isolada**
 * (uma falha em um item não aborta os demais nem descarta as reentregas):
 *  1. dedupe pelo id do evento (e2eId) — o token só é consumido após sucesso;
 *  2. **re-consulta a cobrança na Efí** (fonte da verdade — nunca confiar só no
 *     payload do webhook);
 *  3. confere o valor pago contra o valor local (defesa em profundidade);
 *  4. se paga e o valor confere, marca o pagamento como PAID (gera o evento
 *     `payment.paid` no outbox) de forma idempotente.
 */
export class HandleProviderWebhookService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly inbox: WebhookInbox,
    private readonly logger: Logger,
  ) {}

  async execute(input: HandlePixWebhookInput): Promise<void> {
    const items = input.items.slice(0, MAX_ITEMS_PER_NOTIFICATION)
    if (input.items.length > MAX_ITEMS_PER_NOTIFICATION) {
      this.logger.warn('webhook.items_truncated', {
        received: input.items.length,
        processed: items.length,
      })
    }

    for (const item of items) {
      // Isolamento por item: um erro não derruba o lote nem consome o dedupe
      // (markProcessed só roda no sucesso → a reentrega da Efí reprocessa).
      try {
        await this.handleItem(item)
      } catch (error) {
        this.logger.error('webhook.item_failed', {
          txid: item.txid,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  private async handleItem(item: PixWebhookItem): Promise<void> {
    const eventId = item.endToEndId ?? item.txid

    const isNew = await this.inbox.registerIfNew({
      provider: this.gateway.provider,
      eventId,
      eventType: 'pix.received',
      payload: { txid: item.txid, endToEndId: item.endToEndId },
    })
    if (!isNew) {
      this.logger.info('webhook.duplicate_ignored', { eventId })
      return
    }

    const charge = await this.gateway.getPixCharge(item.txid)
    if (charge.status !== 'PAID') {
      // Não consome o dedupe: a próxima notificação (quando CONCLUIDA) reprocessa.
      this.logger.info('webhook.charge_not_paid', { txid: item.txid, status: charge.status })
      return
    }

    const payment = await this.payments.findByTxid(item.txid)
    if (!payment) {
      // No modo assíncrono o txid pode ainda não ter sido persistido — reprocessável.
      this.logger.warn('webhook.payment_not_found', { txid: item.txid })
      return
    }

    // Defesa em profundidade: o valor pago tem que bater com o valor cobrado.
    if (charge.amountInCents !== payment.amount.amountInCents) {
      // Mismatch é determinístico (a re-consulta é a fonte da verdade) → consome o
      // dedupe para NÃO reprocessar a cada reentrega. O log ERROR é o sinal
      // alertável; o pagamento fica PENDING (precisa de revisão manual).
      this.logger.error('webhook.amount_mismatch', {
        paymentId: payment.id,
        txid: item.txid,
        expected: payment.amount.amountInCents.toString(),
        got: charge.amountInCents.toString(),
      })
      await this.inbox.markProcessed(this.gateway.provider, eventId)
      return
    }

    payment.markPaid(charge.paidAt)
    await this.payments.save(payment)
    await this.inbox.markProcessed(this.gateway.provider, eventId)

    this.logger.info('webhook.payment_confirmed', { paymentId: payment.id, txid: item.txid })
  }
}
