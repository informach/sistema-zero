'use client'

import {
  type CampaignInput,
  type CampaignKind,
  type CampaignView,
  campaignScheduleWindows,
  DEFAULT_REFERRAL_BONUS,
  isCampaignRedirectPath,
} from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { type ReactNode, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCommunityRequests } from '@/components/admin/community-page'
import { campaignIsoDate, campaignLocalDate } from '@/lib/campaign-dates'
import { cn } from '@/lib/cn'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import { type CampaignCouponDraft, CampaignCouponDraftSchema } from '@/lib/prepare-campaign-coupon'
import type { CatalogOffersState } from './ambassador-offer-catalog'
import { CampaignCouponFields } from './campaign-coupon-fields'
import {
  GIFT_OFFER_REQUIRED_MESSAGE,
  GiftOfferField,
  type GiftOffersState,
  giftOfferIncludes,
} from './campaign-gift-offer'
import { CampaignScheduleFields } from './campaign-schedule-fields'
import {
  AudienceBadge,
  defaultRedirectUntil,
  type Editing,
  errorMessage,
  KIND_LOCKED_MESSAGE,
  kindOf,
  moneyLabel,
  normalizeRedirectPath,
  STATE_LABELS,
} from './campaign-shared'

/** Prazo padrão do bônus da campanha (dias depois de a pessoa entrar). */
export const DEFAULT_COMMISSION_WINDOW_DAYS = 45
export const SALE_OFFER_REQUIRED_MESSAGE = 'Escolha a oferta à venda da campanha.'
export const REDIRECT_PATH_MESSAGE =
  'Confira o endereço antigo: um caminho do site com pelo menos duas partes, como /kids/vilao-em-aliado.'

/** Um passo numerado do formulário (Canvas "admin-campanha-nova"). */
function Step({
  n,
  title,
  optional = false,
  children,
}: {
  n: number
  title: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`passo-${n}`} className="space-y-3 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm"
        >
          {n}
        </span>
        <h3 id={`passo-${n}`} className="font-display text-base font-bold">
          {title}
          {optional ? (
            <span className="ml-2 font-normal text-muted-foreground text-xs">opcional</span>
          ) : null}
        </h3>
      </div>
      {children}
    </section>
  )
}

/**
 * Campanha nova, edição e nova edição (25/11/2026): os passos do Canvas, na ordem do que a
 * campanha faz (presente ou venda), o link, o que ela entrega, o desconto, o calendário, o
 * embaixador e a situação, com o resumo ao lado. As regras de antes continuam (público da lente,
 * oferta travada fora do rascunho, comissão só com embaixador, cupom depois de salvar).
 */
