import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import {
  type GiftAudience,
  isGiftAudience,
  PAYMENT_ORIGIN_CODE_KEY,
  PAYMENT_ORIGIN_PLACE_KEY,
  PAYMENT_ORIGIN_SOURCE_KEY,
  sanitizeOriginPlace,
  sanitizeOriginSource,
  sanitizeReferralCode,
} from '@sistemazero/core/referrals'
import {
  type AcquisitionBonusTerms,
  type AcquisitionOrigin,
  type AcquisitionRecord,
  type BonusDefaults,
  originFromCode,
} from '../../domain/acquisition'
import { normalizeEmail } from '../../domain/codes'
import { offerGiftAudience } from '../../domain/gift-policy'
import type { AcquisitionRepository } from '../../domain/ports/acquisition-repository.port'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type {
  CatalogClient,
  OfferSnapshot,
  PaymentSnapshot,
  PaymentsClient,
} from '../../domain/ports/clients.port'
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
  /** Valor único legado dos acordos anteriores à política por plano. */
  bonusAmountCents: number
  /** Padrão por plano dos links pessoais (capturado na aquisição). */
  bonusAmounts?: { monthly: number; annual: number } | null
  /** Prazo do link pessoal em dias (45). */
  bonusWindowDays?: number
  /** Garantia + buffer (mesma régua da NFS-e: 7d + 12h = 180). */
  matureHours: number
}

/**
 * Cobrança de assinatura feita até N dias depois da criação dela é a PRIMEIRA (a tentativa do
 * cartão pode atrasar uns dias); as renovações vêm um mês depois ou mais. Renovação não é
 * aquisição nem gera bônus.
 */
const FIRST_CHARGE_MAX_DAYS = 20
const DAY_MS = 86_400_000

/**
 * Consome as entregas do payments (consumer `referrals`, fan-out). Desde 25/11/2026:
 * 1. TODA compra (avulsa ou primeira cobrança de assinatura) vira AQUISIÇÃO com a origem que
 *    o funil gravou no metadata (`origemCodigo`, `origemLugar`, `origemFonte`), sem consultar o
 *    catálogo (o slug é completado depois, pelo sweep). Renovação não entra.
 * 2. Na assinatura da Comunidade, o bônus vai para o PRIMEIRO embaixador entre as aquisições
 *    da pessoa no público dentro do prazo de cada uma (`bonusTerms.windowDays`, capturado na
 *    aquisição). Sem embaixador no prazo, não há conversão. O catálogo só é consultado aqui,
 *    então uma queda dele não vira tempestade de retry das compras sem embaixador.
 * O bônus nunca é saldo: nasce `pending`, o sweep o promove a `eligible` após a garantia e o
 * Pix é manual. Uma primeira assinatura por pessoa e público (`conversions_subscriber_uq`).
 */
