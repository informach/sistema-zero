import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { normalizeEmail } from '../../domain/codes'
import type { CatalogClient, PaymentsClient } from '../../domain/ports/clients.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'

export interface WebhookDelivery {
  deliveryId: string
  eventName: string
  payload: Record<string, unknown>
}

/** Resultado p/ a rota decidir o status HTTP (2xx consome a entrega; 502 re-entrega). */
export type HandleResult = { kind: 'ok' } | { kind: 'retryable'; reason: string }

export interface RecordConversionConfig {
  /** Ofertas que CONTAM como "assinou a Comunidade" (mensal + anual à vista). */
  conversionOfferSlugs: string[]
  /** Bônus FIXO por assinatura (snapshot gravado na conversão). */
  bonusAmountCents: number
  /** Garantia + buffer (mesma régua da NFS-e: 7d + 12h = 180). */
  matureHours: number
}

/**
 * Consome as entregas do payments (consumer `referrals`, fan-out) e registra a
 * CONVERSÃO: bolsista (resgate `completed`) que assinou a Comunidade. A regra
 * "só a primeira cobrança paga bônus" é estrutural (UNIQUE em redemption_id) —
 * ciclos de renovação conflitam e viram no-op. O bônus nunca é saldo: nasce
 * `pending`, o sweep o promove a `eligible` após a garantia e o Pix é manual.
 */
