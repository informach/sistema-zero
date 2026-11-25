/** Contratos de transporte de convites e campanhas; sem dependência de serviço. */
import type { CampaignSchedule } from './campaign-schedule'

export { type CampaignSchedule, campaignScheduleWindows } from './campaign-schedule'
export { campaignCouponPromotion } from './coupon-promotion'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended'
export type CampaignState = CampaignStatus | 'scheduled'
export type CampaignContext = 'ad' | 'event' | 'other'
/** Bônus único de aquisição; nunca mensalidade de comissão ou renovação. */
export interface ReferralBonusAmounts {
  monthly: number
  annual: number
}
export const DEFAULT_REFERRAL_BONUS: Readonly<ReferralBonusAmounts> = {
  monthly: 3000,
  annual: 8000,
}
/**
 * Público do presente (20/10/2026): `kids` leva ao Cadê Todo Mundo e ao Mural Kids, com o
 * cadastro feito pelo responsável; `adult` leva à versão adulta do curso e ao Mural adulto, com
 * o cadastro da própria pessoa. Códigos, campanhas e resgates antigos são `kids`.
 */
export type GiftAudience = 'kids' | 'adult'
export const GIFT_AUDIENCES: readonly GiftAudience[] = ['kids', 'adult']
export function isGiftAudience(value: unknown): value is GiftAudience {
  return value === 'kids' || value === 'adult'
}
/** Direito efetivamente concedido pelo resgate, incluindo versões históricas. */
export type GiftMuralAccess = 'trial' | 'visitor' | 'none'
export interface GiftAttribution {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
}
export interface GiftSource {
  kind: 'ambassador' | 'account' | 'campaign'
  name: string
  campaignId?: string
  context?: CampaignContext
  description?: string
}
/** Nome para o convite público: pessoas usam só o primeiro nome; campanhas mantêm o título. */
export function publicGiftSourceName(source: Pick<GiftSource, 'kind' | 'name'>): string {
  const name = source.name.trim()
  return source.kind === 'campaign' ? name : (name.split(/\s+/u)[0] ?? '')
}
/**
 * O que o presente entrega (15/11/2026): a OFERTA do catálogo escolhida pela campanha (ou a
 * oferta padrão do público, nos códigos de embaixador). O presente só aceita oferta sem prazo
 * (vitalícia) ou de prazo fixo em DIAS: `accessDays` nulo = sem prazo; `learner` vem do curso
 * principal publicado.
 */
export interface ReferralGiftOfferView {
  offerId: string
  offerTitle: string
  courseSlug: string | null
  courseTitle: string | null
  learner: 'child' | 'parents' | null
  accessDays: number | null
  includesMural: boolean
}
/**
 * O prazo do presente em texto, a fonte única do Admin, do referrals (e-mails) e do funil:
 * "1 dia", "7 dias" ou "sem prazo" (`accessDays` nulo, oferta vitalícia).
 */
export function giftDurationLabel(accessDays: number | null): string {
  if (accessDays === null) return 'sem prazo'
  return `${accessDays} ${accessDays === 1 ? 'dia' : 'dias'}`
}
export interface ReferralGiftView {
  code: string
  displayName: string
  ownerKind: GiftSource['kind']
  source: GiftSource
  state: Exclude<CampaignState, 'draft'>
  startsAt: string | null
  endsAt: string | null
  giftAvailable: boolean
  /** Ausente em respostas anteriores a 20/10/2026: trate como `kids`. */
  audience?: GiftAudience
  /** Ausente quando a oferta do presente não pôde ser resolvida (ou em respostas antigas). */
  gift?: ReferralGiftOfferView
}
/** Os links públicos do embaixador, um por público (`/bolsa/<code>`). */
export interface AmbassadorShareUrls {
  kids: string | null
  adult: string | null
}
/**
 * Tipo da campanha (25/11/2026): `gift` dá a oferta de presente; `sale` leva à página de venda
 * (ou direto ao pagamento) de UMA oferta. Ausente = `gift` (todas as campanhas anteriores).
 */
export type CampaignKind = 'gift' | 'sale'
export const CAMPAIGN_KINDS: readonly CampaignKind[] = ['gift', 'sale']
/** Para onde o link de venda leva: a página da oferta ou direto o pagamento. */
export type CampaignLinkTarget = 'page' | 'checkout'
export const CAMPAIGN_LINK_TARGETS: readonly CampaignLinkTarget[] = ['page', 'checkout']
/**
 * Endereço antigo do funil que redireciona para a campanha até uma data (ex.:
 * `/kids/vilao-em-aliado`). Caminho absoluto, sem query, em minúsculas, com pelo menos dois
 * segmentos (nunca a raiz de um público) e até 120 caracteres (`campaigns.redirect_path`).
 * Prefixos do próprio programa e do funil são reservados: redirecioná-los quebraria links já
 * enviados (`/bolsa/<código>`, `/i/...`) ou o próprio funil.
 */
