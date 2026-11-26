'use client'

import type {
  CampaignDetailView,
  CampaignKind,
  CampaignState,
  CampaignView,
  OriginReport,
} from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import { Select } from '@sistemazero/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { useOfferNames } from '@/components/admin/origin-parts'
import { OverviewCard } from '@/components/admin/overview-card'
import { campaignLocalDate } from '@/lib/campaign-dates'
import { cn } from '@/lib/cn'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import { loadAllPages } from '@/lib/load-all-pages'
import type { Platform } from '@/lib/platform'
import {
  isOriginReport,
  moneyFromCents,
  moneyRounded,
  ORIGIN_PERIOD_LABELS,
  type OriginPeriod,
  originPeriodQuery,
  percent,
} from '@/lib/referral-origin'
import { type CatalogOffersState, useCatalogOffers } from './ambassador-offer-catalog'
import { AmbassadorOffersPanel } from './ambassador-offers-panel'
import { CampaignDetailDialog } from './campaign-detail'
import { CampaignEditor } from './campaign-editor'
import { type GiftOffersState, useGiftOffers } from './campaign-gift-offer'
import {
  AUDIENCE_LOCKED_MESSAGE,
  dateLabel,
  type Editing,
  emptyCampaign,
  errorMessage,
  GiftOfferSummary,
  KindBadge,
  kindOf,
  previewUrl,
  STATE_LABELS,
} from './campaign-shared'
import { EmbaixadoresClient } from './embaixadores-client'

export { AUDIENCE_LOCKED_MESSAGE, previewUrl }

const PAGE_SIZE = 25
const WRITE_ROLES = ['admin', 'superadmin']

/** As três abas da área (Canvas "admin-campanhas"); as setas andam pela posição. */
export const CAMPAIGN_TABS = [
  { value: 'campaigns', label: 'Campanhas' },
  { value: 'people', label: 'Embaixadores' },
  { value: 'offers', label: 'Ofertas dos embaixadores' },
] as const
export type CampaignTab = (typeof CAMPAIGN_TABS)[number]['value']

/** A aba para onde a tecla leva (setas giram; Home e End vão às pontas). */
export function tabAfterKey(current: CampaignTab, key: string): CampaignTab | null {
  const index = CAMPAIGN_TABS.findIndex((t) => t.value === current)
  const last = CAMPAIGN_TABS.length - 1
  const next =
    key === 'ArrowRight'
      ? (index + 1) % CAMPAIGN_TABS.length
      : key === 'ArrowLeft'
        ? (index - 1 + CAMPAIGN_TABS.length) % CAMPAIGN_TABS.length
        : key === 'Home'
          ? 0
          : key === 'End'
            ? last
            : null
  return next === null ? null : (CAMPAIGN_TABS[next]?.value ?? null)
}

export const ConvitesClient = communityPage<{ currentRole: string }>(ConvitesForCommunity)

