import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { WebhookInbox } from '../../domain/ports/webhook-inbox.port'
import type { Logger } from '../../infrastructure/logging/logger'

export interface HandleBoletoNotificationInput {
  /** Token que a Efí POSTa ao `notification_url` (resolvido na fonte). */
  token: string
}

/** Limite de cobranças por notificação (limita amplificação de chamadas à Efí). */
const MAX_CHARGES_PER_NOTIFICATION = 100

/**
 * Processa notificações de boleto da API Cobranças da Efí. Diferente do Pix
 * (que recebe itens com `txid` no payload), aqui a Efí envia apenas um **token**;
 * resolvemos via `gateway.getNotification(token)` para descobrir as cobranças
 * afetadas. Para cada uma, de forma **isolada**:
 *  1. **re-consulta a cobrança na Efí** (`getBoletoCharge`) — fonte da verdade;
 *  2. dedupe por (cobrança + status) — o token só é consumido após sucesso;
 *  3. confere o valor pago contra o valor local (defesa em profundidade);
 *  4. transiciona o pagamento (PAID/EXPIRED/FAILED) de forma segura.
 */
export class HandleBoletoNotificationService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly inbox: WebhookInbox,
    private readonly logger: Logger,
  ) {}

  async execute(input: HandleBoletoNotificationInput): Promise<void> {
    const notification = await this.gateway.getNotification(input.token)
    const chargeIds = notification.chargeIds.slice(0, MAX_CHARGES_PER_NOTIFICATION)
    if (notification.chargeIds.length > MAX_CHARGES_PER_NOTIFICATION) {
      this.logger.warn('boleto.notification.charges_truncated', {
        received: notification.chargeIds.length,
        processed: chargeIds.length,
      })
    }

    for (const chargeId of chargeIds) {
      // Isolamento por cobrança: um erro não derruba o lote nem consome o dedupe.
      try {
        await this.handleCharge(chargeId)
      } catch (error) {
        this.logger.error('boleto.notification.item_failed', {
          chargeId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  private async handleCharge(chargeId: string): Promise<void> {
    const charge = await this.gateway.getBoletoCharge(chargeId)

    // Dedupe por (cobrança + status): o token só é consumido em markProcessed →
    // falha no meio NÃO descarta a reentrega. Status diferentes reprocessam.
    const eventId = `boleto:${chargeId}:${charge.status}`
    const isNew = await this.inbox.registerIfNew({
      provider: this.gateway.provider,
      eventId,
      eventType: 'boleto.notification',
      payload: { chargeId, status: charge.status },
    })
    if (!isNew) {
      this.logger.info('boleto.notification.duplicate_ignored', { eventId })
      return
    }

    const payment = await this.payments.findByProviderPaymentId(this.gateway.provider, chargeId)
    if (!payment) {
      // No modo assíncrono o charge_id pode ainda não ter sido persistido — reprocessável.
      this.logger.warn('boleto.notification.payment_not_found', { chargeId })
      return
    }

    if (charge.status === 'PAID') {
      // Defesa em profundidade: o valor pago tem que bater com o cobrado.
      if (charge.amountInCents !== payment.amount.amountInCents) {
        // Mismatch determinístico → consome o dedupe p/ não reprocessar a cada
        // reentrega. Log ERROR alertável; pagamento fica PENDING (revisão manual).
        this.logger.error('boleto.notification.amount_mismatch', {
          paymentId: payment.id,
          chargeId,
          expected: payment.amount.amountInCents.toString(),
          got: charge.amountInCents.toString(),
        })
        await this.inbox.markProcessed(this.gateway.provider, eventId)
        return
      }
      payment.markPaid(charge.paidAt)
    } else if (charge.status === 'EXPIRED' && payment.status === 'PENDING') {
      payment.markExpired()
    } else if (charge.status === 'FAILED' && payment.status === 'PENDING') {
      payment.markFailed('Boleto cancelado/não pago no provedor')
    } else {
      // Status não-terminal (ou pagamento já fora de PENDING): nada a fazer.
      this.logger.info('boleto.notification.no_op', {
        chargeId,
        chargeStatus: charge.status,
        paymentStatus: payment.status,
      })
      return
    }

    await this.payments.save(payment)
    await this.inbox.markProcessed(this.gateway.provider, eventId)
    this.logger.info('boleto.notification.processed', {
      paymentId: payment.id,
      chargeId,
      status: payment.status,
    })
  }
}
