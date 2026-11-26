import {
  type AcquisitionKind,
  type AcquisitionOriginKind,
  type GiftAttribution,
  type GiftAudience,
  sanitizeOriginPlace,
} from '@sistemazero/core/referrals'
import type { CodeRecord, RedemptionRecord } from './ports/referral-repository.port'

/**
 * Aquisição com origem (25/11/2026): cada presente resgatado, compra avulsa e PRIMEIRA cobrança
 * de assinatura, com de onde veio. "Por onde a pessoa entrou" é a mais antiga; o bônus da
 * assinatura olha as aquisições com embaixador dentro do prazo. Renovação nunca entra.
 */
/**
 * O acordo do bônus de UMA aquisição com embaixador, capturado na hora. `enabled: false` =
 * campanha sem comissão ou embaixador desativado (atribui, sem bônus). `fixedCents` = acordo
 * legado de valor único (campanhas antigas sem o anual).
 */
export interface AcquisitionBonusTerms {
  ambassadorId: string
  /** Para o anti-autoindicação. */
  ambassadorEmail: string
  enabled: boolean
  monthlyCents: number | null
  annualCents: number | null
  fixedCents: number | null
  /** Prazo, em dias desde a aquisição, para a primeira assinatura render o bônus. */
  windowDays: number
}

export interface AcquisitionRecord {
  id: string
  email: string
  accountUserId: string | null
  audience: GiftAudience
  kind: AcquisitionKind
  offerId: string | null
  offerSlug: string | null
  amountCents: bigint
  paymentId: string | null
  subscriptionId: string | null
  redemptionId: string | null
  originKind: AcquisitionOriginKind
  codeId: string | null
  campaignId: string | null
  ambassadorId: string | null
  place: string | null
  utm: GiftAttribution | null
  bonusTerms: AcquisitionBonusTerms | null
  status: 'active' | 'refunded'
  acquiredAt: Date
  createdAt: Date
}

export type NewAcquisition = Omit<
  AcquisitionRecord,
  'id' | 'status' | 'createdAt' | 'offerSlug'
> & { offerSlug?: string | null }

/** A parte da aquisição que diz de onde ela veio. */
export type AcquisitionOrigin = Pick<
  AcquisitionRecord,
  'originKind' | 'codeId' | 'campaignId' | 'ambassadorId' | 'place' | 'utm'
>

const NO_ORIGIN: AcquisitionOrigin = {
  originKind: 'none',
  codeId: null,
  campaignId: null,
  ambassadorId: null,
  place: null,
  utm: null,
}

/** UTM que não é da plataforma vira origem de anúncio; o resto, sem indicação. */
export function originFromUtm(utm: GiftAttribution | null | undefined): AcquisitionOrigin {
  if (!utm) return NO_ORIGIN
  if (utm.utmSource === 'platform' || utm.utmSource === 'plataforma')
    return {
      ...NO_ORIGIN,
      originKind: 'platform',
      place: sanitizeOriginPlace(utm.utmContent) ?? sanitizeOriginPlace(utm.utmMedium),
      utm,
    }
  return { ...NO_ORIGIN, originKind: utm.utmSource ? 'ads' : 'none', utm }
}

/**
 * A origem de um código de indicação. Embaixador → `ambassador`; campanha → `campaign`, com o
 * embaixador da campanha quando há (o do snapshot do resgate vence o da campanha atual);
 * código de conta (fase futura) → sem indicação, com o código guardado.
 */
export function originFromCode(
  code: Pick<CodeRecord, 'id' | 'ownerKind' | 'ambassadorId' | 'campaignId'>,
  extras: {
    campaignAmbassadorId?: string | null
    place?: string | null
    utm?: GiftAttribution | null
  } = {},
): AcquisitionOrigin {
  const place = extras.place ?? null
  const utm = extras.utm ?? null
  if (code.ownerKind === 'ambassador')
    return {
      ...NO_ORIGIN,
      originKind: 'ambassador',
      codeId: code.id,
      ambassadorId: code.ambassadorId,
      place,
      utm,
    }
  if (code.ownerKind === 'campaign')
    return {
      ...NO_ORIGIN,
      originKind: 'campaign',
      codeId: code.id,
      campaignId: code.campaignId ?? null,
      ambassadorId: extras.campaignAmbassadorId ?? null,
      place,
      utm,
    }
  if (code.ownerKind === 'benefit')
    return { ...NO_ORIGIN, originKind: 'course', codeId: code.id, place, utm }
  return { ...NO_ORIGIN, codeId: code.id, place, utm }
}

