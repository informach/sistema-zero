import type { Logger } from '@sistemazero/core/logging'
import { composeServiceDescription } from '../../domain/dps/emitter-profile'
import { SkipReason } from '../../domain/invoice/invoice.status'
import type { CatalogClient, PaymentsClient } from '../../domain/ports/clients.port'
import type { InvoiceRepository } from '../../domain/ports/invoice-repository.port'

export interface WebhookDelivery {
  deliveryId: string
  eventName: string
  payload: Record<string, unknown>
}

export interface HandleWebhookConfig {
  ambiente: string
  defaultGuaranteeDays: number
  emitBufferHours: number
  cancelWindowDays: number
  /** Prefixo da discriminação ("Treinamento on-line - <produto>"). */
  serviceDescPrefix: string
}

/** Resultado p/ a rota decidir o status HTTP (2xx consome a entrega; 502 re-entrega). */
export type HandleResult = { kind: 'ok' } | { kind: 'retryable'; reason: string }

const CPF_RE = /^\d{11}$/

/**
 * Consome as entregas do payments (consumer `fiscal`, fan-out):
 * - `payment.paid` → agenda a nota p/ depois da garantia (snapshot do comprador
 *   + valor; guaranteeDays/nome do produto resolvidos no catalog).
 * - `payment.refunded` → SCHEDULED vira SKIPPED; EMITTED vira CANCEL_PENDING
 *   (dentro da janela de cancelamento) — o CancellationWorker emite o evento.
 * Dedupe por deliveryId é responsabilidade da ROTA (checa antes/marca depois);
 * aqui o processamento é idempotente por construção (unique de payment ativa).
 */