export class RecordConversionService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly payments: PaymentsClient,
    private readonly catalog: CatalogClient,
    private readonly config: RecordConversionConfig,
    private readonly logger: Logger,
  ) {}

  async execute(delivery: WebhookDelivery): Promise<HandleResult> {
    const paymentId =
      typeof delivery.payload.paymentId === 'string' ? delivery.payload.paymentId : null
    if (!paymentId) {
      // Payload sem paymentId não é processável — consumir (re-entrega não conserta).
      this.logger.warn('referrals.webhook_without_payment_id', { eventName: delivery.eventName })
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
      this.logger.error('referrals.paid_payment_not_found', { paymentId })
      return { kind: 'ok' }
    }
    if (snapshot.status !== 'PAID' || !snapshot.paidAt) {
      // Corrida paid→refunded antes de processarmos: nada a registrar.
      return { kind: 'ok' }
    }

    // FILTRO BARATO PRIMEIRO: o fan-out entrega TODO pagamento da plataforma e
    // quase nenhum é de bolsista — um SELECT local em índice UNIQUE descarta a
    // entrega sem gastar o round-trip do catalog (e sem transformar uma queda
    // do catalog em tempestade de retry de entregas irrelevantes).
    const email = normalizeEmail(snapshot.customer?.email ?? '')
    if (!email) return { kind: 'ok' }

    const match = await this.repo.findRedemptionWithCodeByEmail(email)
    if (match?.redemption.status !== 'completed') return { kind: 'ok' }

    const offerId = typeof snapshot.metadata.offerId === 'string' ? snapshot.metadata.offerId : null
    if (!offerId) return { kind: 'ok' } // sem oferta não há como classificar — skip

    let offer: Awaited<ReturnType<CatalogClient['getOfferById']>>
    try {
      offer = await this.catalog.getOfferById(offerId)
    } catch (error) {
      return { kind: 'retryable', reason: `catalog indisponível: ${msg(error)}` }
    }
    if (!offer) {
      // Oferta paga DEVE existir no catálogo — drift permanente aflora como
      // falhas repetidas (o outbox do payments esgota e o item fica visível),
      // nunca como conversão perdida em silêncio. Mesma régua do fiscal.
      this.logger.error('referrals.offer_not_found', { paymentId, offerId })
      return { kind: 'retryable', reason: `oferta ${offerId} não encontrada no catalog` }
    }
    if (!this.config.conversionOfferSlugs.includes(offer.slug)) return { kind: 'ok' }

    // Anti-autoindicação: o dono do código assinando com o MESMO e-mail do
    // resgate não premia a si mesmo — registra a jornada, sem bônus.
    const selfBlocked =
      match.code.ownerEmail !== null && normalizeEmail(match.code.ownerEmail) === email

    const { created } = await this.repo.insertConversion({
      redemptionId: match.redemption.id,
      codeId: match.code.id,
      ambassadorId: match.code.ambassadorId,
      paymentId,
      subscriptionId: snapshot.subscriptionId,
      offerSlug: offer.slug,
      amountCents: snapshot.amountInCents,
      bonusCents: selfBlocked ? 0 : this.config.bonusAmountCents,
      status: selfBlocked ? 'self_blocked' : 'pending',
      paidAt: snapshot.paidAt,
      maturesAt: new Date(snapshot.paidAt.getTime() + this.config.matureHours * 3600_000),
    })
    if (created) {
      this.logger.info('referrals.conversion_recorded', {
        paymentId,
        redemptionId: match.redemption.id,
        offerSlug: offer.slug,
        selfBlocked,
      })
      // ⚠️ TOCTOU do estorno: entre o `getPayment` e este INSERT passaram 2 S2S
      // (payments + catalog). Um `payment.refunded` que chegue nessa janela não
      // acha conversão nenhuma para cancelar e é consumido — a conversão nasce
      // DEPOIS do estorno e vira Pix pago sobre venda devolvida. Re-verificamos
      // o pagamento só aqui (caminho raro: bolsista que assinou de verdade) e
      // cancelamos o que acabamos de criar. Mesma régua do fiscal, que
      // re-verifica o pagamento no momento de emitir.
      await this.cancelIfNoLongerPaid(paymentId)
    }
    return { kind: 'ok' }
  }

  private async cancelIfNoLongerPaid(paymentId: string): Promise<void> {
    let fresh: Awaited<ReturnType<PaymentsClient['getPayment']>>
    try {
      fresh = await this.payments.getPayment(paymentId)
    } catch (error) {
      // Não dá para afirmar que estornou — a conversão fica e o estorno, se
      // vier, cancela pelo caminho normal (ou aflora no alerta pós-garantia).
      this.logger.warn('referrals.conversion_recheck_failed', { paymentId, error: msg(error) })
      return
    }
    if (fresh && fresh.status === 'PAID') return
    const outcome = await this.repo.cancelPendingConversionByPayment(paymentId)
    this.logger.error('referrals.conversion_canceled_refund_race', {
      paymentId,
      paymentStatus: fresh?.status ?? 'not_found',
      outcome: outcome.kind,
    })
  }

  private async onRefunded(paymentId: string): Promise<HandleResult> {
    const outcome = await this.repo.cancelPendingConversionByPayment(paymentId)
    if (outcome.kind === 'canceled') {
      this.logger.info('referrals.conversion_canceled_on_refund', { paymentId })
    } else if (outcome.kind === 'not_found') {
      // O caso comum (estorno de quem não é bolsista) é ruído, mas o silêncio
      // total escondia a corrida do C1 — fica em debug, com o paymentId.
      this.logger.debug('referrals.refund_without_conversion', { paymentId })
    } else if (
      outcome.kind === 'not_pending' &&
      (outcome.status === 'eligible' || outcome.status === 'paid')
    ) {
      // Estorno DEPOIS da garantia (bônus já elegível/pago): não reverte
      // sozinho — aflora ao humano (ela decide se desconta em conversa).
      // `self_blocked` (bônus 0) e `canceled` (re-entrega) são benignos e NÃO
      // podem virar alerta falso de "devolver Pix que nunca existiu".
      this.logger.error('referrals.refund_after_bonus_eligible', {
        paymentId,
        status: outcome.status,
      })
    }
    return { kind: 'ok' }
  }
}

function msg(error: unknown): string {
  const e = serializeError(error) as { message?: string }
  return e.message ?? String(error)
}