const REDIRECT_SEGMENT = /^[a-z0-9][a-z0-9-]*$/
const RESERVED_REDIRECT_ROOTS = new Set([
  'i',
  'bolsa',
  'cupom',
  'embaixador',
  'api',
  'admin',
  'termos',
  'privacidade',
])
export function isCampaignRedirectPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 120 || !value.startsWith('/')) return false
  const segments = value.slice(1).split('/')
  if (segments.length < 2 || !segments.every((s) => REDIRECT_SEGMENT.test(s))) return false
  return !RESERVED_REDIRECT_ROOTS.has(segments[0] ?? '')
}
export interface CampaignInput {
  /** Ausente/null conserva o calendário manual legado. */
  schedule?: CampaignSchedule | null
  /** Ausente = `gift`. Só muda em rascunho sem cadastros, como o público. */
  kind?: CampaignKind
  /** Oferta à venda da campanha `sale` (UUID do catálogo). Nula na campanha de presente. */
  saleOfferId?: string | null
  /** Destino do link da campanha `sale`. Ausente = `page`. */
  linkTarget?: CampaignLinkTarget
  /** Endereço antigo que redireciona para a campanha até `redirectUntil`; null = nenhum. */
  redirectPath?: string | null
  /** Fim do redirecionamento (ISO). Obrigatório com `redirectPath`. */
  redirectUntil?: string | null
  coupon?: CampaignCouponLink | null
  name: string
  publicTitle: string
  description: string
  context: CampaignContext
  code: string
  startsAt: string
  endsAt: string
  status: CampaignStatus
  channel: string
  /** Ausente = `kids`. Só muda enquanto a campanha está em rascunho. */
  audience?: GiftAudience
  /**
   * Oferta do catálogo (UUID) que a campanha dá de presente, sem cobrar. Obrigatória em
   * campanha nova; na edição, ausente conserva a gravada. Nula só em campanhas antigas.
   */
  giftOfferId?: string | null
  /** Vínculo de atribuição; não habilita comissão por si só. */
  ambassadorId?: string | null
  commissionEnabled?: boolean
  commissionAmountCents?: number | null
  /** Bônus único anual; ausente/null conserva o acordo legado de valor único. */
  commissionAnnualAmountCents?: number | null
  /** Primeira cobrança paga antes deste prazo após o resgate; independente dos sete dias. */
  commissionWindowDays?: number | null
}
/**
 * Resultado de uma origem (campanha ou embaixador), contado pelas aquisições com aquela origem
 * (25/11/2026). `people` = pessoas distintas que entraram por ela (presente ou compra);
 * `purchases` = compras fora a assinatura; `subscriptions` = primeiras assinaturas;
 * `revenueCents` = valor pago, sem estornos (string: bigint); `null` para quem não é admin (o
 * faturamento é leitura admin+, como a Origem das vendas).
 */