export class RecordConversionService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly acquisitions: AcquisitionRepository,
    private readonly campaigns: Pick<CampaignRepository, 'findById'>,
    private readonly payments: PaymentsClient,
    private readonly catalog: CatalogClient,
    private readonly config: RecordConversionConfig,
    private readonly logger: Logger,
    /** Presentes concluídos da pessoa que ainda não viraram aquisição (reparo na hora). */
    private readonly giftRepair?: {
      repairGifts(limit?: number, email?: string): Promise<number>
    },
  ) {}

  private get defaults(): BonusDefaults {
    return {
      amounts: this.config.bonusAmounts ?? null,
      legacyCents: this.config.bonusAmountCents,
      windowDays: this.config.bonusWindowDays ?? 45,
    }
  }

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
    let snapshot: PaymentSnapshot | null
    try {
      snapshot = await this.payments.getPayment(paymentId)
    } catch (error) {
      return { kind: 'retryable', reason: `payments indisponível: ${msg(error)}` }
    }
    if (!snapshot) {
      this.logger.error('referrals.paid_payment_not_found', { paymentId })
      return { kind: 'ok' }
    }
    if (snapshot.status === 'REFUNDED') return this.onRefunded(paymentId)
    if (snapshot.status !== 'PAID' || !snapshot.paidAt) return { kind: 'ok' }
    const paidAt = snapshot.paidAt
    const email = normalizeEmail(snapshot.customer?.email ?? '')
    const offerId = typeof snapshot.metadata.offerId === 'string' ? snapshot.metadata.offerId : null
    // Sem e-mail ou sem oferta não há pessoa nem o que classificar — consumir.
    if (!email || !offerId) return { kind: 'ok' }

    // Renovação de assinatura não é aquisição: só a primeira cobrança entra. A data em que a
    // assinatura nasceu também é o "quando assinou" da régua do bônus.
    let startedAt = paidAt
    if (snapshot.subscriptionId) {
      const already = await this.acquisitions.findByPayment(paymentId)
      if (!already && (await this.acquisitions.hasSubscription(snapshot.subscriptionId)))
        return { kind: 'ok' }
      let createdAt: Date | null
      try {
        createdAt = await this.payments.getSubscriptionCreatedAt(snapshot.subscriptionId)
      } catch (error) {
        return { kind: 'retryable', reason: `assinatura indisponível: ${msg(error)}` }
      }
      if (!createdAt || !Number.isFinite(createdAt.getTime()))
        return { kind: 'retryable', reason: 'Não foi possível comprovar a data da assinatura.' }
      if (!already && paidAt.getTime() - createdAt.getTime() > FIRST_CHARGE_MAX_DAYS * DAY_MS)
        return { kind: 'ok' }
      startedAt = createdAt < paidAt ? createdAt : paidAt
    }

    // O público vem do metadata (funis e mini checkout gravam `billingAudience`); sem ele, do
    // catálogo — o único caso em que a gravação da aquisição depende dele.
    let offer: OfferSnapshot | null = null
    let audience: GiftAudience | null = isGiftAudience(snapshot.metadata.billingAudience)
      ? snapshot.metadata.billingAudience
      : null
    if (!audience) {
      const resolved = await this.resolveOffer(paymentId, offerId)
      if (resolved.kind === 'retryable') return resolved
      offer = resolved.offer
      audience = offer.audience ?? offerGiftAudience(offer.slug)
    }

    const accountUserId =
      typeof snapshot.metadata.accountUserId === 'string' ? snapshot.metadata.accountUserId : null
    const origin = await this.paymentOrigin(snapshot.metadata)
    const { acquisition } = await this.acquisitions.insert({
      email,
      accountUserId,
      audience,
      kind: snapshot.subscriptionId ? 'subscription' : 'one_time',
      offerId,
      offerSlug: offer?.slug ?? null,
      amountCents: snapshot.amountInCents,
      paymentId,
      subscriptionId: snapshot.subscriptionId,
      redemptionId: null,
      acquiredAt: paidAt,
      ...origin,
    })

    // Presente resgatado antes da 0013 (ou cujo registro falhou) ainda sem aquisição: repara
    // agora, senão o embaixador dele perderia o bônus se a assinatura chegasse antes do sweep.
    if (this.giftRepair) {
      try {
        await this.giftRepair.repairGifts(20, email)
      } catch (error) {
        return { kind: 'retryable', reason: `reparo dos presentes indisponível: ${msg(error)}` }
      }
    }

    // O bônus: primeiro embaixador no prazo, entre as aquisições da pessoa no público (a
    // desta compra incluída — quem assinou direto pelo link conta).
    const history = await this.acquisitions.listActiveForPerson({ email, accountUserId, audience })
    // Sem embaixador no público da assinatura, vale o do outro público (decisão de 20/10/2026:
    // o presente Kids que levou o responsável a assinar a Comunidade adulta também conta).
    const winner =
      firstAmbassadorInWindow(history, startedAt, acquisition.id) ??
      firstAmbassadorInWindow(
        await this.acquisitions.listActiveForPerson({
          email,
          accountUserId,
          audience: audience === 'kids' ? 'adult' : 'kids',
        }),
        startedAt,
      )
    // O estorno pode ter sido consumido antes do INSERT da aquisição. Todo caminho que
    // conclui uma compra reconfere o pagamento, inclusive quando ela não gera bônus.
    if (!winner?.bonusTerms) return this.cancelIfNoLongerPaid(paymentId)

    if (!offer) {
      const resolved = await this.resolveOffer(paymentId, offerId)
      if (resolved.kind === 'retryable') return resolved
      offer = resolved.offer
    }
    if (!acquisition.offerSlug)
      await this.acquisitions.setOfferSlug(
        acquisition.id,
        offer.slug,
        this.config.conversionOfferSlugs.includes(offer.slug),
      )
    if (!this.config.conversionOfferSlugs.includes(offer.slug))
      return this.cancelIfNoLongerPaid(paymentId)

    // A mesma CONTA com outro e-mail de cobrança (cancelou e assinou de novo pela plataforma):
    // a vaga do bônus é por e-mail, então confere as conversões ativas dos e-mails da pessoa.
    if (accountUserId) {
      const emails = [...new Set([email, ...history.map((item) => item.email)])]
      const earlier = (await this.repo.listConversionsBySubscribers(emails)).find(
        (c) =>
          c.audience === audience &&
          c.paymentId !== paymentId &&
          c.status !== 'canceled' &&
          c.status !== 'superseded',
      )
      if (earlier) return this.cancelIfNoLongerPaid(paymentId)
    }

    const terms = winner.bonusTerms
    const selfBlocked = terms.ambassadorEmail !== '' && terms.ambassadorEmail === email
    const unrewarded = !terms.enabled
    const perPlan = terms.monthlyCents !== null && terms.annualCents !== null
    if (
      !selfBlocked &&
      !unrewarded &&
      perPlan &&
      offer.billingIntervalMonths !== 1 &&
      offer.billingIntervalMonths !== 12
    )
      return {
        kind: 'retryable',
        reason: 'Ciclo da oferta não comprovado para a comissão por plano.',
      }
    const agreedBonus = perPlan
      ? offer.billingIntervalMonths === 12
        ? (terms.annualCents ?? 0)
        : (terms.monthlyCents ?? 0)
      : (terms.fixedCents ?? 0)
    if (!winner.codeId) return this.cancelIfNoLongerPaid(paymentId)

    const { created } = await this.repo.insertConversion({
      redemptionId: winner.redemptionId,
      acquisitionId: winner.id,
      subscriberEmail: email,
      audience,
      codeId: winner.codeId,
      ambassadorId: terms.ambassadorId,
      paymentId,
      subscriptionId: snapshot.subscriptionId,
      offerSlug: offer.slug,
      amountCents: snapshot.amountInCents,
      bonusCents: selfBlocked || unrewarded ? 0 : agreedBonus,
      status: unrewarded ? 'unrewarded' : selfBlocked ? 'self_blocked' : 'pending',
      paidAt,
      maturesAt: new Date(paidAt.getTime() + this.config.matureHours * 3600_000),
    })
    if (created) {
      this.logger.info('referrals.conversion_recorded', {
        paymentId,
        acquisitionId: winner.id,
        offerSlug: offer.slug,
        selfBlocked,
      })
    }
    // Um estorno entre a consulta ao Payments e o INSERT pode ter sido consumido
    // sem conversão para cancelar. Reconfere aqui, inclusive na reentrega após
    // falha de rede: o INSERT anterior já pode ter concluído.
    return this.cancelIfNoLongerPaid(paymentId)
  }

  private async resolveOffer(
    paymentId: string,
    offerId: string,
  ): Promise<{ kind: 'ok'; offer: OfferSnapshot } | { kind: 'retryable'; reason: string }> {
    let offer: OfferSnapshot | null
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
    return { kind: 'ok', offer }
  }

  /**
   * A origem que o funil gravou no metadata. Código de indicação vence (só código que existe;
   * desativado ainda atribui, sem bônus); depois o botão da plataforma; depois a fonte de mídia.
   */
  private async paymentOrigin(
    metadata: Record<string, unknown>,
  ): Promise<AcquisitionOrigin & { bonusTerms: AcquisitionBonusTerms | null }> {
    const place = sanitizeOriginPlace(metadata[PAYMENT_ORIGIN_PLACE_KEY])
    const codeValue = sanitizeReferralCode(metadata[PAYMENT_ORIGIN_CODE_KEY])
    const code = codeValue ? await this.repo.findCodeByCode(codeValue) : null
    if (code) {
      if (code.ownerKind === 'campaign' && code.campaignId) {
        const campaign = await this.campaigns.findById(code.campaignId)
        const ambassador = campaign?.ambassadorId
          ? await this.repo.findAmbassadorById(campaign.ambassadorId)
          : null
        const annual = campaign?.commissionAnnualAmountCents ?? null
        return {
          ...originFromCode(code, { campaignAmbassadorId: ambassador?.id ?? null, place }),
          bonusTerms:
            campaign && ambassador
              ? {
                  ambassadorId: ambassador.id,
                  ambassadorEmail: normalizeEmail(ambassador.email),
                  enabled:
                    !!campaign.commissionEnabled &&
                    ambassador.status === 'active' &&
                    code.status === 'active',
                  monthlyCents: annual !== null ? (campaign.commissionAmountCents ?? null) : null,
                  annualCents: annual,
                  fixedCents: annual === null ? (campaign.commissionAmountCents ?? 0) : null,
                  windowDays: campaign.commissionWindowDays ?? this.defaults.windowDays,
                }
              : null,
        }
      }
      if (code.ownerKind === 'ambassador' && code.ambassadorId) {
        const ambassador = await this.repo.findAmbassadorById(code.ambassadorId)
        const amounts = this.defaults.amounts
        return {
          ...originFromCode(code, { place }),
          bonusTerms: ambassador
            ? {
                ambassadorId: ambassador.id,
                ambassadorEmail: normalizeEmail(ambassador.email),
                enabled: ambassador.status === 'active' && code.status === 'active',
                monthlyCents: amounts?.monthly ?? null,
                annualCents: amounts?.annual ?? null,
                fixedCents: amounts ? null : this.defaults.legacyCents,
                windowDays: this.defaults.windowDays,
              }
            : null,
        }
      }
      return { ...originFromCode(code, { place }), bonusTerms: null }
    }
    const base = { codeId: null, campaignId: null, ambassadorId: null, bonusTerms: null }
    if (place) return { ...base, originKind: 'platform', place, utm: null }
    const source = sanitizeOriginSource(metadata[PAYMENT_ORIGIN_SOURCE_KEY])
    if (source)
      return {
        ...base,
        originKind: 'ads',
        place: null,
        utm: { utmSource: source, utmMedium: null, utmCampaign: null, utmContent: null },
      }
    return { ...base, originKind: 'none', place: null, utm: null }
  }

  private async cancelIfNoLongerPaid(paymentId: string): Promise<HandleResult> {
    let fresh: Awaited<ReturnType<PaymentsClient['getPayment']>>
    try {
      fresh = await this.payments.getPayment(paymentId)
    } catch (error) {
      // A falta de confirmação não prova estorno nem encerra o processamento.
      this.logger.warn('referrals.conversion_recheck_failed', { paymentId, error: msg(error) })
      return { kind: 'retryable', reason: `conferência do pagamento indisponível: ${msg(error)}` }
    }
    if (fresh && fresh.status === 'PAID') return { kind: 'ok' }
    await this.acquisitions.markRefundedByPayment(paymentId)
    const outcome = await this.repo.cancelPendingConversionByPayment(paymentId)
    this.logger.error('referrals.conversion_canceled_refund_race', {
      paymentId,
      paymentStatus: fresh?.status ?? 'not_found',
      outcome: outcome.kind,
    })
    return { kind: 'ok' }
  }

  private async onRefunded(paymentId: string): Promise<HandleResult> {
    // A compra estornada deixa de contar (resultados, entrada da pessoa e bônus futuros).
    await this.acquisitions.markRefundedByPayment(paymentId)
    const outcome = await this.repo.cancelPendingConversionByPayment(paymentId)
    if (outcome.kind === 'canceled') {
      this.logger.info('referrals.conversion_canceled_on_refund', { paymentId })
    } else if (outcome.kind === 'not_found') {
      // O caso comum (estorno sem conversão) é ruído, mas o silêncio
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

/**
 * A régua do bônus (decisão de 25/11/2026): entre as aquisições da pessoa com embaixador, as
 * que ainda estão no prazo NA DATA DA ASSINATURA; ganha a mais antiga. Aquisição posterior à
 * assinatura não conta (o histórico vem ordenado da mais antiga para a mais nova).
 */
export function firstAmbassadorInWindow(
  history: AcquisitionRecord[],
  subscribedAt: Date,
  /** A aquisição desta própria compra: conta mesmo gravada depois de a assinatura nascer. */
  currentId?: string,
): AcquisitionRecord | null {
  for (const item of history) {
    const terms = item.bonusTerms
    if (!terms || !item.ambassadorId) continue
    // Assinatura criada ANTES da entrada pelo embaixador não é dele (a renovação de uma compra
    // anterior também não chega aqui).
    if (item.id !== currentId && item.acquiredAt.getTime() > subscribedAt.getTime()) continue
    if (subscribedAt.getTime() >= item.acquiredAt.getTime() + terms.windowDays * DAY_MS) continue
    return item
  }
  return null
}

function msg(error: unknown): string {
  const e = serializeError(error) as { message?: string }
  return e.message ?? String(error)
}