function ConvitesForCommunity({
  currentRole,
  audience,
}: {
  currentRole: string
  audience: Platform
}) {
  const [tab, setTab] = useState<CampaignTab>('campaigns')
  const id = useId()
  const canWrite = WRITE_ROLES.includes(currentRole)
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Campanhas"
        description="Links de presente e de venda para anúncios, eventos e parcerias, os embaixadores e o que cada um trouxe para a plataforma."
      />
      <div
        role="tablist"
        aria-label="Seções de Campanhas"
        className="flex flex-wrap items-center gap-1 border-b border-border"
      >
        {CAMPAIGN_TABS.map((t) => {
          const active = tab === t.value
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              id={`${id}-tab-${t.value}`}
              aria-selected={active}
              aria-controls={`${id}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.value)}
              onKeyDown={(event) => {
                const next = tabAfterKey(tab, event.key)
                if (!next) return
                event.preventDefault()
                setTab(next)
                document.getElementById(`${id}-tab-${next}`)?.focus()
              }}
              className={cn(
                '-mb-px border-b-[3px] px-3.5 py-2.5 text-[15px] font-bold transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
        {tab === 'campaigns' ? (
          <Campaigns audience={audience} canWrite={canWrite} />
        ) : tab === 'people' ? (
          <EmbaixadoresClient currentRole={currentRole} />
        ) : (
          <AmbassadorOffersPanel audience={audience} canWrite={canWrite} />
        )}
      </div>
    </div>
  )
}

type KindFilter = 'all' | CampaignKind
type StateFilter = 'all' | CampaignState

/** O recorte da lista por tipo, situação e busca (na lista inteira, antes de paginar). */
export function filterCampaigns(
  items: CampaignView[],
  { kind, state }: { kind: KindFilter; state: StateFilter },
): CampaignView[] {
  return items.filter(
    (item) =>
      (kind === 'all' || kindOf(item) === kind) && (state === 'all' || item.state === state),
  )
}

/** O que a campanha entrega, na coluna "O que entrega". */
function Delivers({
  campaign,
  giftOffers,
  catalog,
}: {
  campaign: CampaignView
  giftOffers: GiftOffersState
  catalog: CatalogOffersState
}) {
  if (kindOf(campaign) === 'gift')
    return <GiftOfferSummary campaign={campaign} offers={giftOffers} />
  const offer = campaign.saleOfferId ? catalog.byId.get(campaign.saleOfferId) : undefined
  return (
    <>
      <div>{offer?.name ?? 'Oferta do Catálogo'}</div>
      <div className="text-xs text-muted-foreground">
        {campaign.linkTarget === 'checkout' ? 'Direto para o pagamento' : 'Página de venda'}
        {offer ? ` · ${offer.summary}` : ''}
      </div>
    </>
  )
}

function Campaigns({ canWrite, audience }: { canWrite: boolean; audience: Platform }) {
  const { get: apiGet } = useCommunityRequests(audience)
  const [items, setItems] = useState<CampaignView[]>([])
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [state, setState] = useState<StateFilter>('all')
  const [period, setPeriod] = useState<OriginPeriod>('30d')
  const [report, setReport] = useState<OriginReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [detail, setDetail] = useState<CampaignDetailView | null>(null)
  const loadSequence = useRef(0)
  const detailSequence = useRef(0)
  const giftOffers = useGiftOffers(audience)
  const catalog = useCatalogOffers(audience)
  const offerNames = useOfferNames(audience)
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true)
    setError('')
    try {
      // A lista inteira: o tipo e a situação filtram aqui (o referrals só busca por texto).
      const all = await loadAllPages((pageOffset, limit) =>
        apiGet<{ items: CampaignView[]; total: number }>(
          `/api/admin/referrals/campaigns?${new URLSearchParams({ q: search, limit: String(limit), offset: String(pageOffset) })}`,
        ),
      )
      if (sequence !== loadSequence.current) return
      setItems(all)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      if (sequence === loadSequence.current) {
        setItems([])
        setError(errorMessage(err))
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [apiGet, search])
  useEffect(() => {
    void load()
    return () => {
      loadSequence.current++
      detailSequence.current++
    }
  }, [load])
  // O resultado do período vem da Origem das vendas (admin+): a equipe sem acesso não vê os
  // números do período, só a lista.
  useEffect(() => {
    if (!canWrite) return
    let alive = true
    apiGet<OriginReport>(`/api/admin/referrals/origins?${originPeriodQuery(period)}`)
      .then((next) => {
        if (alive) setReport(isOriginReport(next) ? next : null)
      })
      .catch(() => {
        if (alive) setReport(null)
      })
    return () => {
      alive = false
    }
  }, [apiGet, canWrite, period])
  async function open(id: string) {
    const sequence = ++detailSequence.current
    try {
      const result = await apiGet<CampaignDetailView>(`/api/admin/referrals/campaigns/${id}`)
      if (sequence === detailSequence.current) setDetail(result)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      if (sequence === detailSequence.current) toast.error(errorMessage(err))
    }
  }
  const filtered = useMemo(() => filterCampaigns(items, { kind, state }), [items, kind, state])
  const page = filtered.slice(offset, offset + PAGE_SIZE)
  const showRevenue = items.some((item) => item.results?.revenueCents != null)
  const campaignRow = report?.byOrigin.find((row) => row.origin === 'campaign')
  const active = items.filter((item) => item.state === 'active').length
  const scheduled = items.filter((item) => item.state === 'scheduled').length
  const ended = items.filter((item) => item.state === 'ended').length
  const columns = showRevenue ? 10 : 9
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Resultado das campanhas</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">
            Cada campanha tem o seu link, o seu público e o seu prazo para novos cadastros. Quem
            entra pelo link ganha o presente ou vê a oferta à venda escolhida na campanha.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {canWrite ? (
            <label className="space-y-1 text-sm font-semibold">
              <span className="block">Período</span>
              <Select
                value={period}
                onChange={(event) => setPeriod(event.target.value as OriginPeriod)}
                className="w-auto"
              >
                {(['30d', '7d', '90d', 'year'] as const).map((p) => (
                  <option key={p} value={p}>
                    {ORIGIN_PERIOD_LABELS[p]}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {canWrite ? (
            <Button onClick={() => setEditing({ value: emptyCampaign(audience) })}>
              Nova campanha
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <OverviewCard
          title="Campanhas ativas"
          value={loading ? '…' : active}
          description={`${scheduled} ${scheduled === 1 ? 'agendada' : 'agendadas'} · ${ended} ${ended === 1 ? 'encerrada' : 'encerradas'}`}
        />
        {campaignRow ? (
          <>
            <OverviewCard
              title="Cadastros"
              value={campaignRow.newPeople}
              description="presentes resgatados e compras pelo link"
            />
            <OverviewCard
              title="Compras"
              value={campaignRow.purchases}
              description="cursos e ofertas, fora a assinatura"
            />
            <OverviewCard
              title="Assinaturas"
              value={campaignRow.subscriptions}
              description={`${percent(campaignRow.subscriptions, campaignRow.newPeople)} dos cadastros`}
            />
            <OverviewCard
              title="Faturamento"
              value={moneyRounded(campaignRow.revenueCents)}
              description="valor pago, sem estornos"
            />
          </>
        ) : null}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setOffset(0)
          setSearch(query.trim())
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome, título ou código"
          aria-label="Buscar campanhas"
          maxLength={120}
          className="w-full max-w-sm"
        />
        <Select
          aria-label="Tipo"
          value={kind}
          className="w-auto"
          onChange={(event) => {
            setKind(event.target.value as KindFilter)
            setOffset(0)
          }}
        >
          <option value="all">Presente e venda</option>
          <option value="gift">Só presente</option>
          <option value="sale">Só venda</option>
        </Select>
        <Select
          aria-label="Situação"
          value={state}
          className="w-auto"
          onChange={(event) => {
            setState(event.target.value as StateFilter)
            setOffset(0)
          }}
        >
          <option value="all">Todas as situações</option>
          {(['active', 'scheduled', 'paused', 'ended', 'draft'] as const).map((s) => (
            <option key={s} value={s}>
              {STATE_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button variant="outline" type="submit">
          Buscar
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void load()}>
            Tentar de novo
          </button>
        </p>
      ) : null}
      <Card className="overflow-hidden rounded-2xl p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campanha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>O que entrega</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Cadastros até</TableHead>
              <TableHead className="text-right">Cadastros</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Assinaturas</TableHead>
              {showRevenue ? <TableHead className="text-right">Faturamento</TableHead> : null}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns} className="py-6 text-muted-foreground" role="status">
                  Carregando campanhas…
                </TableCell>
              </TableRow>
            ) : (
              page.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.code}</div>
                    {item.ambassadorName ? (
                      <div className="text-xs text-muted-foreground">
                        Embaixador: {item.ambassadorName}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <KindBadge kind={kindOf(item)} />
                  </TableCell>
                  <TableCell>
                    <Delivers campaign={item} giftOffers={giftOffers} catalog={catalog} />
                  </TableCell>
                  <TableCell>{STATE_LABELS[item.state]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateLabel(new Date(Date.parse(item.endsAt) - 1).toISOString())}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.results?.people ?? item.stats.redemptions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.results?.purchases ?? ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.results?.subscriptions ?? item.stats.conversions}
                  </TableCell>
                  {showRevenue ? (
                    <TableCell className="text-right tabular-nums">
                      {item.results?.revenueCents != null
                        ? moneyFromCents(item.results.revenueCents)
                        : ''}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void open(item.id)}
                        aria-label={`Detalhes da campanha ${item.name}`}
                      >
                        Detalhes
                      </Button>
                      {canWrite ? (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Editar a campanha ${item.name}`}
                          onClick={() =>
                            setEditing({
                              value: item,
                              id: item.id,
                              expectedUpdatedAt: item.updatedAt,
                            })
                          }
                        >
                          Editar
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && !error && page.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center text-muted-foreground">
                  Ainda não há campanhas com essa busca. Crie uma para divulgar um presente ou uma
                  oferta com um link próprio.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
      <Pagination total={filtered.length} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
      <p className="text-xs text-muted-foreground">
        Cadastros são as pessoas que ganharam o presente ou compraram pelo link da campanha. Compras
        são os cursos e ofertas que elas pagaram, fora a assinatura. Assinaturas são as primeiras
        assinaturas da Comunidade dessas pessoas. Faturamento é o valor pago de fato, com o desconto
        do cupom e sem estornos. Nas campanhas Kids, os números contam contas de responsáveis, não
        crianças.
      </p>
      {editing ? (
        <CampaignEditor
          audience={audience}
          giftOffers={giftOffers}
          catalog={catalog}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(value) => {
            setEditing(null)
            void load()
            void open(value.id)
          }}
        />
      ) : null}
      {detail ? (
        <CampaignDetailDialog
          detail={detail}
          audience={audience}
          canWrite={canWrite}
          giftOffers={giftOffers}
          catalog={catalog}
          offerNames={offerNames}
          onClose={() => {
            detailSequence.current++
            setDetail(null)
          }}
          onEdit={() => {
            setEditing({
              id: detail.campaign.id,
              value: detail.campaign,
              expectedUpdatedAt: detail.campaign.updatedAt,
            })
            setDetail(null)
          }}
          onDuplicate={() => {
            setEditing({
              id: detail.campaign.id,
              duplicate: true,
              // O público viaja com a edição nova: duplicar é o jeito de trocar de público.
              value: {
                ...detail.campaign,
                name: `${detail.campaign.name} · nova edição`.slice(0, 120),
                code: '',
                status: 'draft',
                schedule: detail.campaign.schedule
                  ? {
                      ...detail.campaign.schedule,
                      eventDate: campaignLocalDate(new Date().toISOString()).slice(0, 10),
                    }
                  : null,
                coupon: null,
                // O endereço antigo é de uma campanha só: a nova edição nasce sem ele.
                redirectPath: null,
                redirectUntil: null,
                commissionEnabled: false,
                commissionAmountCents: null,
                commissionAnnualAmountCents: null,
                commissionWindowDays: null,
                startsAt: emptyCampaign(audience).startsAt,
                endsAt: emptyCampaign(audience).endsAt,
              },
            })
            setDetail(null)
          }}
        />
      ) : null}
    </div>
  )
}