export interface OriginResults {
  people: number
  gifts: number
  purchases: number
  subscriptions: number
  revenueCents: string | null
}
export interface CampaignView extends CampaignInput {
  couponView?: CampaignCouponView | null
  audience: GiftAudience
  kind?: CampaignKind
  linkTarget?: CampaignLinkTarget
  /** Ausente em respostas anteriores a 25/11/2026. */
  results?: OriginResults
  ambassadorName?: string | null
  id: string
  state: CampaignState
  shareUrl: string
  createdAt: string
  updatedAt: string
  stats: { redemptions: number; pending: number; failed: number; conversions: number }
}
export interface CampaignUpdateInput extends CampaignInput {
  /** Versão lida pelo operador; impede sobrescrever uma edição mais recente. */
  expectedUpdatedAt: string
}
/** Visão privada do parceiro: somente leitura, sem participantes nem campos internos. */
export interface AmbassadorCampaignView {
  couponView?: CampaignCouponView | null
  id: string
  publicTitle: string
  audience: GiftAudience
  state: Exclude<CampaignState, 'draft'>
  startsAt: string
  endsAt: string
  shareUrl: string
  commissionEnabled: boolean
  commissionAmountCents: number | null
  commissionAnnualAmountCents: number | null
  commissionWindowDays: number | null
}
/** O Catálogo é a autoridade de desconto e oferta; a campanha guarda apenas o vínculo. */
export interface CampaignCouponLink {
  couponId: string
  offerId: string
}
export interface CampaignCouponDetails extends CampaignCouponLink {
  code: string
  offerSlug: string
  offerName: string
  percentOff: number | null
  amountOffCents: number | null
  currency: string
  accessMode: string
  accessDurationValue: number | null
  accessDurationUnit: string | null
  available: boolean
}
export interface CampaignCouponView extends CampaignCouponDetails {
  state: Exclude<CampaignState, 'draft'> | 'unavailable'
  startsAt: string
  endsAt: string
  shareUrl: string
}
export interface CampaignCouponPolicy {
  audience: GiftAudience
  couponId: string
  offerId: string
  status: CampaignStatus
  startsAt: string
  endsAt: string
}
export interface AmbassadorCampaignPage {
  items: AmbassadorCampaignView[]
  total: number
  limit: number
  offset: number
}
export interface CampaignAuditView {
  id: string
  action: 'created' | 'updated' | 'duplicated'
  actor: string
  createdAt: string
  changes: Partial<CampaignInput>
}
export interface CampaignDetailView {
  campaign: CampaignView
  history: CampaignAuditView[]
  redemptions: {
    id: string
    userId: string | null
    name: string
    email: string
    status: string
    createdAt: string
    expiresAt: string | null
    lastError: string | null
    attribution: GiftAttribution | null
    ambassadorName?: string | null
    conversion?: {
      paidAt: string
      status: string
      bonusCents: number
      amountCents: string
    } | null
  }[]
}

/**
 * Ofertas que o embaixador pode mandar (25/11/2026): a lista é do PÚBLICO (vale para todos os
 * embaixadores dele) e o Admin a edita. `gift` = presente (pagamento único, sem prazo ou com
 * prazo em dias); `referral` = indicação (a pessoa compra; só a assinatura da Comunidade dá bônus).
 */
export type AmbassadorOfferKind = 'gift' | 'referral'
export const AMBASSADOR_OFFER_KINDS: readonly AmbassadorOfferKind[] = ['gift', 'referral']
export interface AmbassadorOfferItem {
  offerId: string
  enabled: boolean
}
export interface AmbassadorOfferView extends AmbassadorOfferItem {
  audience: GiftAudience
  kind: AmbassadorOfferKind
  position: number
  updatedAt: string
}
export interface AmbassadorOffersInput {
  audience: GiftAudience
  kind: AmbassadorOfferKind
  /** A lista inteira, na ordem em que aparece na página do embaixador. */
  items: AmbassadorOfferItem[]
}

/**
 * De onde veio uma aquisição (25/11/2026). `ambassador` = link pessoal; `campaign` = link de
 * campanha (com ou sem embaixador); `platform` = botão dentro da plataforma (`place`);
 * `ads` = marcas de anúncio (UTM); `none` = sem indicação.
 */
export type AcquisitionOriginKind = 'ambassador' | 'campaign' | 'platform' | 'ads' | 'none'
export const ACQUISITION_ORIGIN_KINDS: readonly AcquisitionOriginKind[] = [
  'ambassador',
  'campaign',
  'platform',
  'ads',
  'none',
]
/** O que foi adquirido: presente resgatado, compra avulsa ou (primeira) assinatura. */
export type AcquisitionKind = 'gift' | 'one_time' | 'subscription'
export const ACQUISITION_KINDS: readonly AcquisitionKind[] = ['gift', 'one_time', 'subscription']
/** Código de indicação (embaixador ou campanha), o mesmo formato de `codes.code`. */
export const REFERRAL_CODE_PATTERN = /^[a-z0-9-]{4,32}$/
/** Etiqueta do lugar de um botão da plataforma (ex.: `pais-curso-fechado`). */
export const ORIGIN_PLACE_PATTERN = /^[a-z0-9][a-z0-9-]{1,47}$/
export function sanitizeReferralCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toLowerCase()
  return REFERRAL_CODE_PATTERN.test(code) ? code : null
}
export function sanitizeOriginPlace(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const place = value.trim().toLowerCase()
  return ORIGIN_PLACE_PATTERN.test(place) ? place : null
}
/**
 * Fonte de mídia (`utm_source`) gravada como `origemFonte`: a mesma régua de token do funil
 * (`google_ads`, `l.instagram.com`, `meta+ads`), em minúsculas e até 100 caracteres.
 */
