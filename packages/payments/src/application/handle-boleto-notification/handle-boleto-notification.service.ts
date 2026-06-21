import { TooManyRequestsError } from '@sistemazero/core/http'
import type {
  PaymentGateway,
  ProviderNotificationEntry,
} from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { WebhookInbox } from '../../domain/ports/webhook-inbox.port'
import type { Logger } from '../../infrastructure/logging/logger'
import type { HandleSubscriptionNotificationService } from '../handle-subscription-notification/handle-subscription-notification.service'

export interface HandleBoletoNotificationInput {
  /** Token que a Efí POSTa ao `notification_url` (resolvido na fonte). */
  token: string
}

/** Limite de cobranças por notificação (limita amplificação de chamadas à Efí). */
const MAX_CHARGES_PER_NOTIFICATION = 100

/**
 * Processa notificações da API Cobranças da Efí (boleto, cartão **e** ciclos de
 * assinatura — o webhook `/webhooks/efi/cobrancas` é compartilhado). Diferente do
 * Pix (que recebe itens com `txid` no payload), aqui a Efí envia apenas um
 * **token**; resolvemos via `gateway.getNotification(token)` UMA vez e despachamos
 * cada entrada de forma **isolada**:
 *  - entrada com `subscriptionId` → ciclo de assinatura (`HandleSubscriptionNotificationService`);
 *  - entrada sem `subscriptionId` → cobrança avulsa:
 *    1. localiza o pagamento por `providerPaymentId` (para saber o método);
 *    2. **re-consulta a cobrança na Efí conforme o método** — `getCardCharge` p/
 *       cartão (onde `approved`→PAID), `getBoletoCharge` p/ boleto — fonte da verdade;
 *    3. dedupe por (cobrança + status) — o token só é consumido após sucesso;
 *    4. confere o valor pago contra o valor local (defesa em profundidade);
 *    5. transiciona o pagamento (PAID/EXPIRED/FAILED) de forma segura.
 *
 * O handler de assinatura é **opcional**: um deploy sem recorrência não o injeta e
 * eventuais ciclos caem no caminho avulso (no-op até existir o pagamento).
 */
export class HandleBoletoNotificationService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly inbox: WebhookInbox,
    private readonly logger: Logger,
    private readonly subscriptions?: HandleSubscriptionNotificationService,
  ) {}

  async execute(input: HandleBoletoNotificationInput): Promise<void> {
    const notification = await this.gateway.getNotification(input.token)
    // Prefere `entries` (carrega a assinatura-pai); cai em `chargeIds` p/ compat.
    const all: ProviderNotificationEntry[] =
      notification.entries && notification.entries.length > 0
        ? notification.entries
        : notification.chargeIds.map((chargeId) => ({ chargeId }))
    if (all.length > MAX_CHARGES_PER_NOTIFICATION) {
      this.logger.warn('cobrancas.notification.too_many_entries', {
        received: all.length,
        max: MAX_CHARGES_PER_NOTIFICATION,
      })
      throw new TooManyRequestsError()
    }
    for (const entry of all) {
      // Isolamento por cobrança: um erro não derruba o lote nem consome o dedupe.
      try {
        if (entry.subscriptionId && this.subscriptions) {
          await this.subscriptions.handleCycle({
            subscriptionId: entry.subscriptionId,
            chargeId: entry.chargeId,
          })
        } else {
          await this.handleCharge(entry.chargeId)
        }
      } catch (error) {
        this.logger.error('cobrancas.notification.item_failed', {
          chargeId: entry.chargeId,
          subscriptionId: entry.subscriptionId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  private async handleCharge(chargeId: string): Promise<void> {
    // Localiza o pagamento ANTES de consultar, para escolher o endpoint certo por
    // método (boleto e cartão divergem no mapeamento de status: `approved` é
    // PENDING no boleto e PAID no cartão).
    const payment = await this.payments.findByProviderPaymentId(this.gateway.provider, chargeId)
    if (!payment) {
      // No modo assíncrono o charge_id pode ainda não ter sido persistido — reprocessável.
      this.logger.warn('cobrancas.notification.payment_not_found', { chargeId })
      return
    }

    // Re-consulta na fonte da verdade conforme o método.
    const charge =
      payment.method.type === 'CREDIT_CARD'
        ? await this.gateway.getCardCharge(chargeId)
        : await this.gateway.getBoletoCharge(chargeId)

    // Dedupe por (cobrança + status): o token só é consumido em markProcessed →
    // falha no meio NÃO descarta a reentrega. Status diferentes reprocessam.
    const eventId = `cobrancas:${chargeId}:${charge.status}`
    const isNew = await this.inbox.registerIfNew({
      provider: this.gateway.provider,
      eventId,
      eventType: 'cobrancas.notification',
      payload: { chargeId, status: charge.status },
    })
    if (!isNew) {
      this.logger.info('cobrancas.notification.duplicate_ignored', { eventId })
      return
    }

    if (charge.status === 'PAID') {
      // Defesa em profundidade: o valor pago tem que bater com o cobrado.
      if (charge.amountInCents !== payment.amount.amountInCents) {
        // Mismatch determinístico → consome o dedupe p/ não reprocessar a cada
        // reentrega. Log ERROR alertável; pagamento fica PENDING (revisão manual).
        this.logger.error('cobrancas.notification.amount_mismatch', {
          paymentId: payment.id,
          chargeId,
          expected: payment.amount.amountInCents.toString(),
          got: charge.amountInCents.toString(),
        })
        // Flag durável (contador no /metrics + revisão no admin). Best-effort:
        // o consumo do dedupe não pode depender do save (mismatch determinístico).
        try {
          if (
            payment.flagAmountMismatch({
              expectedInCents: payment.amount.amountInCents,
              paidInCents: charge.amountInCents,
            })
          ) {
            await this.payments.save(payment)
          }
        } catch (error) {
          this.logger.warn('cobrancas.notification.amount_mismatch_flag_failed', {
            paymentId: payment.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
        await this.inbox.markProcessed(this.gateway.provider, eventId)
        return
      }
      payment.markPaid(charge.paidAt)
    } else if (charge.status === 'EXPIRED' && payment.status === 'PENDING') {
      payment.markExpired()
    } else if (charge.status === 'FAILED' && payment.status === 'PENDING') {
      payment.markFailed('Cobrança cancelada/não paga no provedor')
    } else {
      // Status não-terminal (ou pagamento já fora de PENDING): nada a fazer.
      this.logger.info('cobrancas.notification.no_op', {
        chargeId,
        chargeStatus: charge.status,
        paymentStatus: payment.status,
      })
      return
    }

    await this.payments.save(payment)
    await this.inbox.markProcessed(this.gateway.provider, eventId)
    this.logger.info('cobrancas.notification.processed', {
      paymentId: payment.id,
      chargeId,
      status: payment.status,
    })
  }
}