export interface BonusDefaults {
  /** O padrão por plano dos links pessoais (env `BONUS_*`). */
  amounts: { monthly: number; annual: number } | null
  /** Valor único legado (env `BONUS_AMOUNT_CENTS`), usado sem o padrão por plano. */
  legacyCents: number
  /** Prazo dos links pessoais em dias (`BONUS_WINDOW_DAYS`, 45). */
  windowDays: number
}

/**
 * O acordo do bônus de um presente, a partir do que o resgate capturou: campanha → o
 * snapshot `campaignReferral` (sem embaixador = sem acordo); embaixador → os valores do resgate
 * (`bonusAmounts`) ou o legado, com o prazo dado por quem chama (o backfill de resgates antigos
 * passa um prazo longo, porque o acordo deles não tinha prazo).
 */
export function giftBonusTerms(
  redemption: Pick<RedemptionRecord, 'campaignReferral' | 'bonusAmounts'>,
  code: Pick<CodeRecord, 'ownerKind' | 'ambassadorId' | 'ownerEmail'>,
  defaults: BonusDefaults,
): AcquisitionBonusTerms | null {
  if (code.ownerKind === 'campaign') {
    const snap = redemption.campaignReferral
    if (!snap) return null
    const annual = snap.commissionAnnualAmountCents ?? null
    return {
      ambassadorId: snap.ambassadorId,
      ambassadorEmail: snap.ambassadorEmail.trim().toLowerCase(),
      enabled: snap.commissionEnabled,
      monthlyCents: annual !== null ? snap.commissionAmountCents : null,
      annualCents: annual,
      fixedCents: annual === null ? snap.commissionAmountCents : null,
      windowDays: snap.commissionWindowDays ?? defaults.windowDays,
    }
  }
  if (code.ownerKind !== 'ambassador' || !code.ambassadorId) return null
  const amounts = redemption.bonusAmounts ?? null
  return {
    ambassadorId: code.ambassadorId,
    ambassadorEmail: (code.ownerEmail ?? '').trim().toLowerCase(),
    enabled: true,
    monthlyCents: amounts?.monthly ?? null,
    annualCents: amounts?.annual ?? null,
    fixedCents: amounts ? null : defaults.legacyCents,
    windowDays: defaults.windowDays,
  }
}

/** A aquisição de um presente concluído (o resgate é a fonte; valor zero). */
export function giftAcquisition(
  redemption: RedemptionRecord,
  code: Pick<CodeRecord, 'id' | 'ownerKind' | 'ambassadorId' | 'campaignId' | 'ownerEmail'>,
  acquiredAt: Date,
  defaults: BonusDefaults,
): NewAcquisition {
  // Presente ativado de dentro da plataforma (bloco de aula, cartão): a etiqueta do lugar.
  const platform =
    redemption.attribution?.utmSource === 'platform'
      ? sanitizeOriginPlace(redemption.attribution.utmMedium)
      : null
  return {
    email: redemption.email,
    accountUserId: redemption.userId,
    audience: redemption.audience,
    kind: 'gift',
    offerId: redemption.giftOfferId ?? null,
    amountCents: 0n,
    paymentId: null,
    subscriptionId: null,
    redemptionId: redemption.id,
    acquiredAt,
    bonusTerms: giftBonusTerms(redemption, code, defaults),
    ...originFromCode(code, {
      campaignAmbassadorId: redemption.campaignReferral?.ambassadorId ?? null,
      place: code.ownerKind === 'benefit' ? 'course_benefit' : platform,
      utm: redemption.attribution ?? null,
    }),
  }
}