export const ORIGIN_SOURCE_PATTERN = /^[a-z0-9][a-z0-9._+-]{0,99}$/
export function sanitizeOriginSource(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const source = value.trim().toLowerCase()
  return ORIGIN_SOURCE_PATTERN.test(source) ? source : null
}
/**
 * Chaves PLANAS que o funil grava no `metadata` do pagamento e o referrals lê para gravar a
 * aquisição com a origem. Planas de propósito: o payments limita a 50 chaves e consultas
 * `metadata->>'origemCodigo'` ficam diretas.
 */
export const PAYMENT_ORIGIN_CODE_KEY = 'origemCodigo'
export const PAYMENT_ORIGIN_PLACE_KEY = 'origemLugar'
/** `utm_source` do lead (anúncio ou rede), quando a compra não veio de indicação nem botão. */
export const PAYMENT_ORIGIN_SOURCE_KEY = 'origemFonte'

/** Uma aquisição como o Admin a mostra (ficha da conta, últimas aquisições, pessoas). */
export interface AcquisitionView {
  id: string
  email: string
  audience: GiftAudience
  kind: AcquisitionKind
  offerId: string | null
  offerSlug: string | null
  /** Valor pago (string: bigint). Presente = "0". */
  amountCents: string
  originKind: AcquisitionOriginKind
  campaignId: string | null
  campaignTitle: string | null
  ambassadorId: string | null
  ambassadorName: string | null
  place: string | null
  utmSource: string | null
  status: 'active' | 'refunded'
  acquiredAt: string
  /** É a primeira aquisição da pessoa no público ("por onde entrou"). */
  firstEntry: boolean
}
/** Linha de resultado por origem no relatório "Origem das vendas". */
export interface OriginBreakdownRow {
  origin: AcquisitionOriginKind
  /** Pessoas cuja PRIMEIRA aquisição no público caiu no período com esta origem. */
  newPeople: number
  gifts: number
  purchases: number
  subscriptions: number
  revenueCents: string
}
export interface OriginWeekRow {
  /** Segunda-feira da semana (YYYY-MM-DD, Brasília). */
  weekStart: string
  revenueByOrigin: Record<AcquisitionOriginKind, string>
}
export interface OriginPlaceRow {
  place: string
  purchases: number
  subscriptions: number
  revenueCents: string
}
/** Pela primeira entrada da pessoa: quantas assinaram até 45 dias depois e em quantos dias. */
export interface OriginPathRow {
  kind: AcquisitionKind
  offerSlug: string | null
  people: number
  subscribed: number
  averageDays: number | null
}
export interface OriginRankingRow extends OriginResults {
  id: string
  name: string
}
export interface OriginReport {
  from: string
  to: string
  totals: {
    newPeople: number
    gifts: number
    purchases: number
    subscriptions: number
    revenueCents: string
    /** Parte do faturamento que veio de embaixadores e campanhas (0 a 1). */
    referralShare: number
  }
  byOrigin: OriginBreakdownRow[]
  weeks: OriginWeekRow[]
  places: OriginPlaceRow[]
  paths: OriginPathRow[]
  ambassadors: OriginRankingRow[]
  campaigns: OriginRankingRow[]
  latest: AcquisitionView[]
  /**
   * O período passou do teto de linhas da leitura: os números cobrem só as aquisições mais
   * recentes. O painel avisa e pede um período menor.
   */
  truncated?: boolean
}
/** O que veio por um embaixador ou por uma campanha, oferta a oferta. */
export interface OriginOfferRow {
  kind: AcquisitionKind
  offerSlug: string | null
  count: number
  revenueCents: string
}
/** Uma pessoa que entrou por uma origem, com o que fez depois (detalhe no Admin). */
export interface OriginPersonView {
  email: string
  /** A aquisição por esta origem (a primeira, se houver mais de uma). */
  entry: AcquisitionView
  /** O que a pessoa adquiriu depois, de qualquer origem. */
  later: AcquisitionView[]
  conversion: { status: string; bonusCents: number; paidAt: string } | null
}
export interface OriginDetail {
  results: OriginResults
  byOffer: OriginOfferRow[]
  people: OriginPersonView[]
  peopleTotal: number
}

/** Identificadores de mídia, nunca dados livres de uma família. */
export function sanitizeGiftAttribution(value: unknown): GiftAttribution | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const clean = (entry: unknown) => {
    if (typeof entry !== 'string') return null
    const token = entry.trim().slice(0, 100)
    return /^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/.test(token) ? token : null
  }
  const result = {
    utmSource: clean(raw.utmSource),
    utmMedium: clean(raw.utmMedium),
    utmCampaign: clean(raw.utmCampaign),
    utmContent: clean(raw.utmContent),
  }
  return Object.values(result).some(Boolean) ? result : null
}
