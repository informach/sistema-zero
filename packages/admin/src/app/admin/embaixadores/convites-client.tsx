'use client'

import {
  type CampaignDetailView,
  type CampaignInput,
  type CampaignState,
  type CampaignView,
  campaignCouponPromotion,
  campaignScheduleWindows,
  DEFAULT_REFERRAL_BONUS,
  type GiftAudience,
  isGiftAudience,
} from '@sistemazero/core/referrals'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import { ShareCard } from '@sistemazero/ui/share-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/app/admin/notas-fiscais/copy-to-clipboard'
import { AdminHeader } from '@/components/admin/admin-header'
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { campaignIsoDate, campaignLocalDate } from '@/lib/campaign-dates'
import { cn } from '@/lib/cn'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import { type CampaignCouponDraft, CampaignCouponDraftSchema } from '@/lib/prepare-campaign-coupon'
import { CampaignCouponFields } from './campaign-coupon-fields'
import { CampaignScheduleFields } from './campaign-schedule-fields'
import { EmbaixadoresClient } from './embaixadores-client'

const PAGE_SIZE = 25
/**
 * A situação da campanha com o mesmo nome no formulário e na lista: "Ativa" (o formulário dizia
 * "Ativa (respeita as datas)" e a lista dizia "Aberta").
 */
const labels: Record<CampaignState, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  active: 'Ativa',
  paused: 'Pausada',
  ended: 'Encerrada',
}
/**
 * Público do presente (20/10/2026). O texto de cada cartão é o do Canvas "Presente Kids e adulto":
 * define a página, o curso, o Mural e os e-mails de quem se cadastra pelo link.
 */
export const AUDIENCE_LOCKED_MESSAGE =
  'O público só muda enquanto a campanha está em rascunho. Para trocar, duplique a campanha como nova edição.'
/**
 * Curso do presente adulto (padrão do referrals, `SCHOLARSHIP_ADULT_COURSE_SLUG`). Enquanto ele não
 * estiver publicado na plataforma adulta, o referrals responde `giftAvailable: false` e o link
 * adulto não entrega o presente. O editor confere pela lista de cursos que o painel já tem.
 */
export const ADULT_GIFT_COURSE_SLUG = 'cade-todo-mundo-adulto'
export const ADULT_COURSE_UNPUBLISHED_MESSAGE =
  'O curso Cadê Todo Mundo na versão adulta (cade-todo-mundo-adulto) ainda não está publicado. Até ele ser publicado em Cursos, o link desta campanha mostra o presente como indisponível.'
type CourseCheck = 'published' | 'unpublished' | 'unknown'
/**
 * Lê `/api/members/courses` (a mesma lista de Cursos do painel) e procura o slug exato. Qualquer
 * falha (sem permissão, members fora, resposta torta) é `unknown` e não mostra aviso: o aviso só
 * aparece quando a lista DIZ que o curso não está publicado. `fetch` direto e não `apiGet`, para
 * um 401 desta consulta lateral não tirar a pessoa do editor.
 */