export function CampaignEditor({
  audience,
  giftOffers,
  catalog,
  editing,
  onClose,
  onSaved,
}: {
  audience: Platform
  giftOffers: GiftOffersState
  catalog: CatalogOffersState
  editing: Editing
  onClose: () => void
  onSaved: (value: CampaignView) => void
}) {
  const [value, setValue] = useState<CampaignInput>({
    ...editing.value,
    kind: kindOf(editing.value),
    linkTarget: editing.value.linkTarget === 'checkout' ? 'checkout' : 'page',
    commissionAmountCents: editing.value.commissionAmountCents ?? DEFAULT_REFERRAL_BONUS.monthly,
    commissionAnnualAmountCents:
      editing.value.commissionAnnualAmountCents ??
      (editing.value.commissionAmountCents != null ? null : DEFAULT_REFERRAL_BONUS.annual),
  })
  const [commissionAmount, setCommissionAmount] = useState(
    editing.value.commissionAmountCents == null
      ? String(DEFAULT_REFERRAL_BONUS.monthly / 100)
      : String(editing.value.commissionAmountCents / 100),
  )
  const [commissionAnnualAmount, setCommissionAnnualAmount] = useState(
    String(
      (editing.value.commissionAnnualAmountCents ??
        editing.value.commissionAmountCents ??
        DEFAULT_REFERRAL_BONUS.annual) / 100,
    ),
  )
  const [redirectOn, setRedirectOn] = useState(Boolean(editing.value.redirectPath))
  const [redirectPath, setRedirectPath] = useState(editing.value.redirectPath ?? '')
  const [redirectUntil, setRedirectUntil] = useState(
    editing.value.redirectUntil
      ? campaignLocalDate(editing.value.redirectUntil).slice(0, 10)
      : defaultRedirectUntil(),
  )
  const { send: apiSend, get: apiGet } = useCommunityRequests(audience)
  const [partnerQuery, setPartnerQuery] = useState('')
  const [partners, setPartners] = useState<
    { id: string; name: string; email: string; status: string }[]
  >([])
  const [partnerTotal, setPartnerTotal] = useState(0)
  const [partnerOffset, setPartnerOffset] = useState(0)
  const [partnerName, setPartnerName] = useState(
    (editing.value as CampaignView).ambassadorName ?? '',
  )
  const [partnerLoading, setPartnerLoading] = useState(false)
  const [partnerSearched, setPartnerSearched] = useState(false)
  const [partnerError, setPartnerError] = useState('')
  const partnerRequest = useRef(0)
  async function searchPartners(offset = 0) {
    const request = ++partnerRequest.current
    setPartnerLoading(true)
    setPartnerError('')
    try {
      const params = new URLSearchParams({
        q: partnerQuery.trim(),
        limit: '25',
        offset: String(offset),
      })
      const result = await apiGet<{ items: typeof partners; total: number }>(
        `/api/admin/referrals/ambassadors?${params}`,
      )
      if (request !== partnerRequest.current) return
      setPartners(result.items)
      setPartnerSearched(true)
      setPartnerTotal(result.total)
      setPartnerOffset(offset)
    } catch (err) {
      if (request !== partnerRequest.current || isCanceledCommunityRequest(err)) return
      setPartners([])
      setPartnerTotal(0)
      setPartnerError(errorMessage(err))
    } finally {
      if (request === partnerRequest.current) setPartnerLoading(false)
    }
  }
  const original = editing.value as Partial<CampaignView>
  const registrations =
    (original.stats?.redemptions ?? 0) +
    (original.stats?.pending ?? 0) +
    (original.stats?.failed ?? 0) +
    (original.results?.people ?? 0)
  const lockedOutsideDraft =
    Boolean(editing.id) && !editing.duplicate && (original.status !== 'draft' || registrations > 0)
  // Campanha antiga (gravada sem oferta) segue com a oferta padrão do Cadê até escolher outra.
  // A duplicata precisa de oferta: o referrals não aceita campanha nova sem ela.
  const giftOfferLegacy = Boolean(editing.id) && !editing.duplicate && !editing.value.giftOfferId
  const giftOfferLocked = lockedOutsideDraft && Boolean(editing.value.giftOfferId)
  const kindLocked = lockedOutsideDraft
  const kind: CampaignKind = value.kind === 'sale' ? 'sale' : 'gift'
  const saleChoices = catalog.offers.filter(
    (o) => o.pageEligible || (value.saleOfferId && o.id === value.saleOfferId),
  )
  const saleOffer = value.saleOfferId ? catalog.byId.get(value.saleOfferId) : undefined
  const giftOption = value.giftOfferId ? giftOffers.byId.get(value.giftOfferId) : undefined
  const [start, setStart] = useState(campaignLocalDate(value.startsAt))
  const [end, setEnd] = useState(campaignLocalDate(value.endsAt))
  const [saving, setSaving] = useState(false)
  const [savedCampaign, setSavedCampaign] = useState<CampaignView | null>(null)
  const [couponDraft, setCouponDraft] = useState<CampaignCouponDraft | null>(null)
  const [error, setError] = useState('')
  const change = <K extends keyof CampaignInput>(key: K, next: CampaignInput[K]) =>
    setValue((current) => ({ ...current, [key]: next }))
  let windows: ReturnType<typeof campaignScheduleWindows> | null = null
  try {
    windows = value.schedule ? campaignScheduleWindows(value.schedule) : null
  } catch {
    windows = null
  }
  const shareBase =
    (original.shareUrl ? new URL(original.shareUrl).host : null) ?? 'sistemazero.com.br'
  async function submit() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      if (value.commissionEnabled && (commissionAmount === '' || commissionAnnualAmount === ''))
        throw new Error('Informe a comissão dos planos mensal e anual.')
      if (kind === 'gift' && !value.giftOfferId && !giftOfferLegacy)
        throw new Error(GIFT_OFFER_REQUIRED_MESSAGE)
      if (kind === 'sale' && !value.saleOfferId) throw new Error(SALE_OFFER_REQUIRED_MESSAGE)
      const path = redirectOn ? normalizeRedirectPath(redirectPath) : null
      if (path !== null && !isCampaignRedirectPath(path)) throw new Error(REDIRECT_PATH_MESSAGE)
      if (couponDraft) {
        if (!value.schedule)
          throw new Error('Ative o calendário da campanha para cadastrar seu cupom.')
        const valid = CampaignCouponDraftSchema.safeParse({
          ...couponDraft,
          audience,
          expectedUpdatedAt: new Date().toISOString(),
        })
        if (!valid.success) throw new Error('Confira o código, o desconto e a oferta do cupom.')
      }
      const scheduleWindows = value.schedule ? campaignScheduleWindows(value.schedule) : null
      const body: CampaignInput = {
        schedule: value.schedule ?? null,
        coupon: editing.duplicate ? null : (value.coupon ?? null),
        kind,
        saleOfferId: kind === 'sale' ? (value.saleOfferId ?? null) : null,
        linkTarget: kind === 'sale' ? (value.linkTarget ?? 'page') : 'page',
        redirectPath: path,
        redirectUntil: path ? campaignIsoDate(`${redirectUntil}T23:59`) : null,
        name: value.name,
        publicTitle: value.publicTitle,
        description: value.description,
        context: value.context,
        code: value.code,
        channel: value.channel,
        status: value.status,
        // Sempre explícito: um PATCH sem o campo não pode virar Kids por omissão.
        audience,
        // Vazia só na campanha antiga: omitida, o referrals conserva a gravada (nenhuma).
        giftOfferId: kind === 'gift' ? value.giftOfferId || undefined : undefined,
        startsAt: scheduleWindows?.startsAt ?? campaignIsoDate(start),
        endsAt: scheduleWindows?.giftEndsAt ?? campaignIsoDate(end),
        ambassadorId: value.ambassadorId ?? null,
        commissionEnabled: value.commissionEnabled ?? false,
        commissionAmountCents: value.commissionEnabled
          ? (value.commissionAmountCents ?? null)
          : null,
        commissionWindowDays: value.commissionEnabled ? (value.commissionWindowDays ?? null) : null,
        commissionAnnualAmountCents: value.commissionEnabled
          ? (value.commissionAnnualAmountCents ?? null)
          : null,
      }
      if (body.endsAt <= body.startsAt)
        throw new Error('O encerramento precisa vir depois do início.')
      const effectiveId = savedCampaign?.id ?? editing.id
      const duplicate = editing.duplicate && !savedCampaign
      const suffix = effectiveId ? `/${effectiveId}${duplicate ? '/duplicate' : ''}` : ''
      let result = await apiSend<{ campaign: CampaignView }>(
        `/api/admin/referrals/campaigns${suffix}`,
        effectiveId && !duplicate ? 'PATCH' : 'POST',
        effectiveId && !duplicate
          ? { ...body, expectedUpdatedAt: savedCampaign?.updatedAt ?? editing.expectedUpdatedAt }
          : body,
      )
      setSavedCampaign(result.campaign)
      if (couponDraft) {
        result = await apiSend<{ campaign: CampaignView }>(
          `/api/admin/referrals/campaigns/${result.campaign.id}/coupon`,
          'POST',
          {
            ...couponDraft,
            audience,
            expectedUpdatedAt: result.campaign.updatedAt,
          },
        )
      }
      toast.success('Campanha salva.')
      onSaved(result.campaign)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  const clearPartner = () => {
    setValue((current) => ({
      ...current,
      ambassadorId: null,
      commissionEnabled: false,
      commissionAmountCents: null,
      commissionAnnualAmountCents: null,
      commissionWindowDays: null,
    }))
    setPartnerName('')
    setCommissionAmount(String(DEFAULT_REFERRAL_BONUS.monthly / 100))
    setCommissionAnnualAmount(String(DEFAULT_REFERRAL_BONUS.annual / 100))
  }
  const periodText = windows
    ? `${campaignLocalDate(windows.startsAt).slice(0, 10).split('-').reverse().join('/')} a ${campaignLocalDate(
        new Date(Date.parse(windows.giftEndsAt) - 1).toISOString(),
      )
        .slice(0, 10)
        .split('-')
        .reverse()
        .join('/')}, até 23h59`
    : `${start.replace('T', ' ')} a ${end.replace('T', ' ')}`
  let n = 0
  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onClose()
      }}
      title={
        editing.duplicate
          ? 'Nova edição da campanha'
          : editing.id
            ? 'Editar campanha'
            : 'Nova campanha'
      }
      className="max-w-5xl"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <AudienceBadge audience={audience} />
        </div>
        <p id="campaign-audience-help" className="text-sm text-muted-foreground">
          {audience === 'kids'
            ? 'Comunidade dos Criadores · famílias com criança de 5 a 17 anos.'
            : 'Comunidade Sistema Zero · pessoas de 18 anos ou mais.'}{' '}
          Esta campanha pertence à comunidade selecionada no Admin. Para criar para outro público,
          troque a comunidade antes de abrir o formulário.
        </p>
        <fieldset
          disabled={saving}
          className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]"
        >
          <div className="min-w-0 space-y-4">
            <Step n={++n} title="O que a campanha faz">
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo">
                {(
                  [
                    [
                      'gift',
                      'Dar um presente',
                      'Quem se cadastra pelo link ganha uma oferta sem pagar. Pode ter um cupom de desconto à parte.',
                    ],
                    [
                      'sale',
                      'Vender uma oferta',
                      'O link leva à página de venda de uma oferta. Pode ter desconto nela durante a campanha.',
                    ],
                  ] as const
                ).map(([id, title, text]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={kind === id}
                    disabled={kindLocked && kind !== id}
                    onClick={() => change('kind', id)}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      kind === id ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <span className="block font-bold">{title}</span>
                    <span className="mt-1 block text-muted-foreground text-sm">{text}</span>
                  </button>
                ))}
              </div>
              {kindLocked ? (
                <p className="text-sm text-muted-foreground">{KIND_LOCKED_MESSAGE}</p>
              ) : null}
            </Step>

            <Step n={++n} title="Sobre a campanha">
              {(
                [
                  { key: 'name', label: 'Nome interno', max: 120, hint: 'Só a equipe vê.' },
                  {
                    key: 'publicTitle',
                    label: 'Título público',
                    max: 160,
                    hint: 'Aparece na página e no cartão de divulgação.',
                  },
                  {
                    key: 'code',
                    label: 'Código do link (4 a 32 letras minúsculas, números e hífens)',
                    max: 32,
                    hint: `Fica fixo depois de criado. O link será ${shareBase}/i/${value.code || 'codigo'}`,
                  },
                ] as const
              ).map((field) => (
                <div key={field.key} className="space-y-1">
                  {/* A dica fica fora do rótulo (aria-describedby): o nome do campo é só o rótulo. */}
                  <label className="block space-y-1 text-sm font-semibold">
                    <span>{field.label}</span>
                    <Input
                      value={value[field.key]}
                      onChange={(event) => change(field.key, event.target.value)}
                      required
                      maxLength={field.max}
                      minLength={field.key === 'code' ? 4 : 2}
                      pattern={field.key === 'code' ? '[a-z0-9-]{4,32}' : undefined}
                      disabled={field.key === 'code' && Boolean(editing.id) && !editing.duplicate}
                      aria-describedby={`campo-${field.key}-dica`}
                    />
                  </label>
                  <p id={`campo-${field.key}-dica`} className="text-muted-foreground text-xs">
                    {field.hint}
                  </p>
                </div>
              ))}
              <label className="flex items-start gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="campaign-redirect"
                  className="mt-1"
                  checked={redirectOn}
                  onChange={(event) => setRedirectOn(event.target.checked)}
                />
                <span>
                  Redirecionar um endereço antigo para esta campanha por um tempo
                  <span className="block font-normal text-muted-foreground text-xs">
                    Para quem recebeu um link antigo ainda conseguir resgatar ou comprar. Depois da
                    data, o endereço volta a abrir a página dele normalmente.
                  </span>
                </span>
              </label>
              {redirectOn ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm font-semibold">
                    <span>Endereço antigo</span>
                    <Input
                      name="campaign-redirect-path"
                      value={redirectPath}
                      placeholder={`${shareBase}/${audience === 'kids' ? 'kids' : 'pro'}/vilao-em-aliado`}
                      maxLength={200}
                      onChange={(event) => setRedirectPath(event.target.value)}
                      onBlur={() =>
                        redirectPath.trim() && setRedirectPath(normalizeRedirectPath(redirectPath))
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-sm font-semibold">
                    <span>Redirecionar até</span>
                    <Input
                      type="date"
                      name="campaign-redirect-until"
                      required
                      value={redirectUntil}
                      onChange={(event) => setRedirectUntil(event.target.value)}
                    />
                    <span className="block font-normal text-muted-foreground text-xs">
                      Padrão: 30 dias a partir de hoje.
                    </span>
                  </label>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-semibold">
                  <span>Tipo de ação</span>
                  <select
                    className="w-full rounded-md border bg-background p-2"
                    value={value.context}
                    onChange={(event) =>
                      change('context', event.target.value as CampaignInput['context'])
                    }
                  >
                    <option value="event">Palestra ou evento</option>
                    <option value="ad">Anúncio</option>
                    <option value="other">Outra ação</option>
                  </select>
                </label>
                <label className="block space-y-1 text-sm font-semibold">
                  <span>Canal de divulgação (opcional, interno)</span>
                  <Input
                    value={value.channel}
                    maxLength={100}
                    onChange={(event) => change('channel', event.target.value)}
                  />
                </label>
              </div>
              <label className="block space-y-1 text-sm font-semibold">
                <span>Apresentação pública (opcional)</span>
                <textarea
                  className="min-h-24 w-full rounded-md border bg-background p-3 font-normal"
                  value={value.description}
                  maxLength={600}
                  onChange={(event) => change('description', event.target.value)}
                />
              </label>
            </Step>

            {kind === 'gift' ? (
              <Step n={++n} title="O presente">
                <GiftOfferField
                  value={value.giftOfferId}
                  onChange={(next) => change('giftOfferId', next)}
                  offers={giftOffers}
                  legacy={giftOfferLegacy}
                  locked={giftOfferLocked}
                />
              </Step>
            ) : (
              <Step n={++n} title="A oferta à venda">
                <label className="block space-y-1 text-sm font-semibold">
                  <span>Oferta</span>
                  <select
                    name="campaign-sale-offer"
                    className="w-full rounded-md border bg-background p-2 font-normal"
                    required
                    disabled={lockedOutsideDraft && Boolean(editing.value.saleOfferId)}
                    value={value.saleOfferId ?? ''}
                    onChange={(event) => change('saleOfferId', event.target.value || null)}
                  >
                    <option value="" disabled>
                      {catalog.status === 'loading' ? 'Carregando ofertas…' : 'Escolha uma oferta'}
                    </option>
                    {value.saleOfferId && !saleOffer ? (
                      <option value={value.saleOfferId}>Oferta escolhida</option>
                    ) : null}
                    {saleChoices.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.name} · {offer.summary}
                      </option>
                    ))}
                  </select>
                  <span className="block font-normal text-muted-foreground text-xs">
                    Aparecem as ofertas deste público que têm página de venda (a principal do
                    produto ou marcada para venda na página). Uma oferta por campanha: para vender
                    várias coisas juntas, crie no Catálogo uma oferta que inclua todas.
                  </span>
                </label>
                {catalog.status === 'error' ? (
                  <p role="alert" className="text-sm text-destructive">
                    As ofertas do Catálogo não carregaram.{' '}
                    <Button type="button" variant="ghost" size="sm" onClick={catalog.reload}>
                      Tentar de novo
                    </Button>
                  </p>
                ) : null}
                {saleOffer ? (
                  <p className="text-sm" role="status">
                    {saleOffer.summary}.
                  </p>
                ) : null}
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold">Para onde o link leva</legend>
                  {(
                    [
                      ['page', 'Página de venda da oferta', 'Para quem ainda está conhecendo.'],
                      [
                        'checkout',
                        'Direto para o pagamento',
                        'Para quem já decidiu, como na saída de uma palestra. O pagamento abre com a oferta e o desconto aplicados.',
                      ],
                    ] as const
                  ).map(([target, title, text]) => (
                    <label key={target} className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="campaign-link-target"
                        className="mt-1"
                        checked={(value.linkTarget ?? 'page') === target}
                        onChange={() => change('linkTarget', target)}
                      />
                      <span>
                        <span className="font-semibold">{title}</span>
                        <span className="block text-muted-foreground text-xs">{text}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </Step>
            )}

            <Step n={++n} title="Desconto" optional>
              {value.coupon && !editing.duplicate ? (
                <div className="rounded-lg border p-3 text-sm">
                  <p>
                    Esta campanha já tem um cupom vinculado. O calendário abaixo controla a validade
                    dele. Marque abaixo para cadastrar outro código, se quiser trocar a oferta ou o
                    desconto.
                  </p>
                  <Button type="button" variant="ghost" onClick={() => change('coupon', null)}>
                    Desvincular cupom para novos usos
                  </Button>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {kind === 'gift'
                  ? 'O presente e o desconto são benefícios separados. O cupom vale para uma oferta desta comunidade e segue o calendário abaixo.'
                  : 'O cupom vale na oferta à venda durante a campanha e segue o calendário abaixo.'}
              </p>
              <CampaignCouponFields
                audience={audience}
                value={couponDraft}
                onChange={setCouponDraft}
              />
            </Step>

            <Step n={++n} title="Calendário">
              {!value.schedule ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    change('schedule', {
                      eventDate: start.slice(0, 10),
                      giftClaimDays: 3,
                      couponClaimDays: 7,
                    })
                  }
                >
                  Calcular prazos a partir da data da campanha
                </Button>
              ) : null}
              {value.schedule ? (
                <CampaignScheduleFields
                  value={value.schedule}
                  onChange={(next) => change('schedule', next)}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-semibold">
                    <span>Início (Brasília)</span>
                    <Input
                      type="datetime-local"
                      value={start}
                      required
                      onChange={(event) => setStart(event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-semibold">
                    <span>Encerramento (Brasília)</span>
                    <Input
                      type="datetime-local"
                      value={end}
                      required
                      onChange={(event) => setEnd(event.target.value)}
                    />
                  </label>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                O dia da campanha conta como o primeiro dia, no horário de Brasília. Mudar a data
                não muda o que já foi aceito: cada cadastro mantém o prazo da oferta.
              </p>
            </Step>

            <Step n={++n} title="Embaixador e bônus" optional>
              <p className="text-sm" role="status">
                {value.ambassadorId
                  ? `Vinculado: ${partnerName || value.ambassadorId}`
                  : 'Sem embaixador vinculado'}
              </p>
              <label className="block space-y-1 text-sm font-semibold">
                <span>Buscar embaixador por nome ou e-mail</span>
                <Input
                  value={partnerQuery}
                  onChange={(event) => setPartnerQuery(event.target.value)}
                  maxLength={120}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void searchPartners()
                    }
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={partnerLoading}
                  onClick={() => void searchPartners()}
                >
                  Buscar embaixador
                </Button>
                {value.ambassadorId ? (
                  <Button type="button" variant="ghost" onClick={clearPartner}>
                    Remover vínculo
                  </Button>
                ) : null}
              </div>
              {partnerError ? (
                <p role="alert" className="text-sm text-destructive">
                  {partnerError}
                </p>
              ) : null}
              {partners.length > 0 ? (
                <ul className="max-h-48 space-y-2 overflow-auto">
                  {partners.map((partner) => (
                    <li key={partner.id}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full justify-start whitespace-normal break-all text-left"
                        disabled={partner.status !== 'active'}
                        onClick={() => {
                          if (partner.id === value.ambassadorId) return
                          setValue((current) => ({
                            ...current,
                            ambassadorId: partner.id,
                            commissionEnabled: false,
                            commissionAmountCents: null,
                            commissionAnnualAmountCents: null,
                            commissionWindowDays: null,
                          }))
                          setPartnerName(partner.name)
                          setCommissionAmount(String(DEFAULT_REFERRAL_BONUS.monthly / 100))
                          setCommissionAnnualAmount(String(DEFAULT_REFERRAL_BONUS.annual / 100))
                        }}
                      >
                        {partner.name} · {partner.email}
                        {partner.status !== 'active' ? ' (desativado)' : ''}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {partnerSearched && !partnerLoading && !partnerError && partners.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum embaixador encontrado. Cadastre a pessoa na aba Embaixadores.
                </p>
              ) : null}
              {partnerTotal > 25 ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={partnerLoading || partnerOffset === 0}
                    onClick={() => void searchPartners(partnerOffset - 25)}
                  >
                    Anteriores
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={partnerLoading || partnerOffset + 25 >= partnerTotal}
                    onClick={() => void searchPartners(partnerOffset + 25)}
                  >
                    Próximos
                  </Button>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Com embaixador, tudo o que entrar por esta campanha também conta para ele, mesmo sem
                bônus. Se ele for desativado, novos cadastros ficam sem bônus; os acordos anteriores
                continuam valendo.
              </p>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="campaign-commission"
                  checked={value.commissionEnabled ?? false}
                  disabled={!value.ambassadorId}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    setValue((current) => ({
                      ...current,
                      commissionEnabled: enabled,
                      commissionAmountCents:
                        current.commissionAmountCents ?? DEFAULT_REFERRAL_BONUS.monthly,
                      commissionAnnualAmountCents:
                        current.commissionAnnualAmountCents ??
                        Math.round(Number(commissionAnnualAmount) * 100),
                      commissionWindowDays:
                        current.commissionWindowDays ?? DEFAULT_COMMISSION_WINDOW_DAYS,
                    }))
                  }}
                />
                Pagar bônus quando alguém desta campanha assinar a Comunidade
              </label>
              {value.commissionEnabled ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-1 text-sm font-semibold">
                    <span>Bônus no plano mensal (R$)</span>
                    <Input
                      type="number"
                      name="campaign-commission-monthly"
                      required
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      value={commissionAmount}
                      onChange={(event) => {
                        setCommissionAmount(event.target.value)
                        const amount = event.target.value
                        setValue((current) => ({
                          ...current,
                          commissionAmountCents:
                            amount === '' ? null : Math.round(Number(amount) * 100),
                          // Ao separar um acordo legado, preserve o anual que o editor mostra.
                          commissionAnnualAmountCents:
                            current.commissionAnnualAmountCents ??
                            Math.round(Number(commissionAnnualAmount) * 100),
                        }))
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-semibold">
                    <span>Bônus no plano anual (R$)</span>
                    <Input
                      type="number"
                      name="campaign-commission-annual"
                      required
                      min="0.01"
                      max="1000000"
                      step="0.01"
                      value={commissionAnnualAmount}
                      onChange={(event) => {
                        setCommissionAnnualAmount(event.target.value)
                        change(
                          'commissionAnnualAmountCents',
                          event.target.value === ''
                            ? null
                            : Math.round(Number(event.target.value) * 100),
                        )
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-sm font-semibold">
                    <span>Prazo do bônus (dias)</span>
                    <Input
                      type="number"
                      name="campaign-commission-window"
                      required
                      min="1"
                      max="3650"
                      step="1"
                      value={value.commissionWindowDays ?? ''}
                      onChange={(event) =>
                        change(
                          'commissionWindowDays',
                          event.target.value === '' ? null : Number(event.target.value),
                        )
                      }
                    />
                    <span className="block font-normal text-muted-foreground text-xs">
                      Padrão: {DEFAULT_COMMISSION_WINDOW_DAYS} dias.
                    </span>
                  </label>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {value.commissionEnabled
                  ? `Bônus único pela primeira assinatura, paga em até ${value.commissionWindowDays ?? DEFAULT_COMMISSION_WINDOW_DAYS} dias depois de a pessoa entrar pela campanha, sem bônus nas renovações. Se ela tiver vindo antes por outro embaixador dentro do prazo, o bônus é de quem veio primeiro. Mudanças valem só para novos cadastros.`
                  : 'Sem bônus. O vínculo acompanha os resultados sem gerar valor a pagar.'}
              </p>
            </Step>

            <Step n={++n} title="Situação">
              <label className="block space-y-1 text-sm font-semibold">
                <span>Situação</span>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  value={value.status}
                  onChange={(event) =>
                    change('status', event.target.value as CampaignInput['status'])
                  }
                >
                  <option value="draft">{STATE_LABELS.draft}</option>
                  <option value="active">{STATE_LABELS.active}</option>
                  <option value="paused">{STATE_LABELS.paused}</option>
                  <option value="ended">{STATE_LABELS.ended}</option>
                </select>
                <span className="block font-normal text-muted-foreground text-xs">
                  Em rascunho, o link mostra só a prévia. Ativa respeita o calendário.
                </span>
              </label>
            </Step>
          </div>

          <aside
            aria-label="Resumo da campanha"
            className="space-y-3 lg:sticky lg:top-0 lg:self-start"
          >
            <div className="space-y-3 rounded-2xl border bg-muted/40 p-4 text-sm">
              <h3 className="font-display text-base font-bold">Resumo</h3>
              <div>
                <p className="text-muted-foreground text-xs">Quem recebe o link</p>
                <p>
                  {kind === 'gift'
                    ? giftOption
                      ? `Ganha ${giftOfferIncludes(giftOption)} · ${giftOption.duration}`
                      : 'Ganha o presente escolhido'
                    : saleOffer
                      ? `${value.linkTarget === 'checkout' ? 'Vai direto ao pagamento de' : 'Vê a página de'} ${saleOffer.name}`
                      : 'Vê a oferta escolhida'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Link</p>
                <p className="break-all">
                  {shareBase}/i/{value.code || 'codigo'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Período</p>
                <p>{periodText}</p>
              </div>
              {redirectOn && redirectPath.trim() ? (
                <div>
                  <p className="text-muted-foreground text-xs">Endereço antigo</p>
                  <p className="break-all">
                    {normalizeRedirectPath(redirectPath)} leva para cá até{' '}
                    {redirectUntil.split('-').reverse().join('/')}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-muted-foreground text-xs">Desconto</p>
                <p>
                  {couponDraft
                    ? `${couponDraft.percentOff}% com o cupom ${couponDraft.code.toUpperCase() || 'novo'}`
                    : value.coupon
                      ? 'Cupom já vinculado'
                      : 'Sem desconto'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Embaixador</p>
                <p>
                  {value.ambassadorId
                    ? `${partnerName || 'Vinculado'}${value.commissionEnabled ? ` · ${moneyLabel(value.commissionAmountCents ?? 0)} no mensal ou ${moneyLabel(value.commissionAnnualAmountCents ?? value.commissionAmountCents ?? 0)} no anual, em até ${value.commissionWindowDays ?? DEFAULT_COMMISSION_WINDOW_DAYS} dias` : ' · sem bônus'}`
                    : 'Nenhum'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Depois de salvar</p>
                <p>Link, QR Code e cartão de divulgação ficam no detalhe da campanha.</p>
              </div>
            </div>
          </aside>
        </fieldset>
        {savedCampaign && error ? (
          <p role="status" className="rounded-lg bg-warning-tint p-3 text-sm">
            A campanha foi salva, mas o cupom ainda precisa ser concluído. Corrija o problema e
            salve novamente; o mesmo cadastro será retomado.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar campanha'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