export class HandlePaymentWebhookService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentsClient,
    private readonly catalog: CatalogClient,
    private readonly config: HandleWebhookConfig,
    private readonly logger: Logger,
  ) {}

  async execute(delivery: WebhookDelivery): Promise<HandleResult> {
    const paymentId =
      typeof delivery.payload['paymentId'] === 'string' ? delivery.payload['paymentId'] : null
    if (!paymentId) {
      // Payload sem paymentId não é processável — consumir (re-entrega não conserta).
      this.logger.warn('fiscal.webhook_without_payment_id', { eventName: delivery.eventName })
      return { kind: 'ok' }
    }

    switch (delivery.eventName) {
      case 'payment.paid':
        return this.onPaid(paymentId)
      case 'payment.refunded':
        return this.onRefunded(paymentId)
      default:
        // Evento não-assinado/futuro: consumir sem efeito.
        return { kind: 'ok' }
    }
  }

  private async onPaid(paymentId: string): Promise<HandleResult> {
    let snapshot: Awaited<ReturnType<PaymentsClient['getPayment']>>
    try {
      snapshot = await this.payments.getPayment(paymentId)
    } catch (error) {
      return { kind: 'retryable', reason: `payments indisponível: ${msg(error)}` }
    }
    if (!snapshot) {
      // Pagamento não existe no payments — entrega inválida, consumir.
      this.logger.error('fiscal.paid_payment_not_found', { paymentId })
      return { kind: 'ok' }
    }
    if (snapshot.status !== 'PAID' || !snapshot.paidAt) {
      // Corrida paid→refunded antes de processarmos: não agenda nada.
      this.logger.info('fiscal.paid_but_not_paid_anymore', { paymentId, status: snapshot.status })
      return { kind: 'ok' }
    }

    // Idempotência do fluxo automático: no MÁXIMO 1 nota por pagamento na vida. A
    // unique parcial só cobre ATIVAS, então uma re-entrega após a 1ª já ter virado
    // SKIPPED/FAILED criaria uma 2ª nota — aqui barramos por QUALQUER status.
    // (Backfill/retry deliberado é pela rota admin, não pelo webhook.)
    const existing = await this.invoices.findAnyByPaymentId(paymentId)
    if (existing) {
      this.logger.info('fiscal.paid_already_handled', {
        paymentId,
        invoiceId: existing.id,
        status: existing.status,
      })
      return { kind: 'ok' }
    }

    const offerId =
      typeof snapshot.metadata['offerId'] === 'string' ? snapshot.metadata['offerId'] : null
    let guaranteeDays: number | null = null
    let productName: string | null = null
    if (offerId) {
      let offer: Awaited<ReturnType<CatalogClient['getOfferById']>>
      try {
        offer = await this.catalog.getOfferById(offerId)
      } catch (error) {
        // guaranteeDays errado emitiria a nota CEDO demais — fail-closed, re-entrega.
        return { kind: 'retryable', reason: `catalog indisponível: ${msg(error)}` }
      }
      if (!offer) {
        // Oferta paga DEVE existir no catálogo. 404 (drift/oferta removida) sem o
        // guaranteeDays real arriscaria emitir DENTRO da garantia (default 7 < real)
        // — fail-closed: re-entrega e alerta (≠ do manual, onde o admin decide).
        this.logger.error('fiscal.offer_not_found', { paymentId, offerId })
        return { kind: 'retryable', reason: `oferta ${offerId} não encontrada no catalog` }
      }
      guaranteeDays = offer.guaranteeDays
      productName = offer.productName ?? offer.name
    }
    const serviceDescription = composeServiceDescription(this.config.serviceDescPrefix, productName)

    const days = guaranteeDays ?? this.config.defaultGuaranteeDays
    const scheduledFor = new Date(
      snapshot.paidAt.getTime() + days * 24 * 3600_000 + this.config.emitBufferHours * 3600_000,
    )

    const document = snapshot.customer?.document ?? ''
    const invoice = await this.invoices.schedule({
      paymentId,
      customer: {
        name: snapshot.customer?.name ?? '',
        email: snapshot.customer?.email ?? '',
        document,
      },
      amountInCents: snapshot.amountInCents,
      serviceDescription,
      offerId,
      guaranteeDays,
      paidAt: snapshot.paidAt,
      scheduledFor,
      ambiente: this.config.ambiente,
    })
    await this.invoices.appendEvent(invoice.id, 'SCHEDULED', 'system', {
      paymentId,
      scheduledFor: scheduledFor.toISOString(),
      guaranteeDays: days,
    })

    // CPF inválido nunca passa na Sefin (E0207) — falha CEDO com erro legível
    // (visível no admin), em vez de queimar tentativas no worker.
    if (!CPF_RE.test(document) && invoice.status === 'SCHEDULED') {
      await this.invoices.markFailed(
        invoice.id,
        'CPF do comprador ausente ou inválido no pagamento',
      )
      await this.invoices.appendEvent(invoice.id, 'EMIT_FAILED', 'system', {
        reason: 'INVALID_CUSTOMER_DOCUMENT',
      })
    }

    this.logger.info('fiscal.invoice_scheduled', {
      invoiceId: invoice.id,
      paymentId,
      scheduledFor: scheduledFor.toISOString(),
    })
    return { kind: 'ok' }
  }

  private async onRefunded(paymentId: string): Promise<HandleResult> {
    // TODAS as ativas do pagamento — uma substituição em voo deixa original
    // EMITTED + substituta SCHEDULED coexistindo; o estorno trata as duas.
    const active = await this.invoices.findActiveManyByPaymentId(paymentId)
    if (active.length === 0) {
      // Estorno antes do paid chegar (ou venda pré-fiscal) — nada a fazer.
      this.logger.info('fiscal.refund_without_invoice', { paymentId })
      return { kind: 'ok' }
    }

    for (const invoice of active) {
      if (invoice.status === 'SCHEDULED') {
        await this.invoices.skip(invoice.id, SkipReason.REFUNDED_BEFORE_EMISSION)
        await this.invoices.appendEvent(invoice.id, 'SKIPPED', 'system:refund', { paymentId })
        this.logger.info('fiscal.invoice_skipped_on_refund', { invoiceId: invoice.id, paymentId })
        continue
      }

      if (invoice.status === 'EMITTED') {
        // emittedAt nulo numa EMITTED é anômalo — trata como RECÉM-emitida (idade 0)
        // p/ falhar FECHADO em direção ao cancelamento (≠ de `?? 0` = epoch = ~56
        // anos = fora da janela = NÃO cancela uma venda estornada).
        const emittedMs = invoice.emittedAt?.getTime()
        const ageDays = emittedMs == null ? 0 : (Date.now() - emittedMs) / (24 * 3600_000)
        if (ageDays > this.config.cancelWindowDays) {
          // Fora da janela técnica de cancelamento — só sinaliza (ação manual).
          this.logger.error('fiscal.refund_after_cancel_window', {
            invoiceId: invoice.id,
            paymentId,
            ageDays: Math.floor(ageDays),
          })
          await this.invoices.appendEvent(
            invoice.id,
            'CANCEL_REQUESTED_OUT_OF_WINDOW',
            'system:refund',
            {},
          )
          continue
        }
        await this.invoices.requestCancel(
          invoice.id,
          'system:refund',
          'Pagamento reembolsado ao consumidor',
        )
        await this.invoices.appendEvent(invoice.id, 'CANCEL_REQUESTED', 'system:refund', {
          paymentId,
        })
        this.logger.info('fiscal.cancel_requested_on_refund', { invoiceId: invoice.id, paymentId })
      }
      // CANCEL_PENDING — já a caminho do cancelamento; idempotente.
    }
    return { kind: 'ok' }
  }
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