function useAdultGiftCourse(enabled: boolean): CourseCheck {
  const [check, setCheck] = useState<CourseCheck>('unknown')
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const params = new URLSearchParams({
      q: ADULT_GIFT_COURSE_SLUG,
      audience: 'adult',
      limit: '20',
    })
    fetch(`/api/members/courses?${params}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return 'unknown' as const
        const body = (await res.json().catch(() => null)) as {
          items?: { slug?: unknown; status?: unknown }[]
        } | null
        if (!Array.isArray(body?.items)) return 'unknown' as const
        const course = body.items.find((item) => item.slug === ADULT_GIFT_COURSE_SLUG)
        return course?.status === 'published' ? ('published' as const) : ('unpublished' as const)
      })
      .then((next) => {
        if (!controller.signal.aborted) setCheck(next)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [enabled])
  return enabled ? check : 'unknown'
}
/** Campanha anterior a 20/10/2026 (ou serviço antigo) chega sem `audience`: é Kids. */
const audienceOf = (value: { audience?: unknown }): GiftAudience =>
  isGiftAudience(value.audience) ? value.audience : 'kids'
function AudienceBadge({ audience }: { audience: GiftAudience }) {
  return (
    <Badge variant={audience === 'adult' ? 'outline' : 'default'}>
      {audience === 'adult' ? 'Adulto' : 'Kids'}
    </Badge>
  )
}
const dateLabel = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
const cardDateLabel = (value: string) =>
  new Date(value)
    .toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    })
    .replace(',', '')
const moneyLabel = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const conversionLabels: Record<string, string> = {
  pending: 'Aguardando garantia',
  eligible: 'Comissão disponível',
  paid: 'Comissão paga',
  canceled: 'Pagamento estornado',
  self_blocked: 'Autoindicação sem comissão',
  unrewarded: 'Sem comissão',
  superseded: 'Compra substituída por uma anterior elegível',
}
const message = (err: unknown) =>
  err && typeof err === 'object' && 'code' in err && err.code === 'CAMPAIGN_AUDIENCE_LOCKED'
    ? AUDIENCE_LOCKED_MESSAGE
    : err && typeof err === 'object' && 'message' in err
      ? String(err.message)
      : 'Não deu certo. Tente de novo.'
type Editing = {
  value: CampaignInput
  id?: string
  duplicate?: boolean
  expectedUpdatedAt?: string
}
const empty = (audience: Platform): CampaignInput => ({
  schedule: {
    eventDate: campaignLocalDate(new Date().toISOString()).slice(0, 10),
    giftClaimDays: 3,
    couponClaimDays: 7,
  },
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

const TABS = [
  { value: 'campaigns', label: 'Campanhas de presente' },
  { value: 'people', label: 'Embaixadores' },
] as const

export const ConvitesClient = communityPage<{ currentRole: string }>(ConvitesForCommunity)

function ConvitesForCommunity({
  currentRole,
  audience,
}: {
  currentRole: string
  audience: Platform
}) {
  const [tab, setTab] = useState<'campaigns' | 'people'>('campaigns')
  const id = useId()
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Campanhas"
        description="Os links de presente para anúncios e eventos, e quem indica o curso pelo programa de embaixadores."
      />
      {/* Abas com o mesmo desenho das abas de área (SectionTabs), mas trocando o painel aqui
          mesmo: as duas listas moram na mesma rota. */}
      <div
        role="tablist"
        aria-label="Campanhas e embaixadores"
        className="flex flex-wrap items-center gap-1 border-b border-border"
      >
        {TABS.map((t) => {
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
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                event.preventDefault()
                const next = tab === 'campaigns' ? 'people' : 'campaigns'
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
          <Campaigns audience={audience} canWrite={['admin', 'superadmin'].includes(currentRole)} />
        ) : (
          <EmbaixadoresClient currentRole={currentRole} />
        )}
      </div>
    </div>
  )
}

function Campaigns({ canWrite, audience }: { canWrite: boolean; audience: Platform }) {
  const { get: apiGet } = useCommunityRequests(audience)
  const [items, setItems] = useState<CampaignView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [detail, setDetail] = useState<CampaignDetailView | null>(null)
  const loadSequence = useRef(0)
  const detailSequence = useRef(0)
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true)
    setError('')
    try {
      const result = await apiGet<{ items: CampaignView[]; total: number }>(
        `/api/admin/referrals/campaigns?${new URLSearchParams({ q: search, limit: String(PAGE_SIZE), offset: String(offset) })}`,
      )
      if (sequence !== loadSequence.current) return
      setItems(result.items)
      setTotal(result.total)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      if (sequence === loadSequence.current) {
        setItems([])
        setTotal(0)
        setError(message(err))
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [apiGet, search, offset])
  useEffect(() => {
    void load()
    return () => {
      loadSequence.current++
      detailSequence.current++
    }
  }, [load])
  async function open(id: string) {
    const sequence = ++detailSequence.current
    try {
      const result = await apiGet<CampaignDetailView>(`/api/admin/referrals/campaigns/${id}`)
      if (sequence === detailSequence.current) setDetail(result)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      if (sequence === detailSequence.current) toast.error(message(err))
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Campanhas de presente</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">
            Anúncios, palestras e outras ações do Sistema Zero. Cada campanha tem seu link, seu
            público e seu prazo para novos cadastros. Quem se cadastra recebe 7 dias de curso e de
            Mural, contados do cadastro.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setEditing({ value: empty(audience) })}>Nova campanha</Button>
        )}
      </div>
      <form
        className="flex gap-2"
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
        />
        <Button variant="outline" type="submit">
          Buscar
        </Button>
        <Button variant="outline" type="button" disabled={loading} onClick={() => void load()}>
          Atualizar
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void load()}>
            Tentar de novo
          </button>
        </p>
      )}
      <Card className="overflow-hidden rounded-2xl p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campanha</TableHead>
              <TableHead>Público</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Inscrições até (Brasília)</TableHead>
              <TableHead className="text-right">Resgates</TableHead>
              <TableHead className="text-right">Conversões</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-muted-foreground" role="status">
                  Carregando campanhas…
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.code}</div>
                  </TableCell>
                  <TableCell>
                    <AudienceBadge audience={audienceOf(item)} />
                  </TableCell>
                  <TableCell>{labels[item.state]}</TableCell>
                  <TableCell className="text-muted-foreground">{dateLabel(item.endsAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.stats.redemptions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.stats.conversions}
                  </TableCell>
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
                      {canWrite && (
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
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && !error && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Ainda não há campanhas com essa busca. Crie uma para divulgar o presente com um
                  link próprio.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
      <p className="text-xs text-muted-foreground">
        Resgates são cadastros com os acessos concedidos. Conversões são as primeiras compras
        elegíveis da Comunidade após o presente, excluindo estornos. Comissão só é gerada quando
        habilitada na campanha, conforme as condições do cadastro. Nas campanhas Kids, esses números
        contam contas de responsáveis, não crianças.
      </p>
      {editing && (
        <CampaignEditor
          audience={audience}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(value) => {
            setEditing(null)
            void load()
            void open(value.id)
          }}
        />
      )}
      {detail && (
        <Dialog
          open
          onClose={() => {
            detailSequence.current++
            setDetail(null)
          }}
          title={detail.campaign.name}
          className="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-muted px-3 py-2 text-sm">
                {labels[detail.campaign.state]}
              </span>
              <AudienceBadge audience={audienceOf(detail.campaign)} />
              {canWrite && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing({
                        id: detail.campaign.id,
                        value: detail.campaign,
                        expectedUpdatedAt: detail.campaign.updatedAt,
                      })
                      setDetail(null)
                    }}
                  >
                    Editar campanha
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing({
                        id: detail.campaign.id,
                        duplicate: true,
                        // O público viaja com a edição nova (`...detail.campaign`): duplicar é o
                        // jeito de trocar de público, e o editor deixa mudar no rascunho.
                        value: {
                          ...detail.campaign,
                          audience: audienceOf(detail.campaign),
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
                          commissionEnabled: false,
                          commissionAmountCents: null,
                          commissionAnnualAmountCents: null,
                          commissionWindowDays: null,
                          startsAt: empty(audience).startsAt,
                          endsAt: empty(audience).endsAt,
                        },
                      })
                      setDetail(null)
                    }}
                  >
                    Duplicar como nova edição
                  </Button>
                </>
              )}
            </div>
            <p className="text-sm">
              Início: {dateLabel(detail.campaign.startsAt)} · Encerramento:{' '}
              {dateLabel(detail.campaign.endsAt)} (Brasília). Pausar ou encerrar impede novos
              cadastros; os acessos já aceitos mantêm seu vencimento.
            </p>
            <p className="text-sm">
              Embaixador: {detail.campaign.ambassadorName ?? 'Sem vínculo'}.{' '}
              {detail.campaign.commissionEnabled
                ? `Bônus único: ${moneyLabel(detail.campaign.commissionAmountCents ?? 0)} no mensal e ${moneyLabel(detail.campaign.commissionAnnualAmountCents ?? detail.campaign.commissionAmountCents ?? 0)} no anual. Primeira assinatura paga em até ${detail.campaign.commissionWindowDays} dias após o cadastro.`
                : 'Comissão desativada.'}{' '}
              Edições valem para novos cadastros; os anteriores mantêm as condições aceitas.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-semibold" htmlFor="campaign-link">
                Link público para divulgar
              </label>
              <Input
                id="campaign-link"
                readOnly
                value={detail.campaign.shareUrl}
                onFocus={(event) => event.target.select()}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyToClipboard(detail.campaign.shareUrl, 'Link público')}
                >
                  Copiar link
                </Button>
                <a
                  className="text-sm underline"
                  href={previewUrl(detail.campaign)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Prévia sem cadastro
                </a>
                <a
                  className="text-sm underline"
                  href={detail.campaign.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir link público
                </a>
                <a
                  className="text-sm underline"
                  href={`/api/admin/referrals/campaigns/${detail.campaign.id}/qr`}
                >
                  Baixar QR Code
                </a>
                <ShareCard
                  url={detail.campaign.shareUrl}
                  title={detail.campaign.publicTitle}
                  subtitle={
                    detail.campaign.audience === 'adult'
                      ? 'Um presente para adultos'
                      : 'Um presente para famílias · Kids'
                  }
                  description="7 dias gratuitos no curso Cadê Todo Mundo e no Mural de criações."
                  notice={`${['draft', 'paused', 'ended'].includes(detail.campaign.state) ? `${labels[detail.campaign.state]}: sem novos resgates. ` : ''}Resgate de ${cardDateLabel(detail.campaign.startsAt)} até ${cardDateLabel(new Date(Date.parse(detail.campaign.endsAt) - 1).toISOString())} (Brasília). ${detail.campaign.audience === 'adult' ? 'Cadastro para pessoas de 18 anos ou mais.' : 'Para crianças de 5 a 17 anos; abaixo de 9, com acompanhante. Cadastro pelo responsável.'}`}
                />
              </div>
              {detail.campaign.state === 'draft' && (
                <p className="text-sm text-muted-foreground">
                  Rascunho: o link público ainda não aceita cadastros. Use a prévia para conferir a
                  página.
                </p>
              )}
            </div>
            {detail.campaign.couponView && (
              <section
                className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4"
                aria-label="Cupom da campanha"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Benefício separado · desconto
                </p>
                <h2 className="text-xl font-bold">
                  {
                    campaignCouponPromotion(detail.campaign.couponView, detail.campaign.audience)
                      .title
                  }
                </h2>
                <p className="text-sm">
                  {
                    campaignCouponPromotion(detail.campaign.couponView, detail.campaign.audience)
                      .description
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {
                    campaignCouponPromotion(detail.campaign.couponView, detail.campaign.audience)
                      .notice
                  }
                </p>
                <Badge variant="outline">
                  {detail.campaign.couponView.state === 'unavailable'
                    ? 'Indisponível'
                    : labels[detail.campaign.couponView.state]}
                </Badge>
                <Input
                  readOnly
                  aria-label="Link do cupom"
                  value={detail.campaign.couponView.shareUrl}
                  onFocus={(event) => event.target.select()}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void copyToClipboard(detail.campaign.couponView!.shareUrl, 'Link do cupom')
                    }
                  >
                    Copiar link do cupom
                  </Button>
                  {['active', 'scheduled'].includes(detail.campaign.couponView.state) && (
                    <ShareCard
                      {...campaignCouponPromotion(
                        detail.campaign.couponView,
                        detail.campaign.audience,
                      )}
                      label="Cartão do cupom"
                    />
                  )}
                  <a
                    className="text-sm underline"
                    href={detail.campaign.couponView.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir oferta
                  </a>
                </div>
              </section>
            )}
            {detail.campaign.coupon && !detail.campaign.couponView && (
              <p role="status" className="rounded-lg bg-warning-tint p-3 text-sm">
                Há um cupom vinculado, mas seus termos não puderam ser conferidos agora. Atualize
                para tentar novamente antes de divulgar.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries({
                'Resgates concluídos': detail.campaign.stats.redemptions,
                'Em andamento': detail.campaign.stats.pending,
                'Com falha': detail.campaign.stats.failed,
                Conversões: detail.campaign.stats.conversions,
              }).map(([label, value]) => (
                <Card key={label} className="p-4">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </Card>
              ))}
            </div>
            <section>
              <h2 className="font-bold">Últimos cadastros (até 200)</h2>
              <div className="mt-3 max-h-72 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">
                        {audienceOf(detail.campaign) === 'adult' ? 'Pessoa' : 'Responsável'}
                      </th>
                      <th className="p-2">Situação</th>
                      <th className="p-2">Curso até</th>
                      <th className="p-2">Origem de mídia</th>
                      <th className="p-2">Assinatura e comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.redemptions.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2">
                          {row.name}
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                          {row.userId && (
                            <a
                              className="mt-1 inline-block text-xs underline"
                              href={`/admin/membros/${encodeURIComponent(row.userId)}`}
                            >
                              {audienceOf(detail.campaign) === 'adult'
                                ? 'Ver conta e progresso'
                                : 'Ver conta e progresso dos perfis'}
                            </a>
                          )}
                        </td>
                        <td className="p-2">
                          {(
                            {
                              completed: 'Concluído',
                              pending: 'Em andamento',
                              failed: 'Não deu certo',
                            } as Record<string, string>
                          )[row.status] ?? row.status}
                          {row.lastError && (
                            <p className="text-xs text-destructive">{row.lastError}</p>
                          )}
                        </td>
                        <td className="p-2">
                          {row.expiresAt ? dateLabel(row.expiresAt) : 'Sem vencimento'}
                        </td>
                        <td className="p-2 text-xs">
                          {row.attribution
                            ? Object.values(row.attribution).filter(Boolean).join(' / ')
                            : 'Não informada'}
                        </td>
                        <td className="p-2 text-xs">
                          {row.ambassadorName && <p>{row.ambassadorName}</p>}
                          {row.conversion ? (
                            <>
                              <p>Pagamento: {dateLabel(row.conversion.paidAt)}</p>
                              <p>
                                {conversionLabels[row.conversion.status] ?? row.conversion.status}
                              </p>
                              {row.conversion.bonusCents > 0 && (
                                <p>{moneyLabel(row.conversion.bonusCents)}</p>
                              )}
                            </>
                          ) : (
                            'Ainda não assinou'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.redemptions.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">Ainda não houve cadastros.</p>
                )}
              </div>
            </section>
            <section>
              <h2 className="font-bold">Histórico de alterações</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                O relatório acima mede resgates e compras atribuídas. Visitas à página, ativação em
                sete dias e conclusão por campanha ainda não são indicadores consolidados. Consulte
                a ficha da conta para verificar o progresso real de cada perfil.
              </p>
              <ol className="mt-3 space-y-3 text-sm">
                {detail.history.map((entry) => (
                  <li key={entry.id} className="rounded-lg border p-3">
                    <p>
                      {dateLabel(entry.createdAt)} · {entry.actor}
                    </p>
                    <p className="text-muted-foreground">
                      {entry.action === 'created'
                        ? 'Criada'
                        : entry.action === 'duplicated'
                          ? 'Nova edição criada'
                          : 'Atualizada'}
                    </p>
                    <details>
                      <summary className="cursor-pointer">Ver valores registrados</summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(entry.changes, null, 2)}
                      </pre>
                    </details>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </Dialog>
      )}
    </div>
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

function CampaignEditor({
  audience,
  editing,
  onClose,
  onSaved,
}: {
  audience: Platform
  editing: Editing
  onClose: () => void
  onSaved: (value: CampaignView) => void
}) {
  const [value, setValue] = useState<CampaignInput>({
    ...editing.value,
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
      setPartnerError(message(err))
    } finally {
      if (request === partnerRequest.current) setPartnerLoading(false)
    }
  }
  const adultCourse = useAdultGiftCourse(audience === 'adult')
  const [start, setStart] = useState(campaignLocalDate(value.startsAt))
  const [end, setEnd] = useState(campaignLocalDate(value.endsAt))
  const [saving, setSaving] = useState(false)
  const [savedCampaign, setSavedCampaign] = useState<CampaignView | null>(null)
  const [couponDraft, setCouponDraft] = useState<CampaignCouponDraft | null>(null)
  const [error, setError] = useState('')
  const change = <K extends keyof CampaignInput>(key: K, next: CampaignInput[K]) =>
    setValue((current) => ({ ...current, [key]: next }))
  async function submit() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      if (value.commissionEnabled && (commissionAmount === '' || commissionAnnualAmount === ''))
        throw new Error('Informe a comissão dos planos mensal e anual.')
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
      const windows = value.schedule ? campaignScheduleWindows(value.schedule) : null
      const body: CampaignInput = {
        schedule: value.schedule ?? null,
        coupon: editing.duplicate ? null : (value.coupon ?? null),
        name: value.name,
        publicTitle: value.publicTitle,
        description: value.description,
        context: value.context,
        code: value.code,
        channel: value.channel,
        status: value.status,
        // Sempre explícito: um PATCH sem o campo não pode virar Kids por omissão.
        audience,
        startsAt: windows?.startsAt ?? campaignIsoDate(start),
        endsAt: windows?.giftEndsAt ?? campaignIsoDate(end),
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
      setError(message(err))
    } finally {
      setSaving(false)
    }
  }
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
      className="max-w-2xl"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <fieldset className="min-w-0 space-y-2" aria-describedby="campaign-audience-help">
            <legend className="mb-1 text-sm font-semibold">Público do presente</legend>
            <AudienceBadge audience={audience} />
            <p className="text-sm text-muted-foreground">
              {audience === 'kids'
                ? 'Família com criança de 5 a 17 anos. Cadê Todo Mundo e Mural Kids.'
                : '18 anos ou mais. Cadê Todo Mundo na versão adulta e Mural adulto.'}
            </p>
            <p id="campaign-audience-help" className="text-sm text-muted-foreground">
              Esta campanha pertence à comunidade selecionada no Admin. Para criar para outro
              público, troque a comunidade antes de abrir o formulário.
            </p>
            {adultCourse === 'unpublished' ? (
              <p role="status" className="rounded-md bg-warning-tint p-3 text-sm text-warning">
                {ADULT_COURSE_UNPUBLISHED_MESSAGE}
              </p>
            ) : null}
          </fieldset>
          <p className="text-sm text-muted-foreground">
            O nome é interno. O título e a apresentação aparecem para quem recebe o link. O código
            permanece fixo depois de criado.
          </p>
          {(
            [
              { key: 'name', label: 'Nome interno', max: 120 },
              { key: 'publicTitle', label: 'Título público', max: 160 },
              {
                key: 'code',
                label: 'Código do link (4 a 32 letras minúsculas, números e hífens)',
                max: 32,
              },
              { key: 'channel', label: 'Canal de divulgação (interno)', max: 100 },
            ] as const
          ).map((field) => (
            <label key={field.key} className="block space-y-1 text-sm font-semibold">
              <span>{field.label}</span>
              <Input
                value={value[field.key]}
                onChange={(event) => change(field.key, event.target.value)}
                required={field.key !== 'channel'}
                maxLength={field.max}
                minLength={field.key === 'code' ? 4 : field.key === 'channel' ? 0 : 2}
                pattern={field.key === 'code' ? '[a-z0-9-]{4,32}' : undefined}
                disabled={field.key === 'code' && Boolean(editing.id) && !editing.duplicate}
              />
            </label>
          ))}
          <label className="block space-y-1 text-sm font-semibold">
            <span>Apresentação pública (opcional)</span>
            <textarea
              className="min-h-24 w-full rounded-md border bg-background p-3 font-normal"
              value={value.description}
              maxLength={600}
              onChange={(event) => change('description', event.target.value)}
            />
          </label>
          <fieldset className="min-w-0 space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">Embaixador e comissão</legend>
            <p className="text-sm text-muted-foreground">
              Vincule um embaixador para acompanhar os resultados desta ação, mesmo sem comissão.
              Cadastre a pessoa na aba Embaixadores antes de selecioná-la aqui. Se ela for
              desativada, novos cadastros ficam sem comissão; os acordos anteriores são preservados.
            </p>
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
              {value.ambassadorId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
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
                  }}
                >
                  Remover vínculo
                </Button>
              )}
            </div>
            {partnerError && (
              <p role="alert" className="text-sm text-destructive">
                {partnerError}
              </p>
            )}
            {partners.length > 0 && (
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
            )}
            {partnerSearched && !partnerLoading && !partnerError && partners.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum embaixador encontrado. Cadastre a pessoa na aba Embaixadores.
              </p>
            )}
            {partnerTotal > 25 && (
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
            )}
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
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
                  }))
                }}
              />
              Habilitar comissão para novos cadastros
            </label>
            <p className="text-sm text-muted-foreground">
              {value.commissionEnabled
                ? `Bônus único pela primeira contratação, sem comissão nas renovações. Padrão: ${moneyLabel(DEFAULT_REFERRAL_BONUS.monthly)} no mensal e ${moneyLabel(DEFAULT_REFERRAL_BONUS.annual)} no anual. Ajuste conforme o acordo. Pagamento manual após a garantia.`
                : 'Comissão desativada. O vínculo acompanha resultados sem gerar valor a pagar.'}
            </p>
            {value.commissionEnabled && (
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1 text-sm font-semibold">
                  <span>Bônus único no plano mensal (R$)</span>
                  <Input
                    type="number"
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
                  <span>Bônus único no plano anual (R$)</span>
                  <Input
                    type="number"
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
                  <span>Prazo para comissão após cadastro (dias)</span>
                  <Input
                    type="number"
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
                </label>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              A primeira cobrança precisa ser paga antes de completar o prazo informado. Mudanças
              afetam apenas novos cadastros. Quem já recebeu o presente mantém a atribuição
              original.
            </p>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold">
              <span>Tipo</span>
              <select
                className="w-full rounded-md border bg-background p-2"
                value={value.context}
                onChange={(event) =>
                  change('context', event.target.value as CampaignInput['context'])
                }
              >
                <option value="ad">Anúncio</option>
                <option value="event">Palestra ou evento</option>
                <option value="other">Outra ação</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold">
              <span>Situação</span>
              <select
                className="w-full rounded-md border bg-background p-2"
                value={value.status}
                onChange={(event) =>
                  change('status', event.target.value as CampaignInput['status'])
                }
              >
                <option value="draft">{labels.draft}</option>
                <option value="active">{labels.active}</option>
                <option value="paused">{labels.paused}</option>
                <option value="ended">{labels.ended}</option>
              </select>
              {value.status === 'active' ? (
                <span className="block text-xs font-normal text-muted-foreground">
                  Respeita as datas de início e de encerramento
                </span>
              ) : null}
            </label>
          </div>
          {!value.schedule && (
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
          )}
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
          {value.coupon && !editing.duplicate && (
            <div className="rounded-lg border p-3 text-sm">
              <p>
                Esta campanha já tem um cupom vinculado. O calendário acima controla sua validade.
                Marque abaixo para cadastrar outro código, se quiser substituir a oferta ou o
                desconto.
              </p>
              <Button type="button" variant="ghost" onClick={() => change('coupon', null)}>
                Desvincular cupom para novos usos
              </Button>
            </div>
          )}
          <CampaignCouponFields audience={audience} value={couponDraft} onChange={setCouponDraft} />
          {savedCampaign && error && (
            <p role="status" className="rounded-lg bg-warning-tint p-3 text-sm">
              A campanha foi salva, mas o cupom ainda precisa ser concluído. Corrija o problema e
              salve novamente; o mesmo cadastro será retomado.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            O prazo acima controla novos cadastros. Cada cadastro aceito mantém os 7 dias de curso e
            de Mural, mesmo se a campanha for encerrada depois. O link pode ser encaminhado e não
            confere presença no evento. A comissão tem seu próprio prazo, definido acima.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar campanha'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  )
}
