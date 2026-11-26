'use client'

import {
  type CampaignInput,
  type CampaignKind,
  type CampaignState,
  type CampaignView,
  type GiftAudience,
  isGiftAudience,
} from '@sistemazero/core/referrals'
import { Badge } from '@sistemazero/ui/badge'
import { campaignLocalDate } from '@/lib/campaign-dates'
import type { Platform } from '@/lib/platform'
import {
  campaignGiftOfferName,
  GIFT_CATALOG_UNAVAILABLE_MESSAGE,
  GIFT_OFFER_LOCKED_MESSAGE,
  type GiftOffersState,
  giftOfferIncludes,
} from './campaign-gift-offer'

/**
 * O que a lista, o detalhe e o formulário das campanhas dividem (25/11/2026): os nomes das
 * situações, do tipo e do público, os recados dos erros do referrals e a campanha vazia.
 */

/**
 * A situação da campanha com o mesmo nome no formulário e na lista: "Ativa" (o formulário dizia
 * "Ativa (respeita as datas)" e a lista dizia "Aberta").
 */
export const STATE_LABELS: Record<CampaignState, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  active: 'Ativa',
  paused: 'Pausada',
  ended: 'Encerrada',
}
export const KIND_LABELS: Record<CampaignKind, string> = { gift: 'Presente', sale: 'Venda' }

export const AUDIENCE_LOCKED_MESSAGE =
  'O público só muda enquanto a campanha está em rascunho. Para trocar, duplique a campanha como nova edição.'
export const KIND_LOCKED_MESSAGE =
  'O tipo só muda enquanto a campanha está em rascunho e sem cadastros. Para trocar, duplique a campanha como nova edição.'
export const REDIRECT_TAKEN_MESSAGE =
  'Outra campanha já redireciona este endereço antigo. Escolha outro endereço ou tire o redirecionamento da outra campanha.'

/** Campanha anterior a 20/10/2026 (ou serviço antigo) chega sem `audience`: é Kids. */
export const audienceOf = (value: { audience?: unknown }): GiftAudience =>
  isGiftAudience(value.audience) ? value.audience : 'kids'
/** Campanha anterior a 25/11/2026 chega sem `kind`: é de presente. */
export const kindOf = (value: { kind?: unknown }): CampaignKind =>
  value.kind === 'sale' ? 'sale' : 'gift'

export function AudienceBadge({ audience }: { audience: GiftAudience }) {
  return (
    <Badge variant={audience === 'adult' ? 'outline' : 'default'}>
      {audience === 'adult' ? 'Adulto' : 'Kids'}
    </Badge>
  )
}
export function KindBadge({ kind }: { kind: CampaignKind }) {
  return (
    <Badge
      className={
        kind === 'sale' ? 'bg-warning-tint text-foreground' : 'bg-primary/10 text-foreground'
      }
    >
      {KIND_LABELS[kind]}
    </Badge>
  )
}

export const dateLabel = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
export const cardDateLabel = (value: string) =>
  new Date(value)
    .toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    })
    .replace(',', '')
export const moneyLabel = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const conversionLabels: Record<string, string> = {
  pending: 'Aguardando garantia',
  eligible: 'Comissão disponível',
  paid: 'Comissão paga',
  canceled: 'Pagamento estornado',
  self_blocked: 'Autoindicação sem comissão',
  unrewarded: 'Sem comissão',
  superseded: 'Compra substituída por uma anterior elegível',
}

const codeMessages: Record<string, string> = {
  CAMPAIGN_AUDIENCE_LOCKED: AUDIENCE_LOCKED_MESSAGE,
  CAMPAIGN_GIFT_OFFER_LOCKED: GIFT_OFFER_LOCKED_MESSAGE,
  CAMPAIGN_KIND_LOCKED: KIND_LOCKED_MESSAGE,
  CAMPAIGN_REDIRECT_TAKEN: REDIRECT_TAKEN_MESSAGE,
  CATALOG_UNAVAILABLE: GIFT_CATALOG_UNAVAILABLE_MESSAGE,
}
export const errorMessage = (err: unknown) => {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' ? err.code : ''
  if (codeMessages[code]) return codeMessages[code]
  return err && typeof err === 'object' && 'message' in err
    ? String(err.message)
    : 'Não deu certo. Tente de novo.'
}

export type Editing = {
  value: CampaignInput
  id?: string
  duplicate?: boolean
  expectedUpdatedAt?: string
}
export const emptyCampaign = (audience: Platform): CampaignInput => ({
  schedule: {
    eventDate: campaignLocalDate(new Date().toISOString()).slice(0, 10),
    giftClaimDays: 3,
    couponClaimDays: 7,
  },
  kind: 'gift',
  linkTarget: 'page',
  name: '',
  publicTitle: '',
  description: '',
  context: 'ad',
  code: '',
  channel: '',
  status: 'draft',
  audience,
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
})

/** O que a campanha entrega, numa linha (a oferta de presente ou a oferta à venda). */
export function GiftOfferSummary({
  campaign,
  offers,
  inline = false,
}: {
  campaign: Pick<CampaignView, 'giftOfferId'>
  offers: GiftOffersState
  inline?: boolean
}) {
  const option = campaign.giftOfferId ? offers.byId.get(campaign.giftOfferId) : undefined
  const name = campaignGiftOfferName(campaign, offers)
  const details = option ? `${giftOfferIncludes(option)} · ${option.duration}` : null
  if (inline) return <>{details ? `${name} (${details}).` : `${name}.`}</>
  return (
    <>
      <div>{name}</div>
      {details ? <div className="text-xs text-muted-foreground">{details}</div> : null}
    </>
  )
}

export function previewUrl(campaign: CampaignView) {
  const url = new URL('/bolsa/previa', campaign.shareUrl)
  url.search = new URLSearchParams({
    // A prévia escolhe a página Kids ou adulta pelo público (o funil trata ausente como Kids).
    audience: audienceOf(campaign),
    title: campaign.publicTitle,
    description: campaign.description,
    context: campaign.context,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
  }).toString()
  return url.href
}

/** O endereço antigo digitado ("sistemazero.com.br/kids/x", "/kids/x", "kids/x") como caminho. */
export function normalizeRedirectPath(value: string): string {
  let path = value.trim().toLowerCase()
  path = path.replace(/^https?:\/\//, '').replace(/^[^/]*\.[a-z]{2,}(?=\/)/, '')
  path = path.split(/[?#]/)[0] ?? ''
  if (!path.startsWith('/')) path = `/${path}`
  return path.replace(/\/+$/, '')
}

/** O fim do dia (23h59, Brasília) de uma data `YYYY-MM-DD`, daqui a `days` dias. */
export function defaultRedirectUntil(days = 30, now = new Date()): string {
  return campaignLocalDate(new Date(now.getTime() + days * 86_400_000).toISOString()).slice(0, 10)
}
