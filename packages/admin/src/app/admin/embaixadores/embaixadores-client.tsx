'use client'

import type { AcquisitionView, OriginDetail, OriginReport } from '@sistemazero/core/referrals'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Pagination } from '@sistemazero/ui/pagination'
import { Select } from '@sistemazero/ui/select'
import { ShareCard } from '@sistemazero/ui/share-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { Copy, Gift, Mail, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/app/admin/notas-fiscais/copy-to-clipboard'
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { ByOfferTable, PeopleTable, useOfferNames } from '@/components/admin/origin-parts'
import { OverviewCard } from '@/components/admin/overview-card'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import type { ApiError } from '@/lib/api'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import { formatCents, formatCentsStr, formatDate } from '@/lib/format'
import { loadAllPages } from '@/lib/load-all-pages'
import type { Platform } from '@/lib/platform'
import {
  bonusCameBy,
  isOriginDetail,
  isOriginReport,
  moneyFromCents,
  moneyRounded,
  ORIGIN_PERIOD_LABELS,
  type OriginPeriod,
  originPeriodQuery,
  percent,
} from '@/lib/referral-origin'
import type {
  AmbassadorDetailView,
  AmbassadorListItemView,
  AmbassadorRedemptionView,
  AmbassadorView,
  ConversionAdminView,
  ConversionStatus,
} from '@/lib/types'

const PAGE_SIZE = 25
const WRITE_ROLES = new Set(['superadmin', 'admin'])

/**
 * Embaixadores (25/11/2026, Canvas "admin-embaixadores"): quem manda presentes e indica ofertas
 * com o próprio link, com o que cada um trouxe nesta comunidade (o `results` da lista, que conta
 * também as campanhas ligadas à pessoa) e o bônus a pagar. Criar = nome + e-mail → o referrals
 * gera o código + a página (capability-URL) e envia o magic-link por e-mail.
 */
export const EmbaixadoresClient = communityPage<{ currentRole: string }>(EmbaixadoresForCommunity)

type AmbassadorSort = 'subscriptions' | 'revenue' | 'recent'

/** A soma dos bônus de cada embaixador (pelo e-mail): a pagar, na garantia e pagos. */
export interface AmbassadorBonusTotals {
  toPay: number
  pending: number
  paid: number
}
export function bonusTotalsByEmail(
  conversions: ConversionAdminView[],
): Map<string, AmbassadorBonusTotals> {
  const totals = new Map<string, AmbassadorBonusTotals>()
  for (const c of conversions) {
    if (!c.ambassadorEmail) continue
    const key = c.ambassadorEmail.toLowerCase()
    const row = totals.get(key) ?? { toPay: 0, pending: 0, paid: 0 }
    if (c.status === 'eligible') row.toPay += c.bonusCents
    else if (c.status === 'pending') row.pending += c.bonusCents
    else if (c.status === 'paid') row.paid += c.bonusCents
    totals.set(key, row)
  }
  return totals
}

/** A ordem da lista: mais assinaturas, mais faturamento ou mais recentes primeiro. */
export function sortAmbassadors(items: AmbassadorListItemView[], sort: AmbassadorSort) {
  const value = (i: AmbassadorListItemView) =>
    sort === 'subscriptions'
      ? (i.results?.subscriptions ?? 0)
      : sort === 'revenue'
        ? Number(i.results?.revenueCents ?? 0)
        : Date.parse(i.createdAt)
  return [...items].sort((a, b) => value(b) - value(a))
}

function EmbaixadoresForCommunity({
  currentRole,
  audience,
}: {
  currentRole: string
  audience: Platform
}) {
  const { get: apiGet, send: apiSend } = useCommunityRequests(audience)
  const canWrite = WRITE_ROLES.has(currentRole)
  const { confirm, confirmDialog } = useConfirm()
  const offerNames = useOfferNames(audience)

  const [items, setItems] = useState<AmbassadorListItemView[]>([])
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<AmbassadorSort>('subscriptions')
  const [period, setPeriod] = useState<OriginPeriod>('30d')
  const [report, setReport] = useState<OriginReport | null>(null)
  const [bonus, setBonus] = useState<Map<string, AmbassadorBonusTotals> | null>(null)
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<AmbassadorDetailView | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // A lista inteira: a ordem por assinaturas ou faturamento é feita aqui.
      const all = await loadAllPages((pageOffset, limit) => {
        const params = new URLSearchParams({ limit: String(limit), offset: String(pageOffset) })
        if (search) params.set('q', search)
        return apiGet<{ items: AmbassadorListItemView[]; total: number }>(
          `/api/admin/referrals/ambassadors?${params.toString()}`,
        )
      })
      setItems(all)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      toast.error((err as ApiError).message)
    } finally {
      setLoading(false)
    }
  }, [apiGet, search])

  useEffect(() => {
    void load()
  }, [load])

  // O período (Origem das vendas) e os bônus são leituras admin+ (e-mails e valores).
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
  useEffect(() => {
    if (!canWrite) return
    let alive = true
    loadAllPages((pageOffset, limit) =>
      apiGet<{ items: ConversionAdminView[]; total: number }>(
        `/api/admin/referrals/conversions?${new URLSearchParams({ limit: String(limit), offset: String(pageOffset) })}`,
      ),
    )
      .then((all) => {
        if (alive) setBonus(bonusTotalsByEmail(all))
      })
      .catch(() => {
        if (alive) setBonus(null)
      })
    return () => {
      alive = false
    }
  }, [apiGet, canWrite])

  async function openDetail(id: string) {
    try {
      const data = await apiGet<AmbassadorDetailView>(`/api/admin/referrals/ambassadors/${id}`)
      setDetail(data)
      setDetailOpen(true)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      toast.error((err as ApiError).message)
    }
  }

  async function resendLink(row: { id: string; email: string }) {
    try {
      const res = await apiSend<{ sent: boolean }>(
        `/api/admin/referrals/ambassadors/${row.id}/resend-link`,
        'POST',
      )
      if (res.sent) toast.success(`E-mail do link reenviado para ${row.email}.`)
      else toast.warning('O e-mail não saiu agora. Copie o link nos detalhes e mande por fora.')
      void load()
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      toast.error((err as ApiError).message)
    }
  }

  function toggleStatus(row: { id: string; name: string; status: 'active' | 'disabled' }) {
    const disabling = row.status === 'active'
    confirm({
      title: disabling ? 'Desativar embaixador?' : 'Reativar embaixador?',
      message: disabling
        ? `A página e os links de ${row.name} param de funcionar. Nas campanhas vinculadas, novos cadastros continuam recebendo o presente, mas sem bônus. A alteração vale para Kids e Adultos. Os presentes e os acordos já aceitos continuam valendo.`
        : `A página e os links de ${row.name} voltam a funcionar nas duas comunidades. Campanhas com bônus voltam a gerar bônus para novos cadastros.`,
      confirmText: disabling ? 'Desativar' : 'Reativar',
      confirmVariant: disabling ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          await apiSend(`/api/admin/referrals/ambassadors/${row.id}`, 'PATCH', {
            status: disabling ? 'disabled' : 'active',
          })
          toast.success(disabling ? 'Embaixador desativado.' : 'Embaixador reativado.')
          setDetailOpen(false)
          void load()
        } catch (err) {
          if (isCanceledCommunityRequest(err)) return
          toast.error((err as ApiError).message)
        }
      },
    })
  }

  const sorted = useMemo(() => sortAmbassadors(items, sort), [items, sort])
  const page = sorted.slice(offset, offset + PAGE_SIZE)
  const showRevenue = items.some((i) => i.results?.revenueCents != null)
  const showBonus = bonus !== null
  const columns = 7 + (showRevenue ? 1 : 0) + (showBonus ? 1 : 0)
  const activeCount = items.filter((i) => i.status === 'active').length
  const disabledCount = items.length - activeCount
  const ambassadorRow = report?.byOrigin.find((row) => row.origin === 'ambassador')
  const bonusTotal = bonus
    ? [...bonus.values()].reduce(
        (acc, row) => ({ toPay: acc.toPay + row.toPay, pending: acc.pending + row.pending }),
        { toPay: 0, pending: 0 },
      )
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Embaixadores</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">
            Quem manda presentes e indica ofertas com o próprio link. O cadastro do embaixador vale
            para Kids e Adultos; os números abaixo são desta comunidade e contam também as campanhas
            ligadas a cada pessoa.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {canWrite ? (
            <Select
              aria-label="Período"
              value={period}
              className="w-auto"
              onChange={(e) => setPeriod(e.target.value as OriginPeriod)}
            >
              {(['30d', '90d', 'year'] as const).map((p) => (
                <option key={p} value={p}>
                  {ORIGIN_PERIOD_LABELS[p]}
                </option>
              ))}
            </Select>
          ) : null}
          {canWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden /> Novo embaixador
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <OverviewCard
          title="Embaixadores ativos"
          value={loading ? '…' : activeCount}
          description={`${disabledCount} ${disabledCount === 1 ? 'desativado' : 'desativados'}`}
        />
        {ambassadorRow ? (
          <>
            <OverviewCard
              title="Pessoas que entraram"
              value={ambassadorRow.newPeople}
              description={`${ambassadorRow.gifts} por presente`}
            />
            <OverviewCard
              title="Compras"
              value={ambassadorRow.purchases}
              description="cursos e ofertas, fora a assinatura"
            />
            <OverviewCard
              title="Assinaturas"
              value={ambassadorRow.subscriptions}
              description={`${percent(ambassadorRow.subscriptions, ambassadorRow.newPeople)} de quem entrou`}
            />
            <OverviewCard
              title="Faturamento"
              value={moneyRounded(ambassadorRow.revenueCents)}
              description="valor pago, sem estornos"
            />
          </>
        ) : null}
        {bonusTotal ? (
          <OverviewCard
            title="Bônus a pagar"
            value={moneyRounded(bonusTotal.toPay)}
            description={`${moneyFromCents(bonusTotal.pending)} na garantia`}
          />
        ) : null}
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setOffset(0)
          setSearch(q.trim())
        }}
      >
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou e-mail"
            className="pl-9"
            aria-label="Buscar embaixadores"
          />
        </div>
        <Select
          aria-label="Ordenar"
          value={sort}
          className="w-auto"
          onChange={(e) => {
            setSort(e.target.value as AmbassadorSort)
            setOffset(0)
          }}
        >
          <option value="subscriptions">Mais assinaturas primeiro</option>
          {showRevenue ? <option value="revenue">Mais faturamento primeiro</option> : null}
          <option value="recent">Mais recentes primeiro</option>
        </Select>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <Card className="overflow-hidden rounded-2xl p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Embaixador</TableHead>
              <TableHead className="text-right">Entraram</TableHead>
              <TableHead className="text-right">Presentes</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Assinaturas</TableHead>
              {showRevenue ? <TableHead className="text-right">Faturamento</TableHead> : null}
              {showBonus ? <TableHead>Bônus</TableHead> : null}
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={5} columns={columns} />
            ) : page.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns} className="py-10 text-center text-muted-foreground">
                  <Gift className="mx-auto mb-2 size-6" aria-hidden />
                  Nenhum embaixador ainda. Crie o primeiro e envie o link da página dele.
                </TableCell>
              </TableRow>
            ) : (
              page.map((row) => {
                const totals = bonus?.get(row.email.toLowerCase())
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.email} · <span className="font-mono">{row.code || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.results?.people ?? row.redemptionsCompleted}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.results?.gifts ?? row.redemptionsCompleted}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.results?.purchases ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.results?.subscriptions ?? '—'}
                    </TableCell>
                    {showRevenue ? (
                      <TableCell className="text-right tabular-nums">
                        {row.results?.revenueCents != null
                          ? moneyFromCents(row.results.revenueCents)
                          : '—'}
                      </TableCell>
                    ) : null}
                    {showBonus ? (
                      <TableCell className="text-sm">
                        {totals && totals.toPay > 0 ? (
                          <div className="font-medium">{moneyFromCents(totals.toPay)} a pagar</div>
                        ) : totals && totals.pending > 0 ? (
                          <div>{moneyFromCents(totals.pending)} na garantia</div>
                        ) : (
                          <div className="text-muted-foreground">Nada a pagar</div>
                        )}
                        {totals && totals.paid > 0 ? (
                          <div className="text-xs text-muted-foreground">
                            {moneyFromCents(totals.paid)} pagos
                          </div>
                        ) : null}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {row.status === 'active' ? (
                        <Badge className="bg-success/15 text-success-foreground">Ativo</Badge>
                      ) : (
                        <Badge variant="muted">Desativado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Detalhes de ${row.name}`}
                          onClick={() => void openDetail(row.id)}
                        >
                          Detalhes
                        </Button>
                        {canWrite && row.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reenviar o e-mail com o link da página"
                            aria-label={`Reenviar o e-mail com o link da página de ${row.name}`}
                            onClick={() => void resendLink(row)}
                          >
                            <Mail className="size-4" aria-hidden />
                          </Button>
                        ) : null}
                        {canWrite && row.status !== 'active' ? (
                          <Button variant="ghost" size="sm" onClick={() => toggleStatus(row)}>
                            Reativar
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        total={sorted.length}
        limit={PAGE_SIZE}
        offset={offset}
        onChange={(next: number) => setOffset(next)}
      />

      {/* A listagem de bônus carrega chave Pix + e-mail de quem assinou: o gateway restringe a
          admin+ (`referrals-admin-conversions-read`). Esconder aqui evita oferecer ao staff uma
          seção que responderia 403. */}
      {canWrite ? (
        <BonusSection audience={audience} canWrite={canWrite} offerNames={offerNames} />
      ) : null}

      {createOpen && (
        <CreateAmbassadorDialog
          audience={audience}
          onClose={() => setCreateOpen(false)}
          onCreated={(view, emailSent) => {
            setCreateOpen(false)
            if (emailSent)
              toast.success(`Embaixador criado. O link foi enviado para ${view.email}.`)
            else
              toast.warning(
                'Embaixador criado, mas o e-mail não saiu. Copie o link e mande por fora.',
              )
            void load()
            if (view.pageUrl) void openDetail(view.id)
          }}
        />
      )}

      {detailOpen && detail && (
        <AmbassadorDetailDialog
          detail={detail}
          audience={audience}
          canWrite={canWrite}
          offerNames={offerNames}
          bonus={bonus?.get(detail.ambassador.email.toLowerCase()) ?? null}
          onClose={() => setDetailOpen(false)}
          onCopy={copyToClipboard}
          onResend={() => void resendLink(detail.ambassador)}
          onToggle={() => toggleStatus(detail.ambassador)}
        />
      )}

      {confirmDialog}
    </div>
  )
}

/** Exportado p/ o teste de conformance admin×referrals (union espelhado à mão). */
export const CONVERSION_STATUS_LABEL: Record<ConversionStatus, string> = {
  pending: 'Na garantia',
  eligible: 'Aguardando Pix',
  paid: 'Pago',
  canceled: 'Assinatura estornada',
  self_blocked: 'Autoindicação',
  unrewarded: 'Campanha (sem bônus)',
  superseded: 'Compra substituída',
}

const SELF_BLOCKED_HINT = 'Sem bônus: quem assinou é o próprio embaixador'

/**
 * Apresentação por status numa TABELA só (Record EXAUSTIVO: um status novo no
 * referrals reprova a compilação aqui em vez de cair num rótulo errado).
 */
const CONVERSION_STATUS_BADGE: Record<
  ConversionStatus,
  { variant?: 'muted' | 'outline'; className?: string; title?: (c: ConversionAdminView) => string }
> = {
  pending: { variant: 'muted', title: (c) => `A garantia libera em ${formatDate(c.maturesAt)}` },
  eligible: {},
  paid: {
    className: 'bg-success/15 text-success-foreground',
    title: (c) =>
      [
        c.paidMarkedAt
          ? `Pago em ${formatDate(c.paidMarkedAt)} por ${c.paidMarkedBy ?? 'Admin'}`
          : '',
        c.note ? `Nota: ${c.note}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
  },
  canceled: { variant: 'muted' },
  superseded: {
    variant: 'muted',
    title: () =>
      'Uma compra anterior elegível assumiu a atribuição. Este registro não representa estorno.',
  },
  self_blocked: { variant: 'muted', title: () => SELF_BLOCKED_HINT },
  unrewarded: {
    variant: 'muted',
    title: () =>
      'Assinatura atribuída à campanha, sem comissão habilitada ou fora do prazo combinado',
  },
}

function ConversionStatusBadge({ c }: { c: ConversionAdminView }) {
  const p = CONVERSION_STATUS_BADGE[c.status]
  const title = p.title?.(c)
  return (
    <Badge variant={p.variant} className={p.className} title={title || undefined}>
      {CONVERSION_STATUS_LABEL[c.status]}
    </Badge>
  )
}

/**
 * Bônus de indicação: cada linha é um bolsista que assinou a Comunidade dos
 * Criadores. Passada a garantia de 7 dias o bônus fica "Aguardando Pix": você
 * paga por fora (Pix manual, sem saldo no produto) e marca como pago aqui.
 */
function BonusSection({
  canWrite,
  audience,
  offerNames,
}: {
  canWrite: boolean
  audience: Platform
  offerNames: ReadonlyMap<string, string>
}) {
  const { get: apiGet, send: apiSend } = useCommunityRequests(audience)
  const { confirm, confirmDialog } = useConfirm()
  const [items, setItems] = useState<ConversionAdminView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState<'' | ConversionStatus>('')
  const [loading, setLoading] = useState(true)
  // ⚠️ Falha de carga NÃO pode virar "nenhum bônus" (régua da casa: lista que
  // FALHOU ≠ lista vazia). Numa tela de dinheiro, o vazio falso faz a operadora
  // concluir que não deve nada a ninguém.
  const [failed, setFailed] = useState(false)
  // Última requisição VENCE: trocar o filtro rápido não deixa uma resposta
  // atrasada pintar linhas do filtro anterior sob o dropdown novo.
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      if (status) params.set('status', status)
      const data = await apiGet<{ items: ConversionAdminView[]; total: number }>(
        `/api/admin/referrals/conversions?${params.toString()}`,
      )
      if (seq !== loadSeq.current) return
      setItems(data.items)
      setTotal(data.total)
      setFailed(false)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      if (seq !== loadSeq.current) return
      setFailed(true)
      toast.error((err as ApiError).message)
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [apiGet, offset, status])

  useEffect(() => {
    void load()
  }, [load])

  // "Veio por": as aquisições de cada pessoa da página (uma leitura por e-mail, quatro por vez).
  const [cameBy, setCameBy] = useState<Map<string, AcquisitionView[]>>(new Map())
  useEffect(() => {
    let alive = true
    const emails = [...new Set(items.map((row) => row.redemptionEmail.toLowerCase()))]
    const queue = [...emails]
    const found = new Map<string, AcquisitionView[]>()
    const worker = async () => {
      for (let email = queue.shift(); email; email = queue.shift()) {
        try {
          const result = await apiGet<{ items: AcquisitionView[] }>(
            `/api/admin/referrals/acquisitions?${new URLSearchParams({ email })}`,
          )
          found.set(email, result.items)
        } catch {
          // Sem a leitura, a coluna fica com o traço: o bônus continua na tela.
        }
      }
    }
    void Promise.all([worker(), worker(), worker(), worker()]).then(() => {
      if (alive) setCameBy(found)
    })
    return () => {
      alive = false
    }
  }, [apiGet, items])

  function markPaid(row: ConversionAdminView) {
    confirm({
      title: 'Marcar bônus como pago?',
      message: `Confirme que você já fez o Pix de ${formatCents(row.bonusCents)} para ${row.ambassadorName ?? 'o embaixador'}${row.ambassadorPixKey ? ` (chave ${row.ambassadorPixKey})` : ''}. Essa marcação não envia dinheiro, só registra o controle.`,
      confirmText: 'Já paguei, marcar',
      onConfirm: async () => {
        try {
          await apiSend(`/api/admin/referrals/conversions/${row.id}/mark-paid`, 'POST', {})
          toast.success('Bônus marcado como pago.')
          void load()
        } catch (err) {
          if (isCanceledCommunityRequest(err)) return
          const apiErr = err as ApiError
          toast.error(
            apiErr.code === 'CONVERSION_NOT_ELIGIBLE'
              ? 'Este bônus não está aguardando pagamento. Recarregue a lista.'
              : apiErr.message,
          )
        }
      },
    })
  }

  function matureNow(row: ConversionAdminView) {
    confirm({
      title: 'Antecipar a garantia?',
      // Nomeia o EMBAIXADOR (é quem recebe), com o bolsista como referência —
      // numa confirmação sobre dinheiro, o nome errado é o que se confere.
      message: `O bônus de ${row.ambassadorName ?? 'este embaixador'}, pela assinatura de ${row.redemptionName}, fica liberado agora, antes dos 7 dias de garantia. Se a família pedir estorno depois, o acerto é feito à mão. Use só para testes ou exceções que você decidiu fazer.`,
      confirmText: 'Antecipar',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await apiSend(`/api/admin/referrals/conversions/${row.id}/mature-now`, 'POST')
          toast.success('Garantia antecipada. O bônus libera no próximo ciclo do serviço.')
          void load()
        } catch (err) {
          if (isCanceledCommunityRequest(err)) return
          const apiErr = err as ApiError
          toast.error(
            apiErr.code === 'CONVERSION_NOT_PENDING'
              ? 'Só conversões na garantia podem antecipar. Recarregue a lista.'
              : apiErr.message,
          )
        }
      },
    })
  }

  return (
    <section className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Bônus de indicação</h2>
          <p className="text-sm text-muted-foreground">
            Quem veio por um embaixador e assinou a Comunidade. Depois da garantia de 7 dias, o
            bônus fica aguardando o seu Pix manual.
          </p>
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => {
              setOffset(0)
              setStatus(e.target.value as '' | ConversionStatus)
            }}
            aria-label="Filtrar bônus por situação"
          >
            <option value="">Todos</option>
            {(Object.keys(CONVERSION_STATUS_LABEL) as ConversionStatus[]).map((s) => (
              <option key={s} value={s}>
                {CONVERSION_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quem indicou</TableHead>
              <TableHead>Quem assinou</TableHead>
              <TableHead>Veio por</TableHead>
              <TableHead>Assinou em</TableHead>
              <TableHead className="text-right">Bônus</TableHead>
              <TableHead>Chave Pix</TableHead>
              <TableHead>Situação</TableHead>
              {canWrite && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={3} columns={canWrite ? 8 : 7} />
            ) : failed ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 8 : 7} className="py-8 text-center">
                  <p className="text-sm text-destructive">
                    Não consegui carregar os bônus agora. Isto não quer dizer que não há nenhum.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
                    Tentar de novo
                  </Button>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 8 : 7}
                  className="py-8 text-center text-muted-foreground"
                >
                  {status
                    ? 'Nenhum bônus nessa situação agora. Escolha "Todos" para ver a lista inteira.'
                    : 'Nenhum bônus por aqui ainda. Quando alguém que veio por um embaixador assinar a Comunidade, aparece nesta lista.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{row.ambassadorName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{row.ambassadorEmail ?? ''}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{row.redemptionName}</div>
                    <div className="text-xs text-muted-foreground">{row.redemptionEmail}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(() => {
                      const origin = bonusCameBy(
                        cameBy.get(row.redemptionEmail.toLowerCase()) ?? [],
                        { id: row.ambassadorId, name: row.ambassadorName },
                        offerNames,
                      )
                      return origin ? (
                        <>
                          <div>{origin.label}</div>
                          <div className="text-xs text-muted-foreground">{origin.detail}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{formatDate(row.subscribedAt)}</div>
                    <div className="text-xs">
                      {offerNames.get(row.offerSlug) ?? row.offerSlug} ·{' '}
                      {formatCentsStr(row.amountCents)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCents(row.bonusCents)}
                  </TableCell>
                  <TableCell>
                    {row.ambassadorPixKey ? (
                      <div className="flex items-center gap-1">
                        <code className="max-w-40 truncate rounded bg-muted px-2 py-1 text-xs">
                          {row.ambassadorPixKey}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copiar a chave Pix"
                          aria-label="Copiar a chave Pix"
                          onClick={() =>
                            void copyToClipboard(row.ambassadorPixKey ?? '', 'Chave Pix')
                          }
                        >
                          <Copy className="size-4" aria-hidden />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Ainda não informou</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ConversionStatusBadge c={row} />
                    {/* Datas VISÍVEIS (tooltip não existe no toque nem por
                        teclado, e é justamente o que a operadora usa p/ saber
                        o que liberar esta semana e p/ auditar o Pix). */}
                    {row.status === 'pending' ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        libera em {formatDate(row.maturesAt)}
                      </div>
                    ) : null}
                    {row.status === 'paid' && row.paidMarkedAt ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(row.paidMarkedAt)}
                        {row.paidMarkedBy ? ` · ${row.paidMarkedBy}` : ''}
                      </div>
                    ) : null}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {row.status === 'eligible' && (
                          <Button variant="ghost" size="sm" onClick={() => markPaid(row)}>
                            Marcar como pago
                          </Button>
                        )}
                        {row.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Libera o bônus antes da garantia de 7 dias"
                            onClick={() => matureNow(row)}
                          >
                            Antecipar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        total={total}
        limit={PAGE_SIZE}
        offset={offset}
        onChange={(next: number) => setOffset(next)}
      />

      {confirmDialog}
    </section>
  )
}

function CreateAmbassadorDialog({
  audience,
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (view: AmbassadorView, emailSent: boolean) => void
  audience: Platform
}) {
  const { send: apiSend } = useCommunityRequests(audience)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (saving) return
    setSaving(true)
    try {
      const res = await apiSend<{ ambassador: AmbassadorView; emailSent: boolean }>(
        '/api/admin/referrals/ambassadors',
        'POST',
        { name: name.trim(), email: email.trim() },
      )
      onCreated(res.ambassador, res.emailSent)
    } catch (err) {
      if (isCanceledCommunityRequest(err)) return
      const apiErr = err as ApiError
      toast.error(
        apiErr.code === 'AMBASSADOR_EMAIL_EXISTS'
          ? 'Já existe embaixador com esse e-mail.'
          : apiErr.message,
      )
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title="Novo embaixador">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <p className="text-sm text-muted-foreground">
          A pessoa não precisa ter conta: ela recebe por e-mail o link da própria página, com o
          código de bolsa para compartilhar. O cadastro é único para Kids e Adultos.
        </p>
        <Field label="Nome">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome de quem vai indicar"
            required
            minLength={2}
          />
        </Field>
        <Field label="E-mail">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dapessoa.com"
            required
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || name.trim().length < 2 || !email.includes('@')}>
            {saving ? 'Criando…' : 'Criar e enviar o link'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function DetailKpi({
  title,
  value,
  hint,
}: {
  title: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="flex min-w-0 flex-[1_1_8rem] flex-col gap-1 p-3">
      <p className="text-muted-foreground text-xs">{title}</p>
      <p className="font-mono text-xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </Card>
  )
}

/**
 * O detalhe do embaixador (25/11/2026, Canvas "admin-embaixador-detalhe"): os números dele nesta
 * comunidade, as vendas por oferta, os links que mais trouxeram gente, a página e as pessoas que
 * vieram por ele (`/ambassadors/:id/results`, admin+). Os resgates pelo código continuam embaixo,
 * para conferir um cadastro preso.
 */
function AmbassadorDetailDialog({
  detail,
  audience,
  canWrite,
  offerNames,
  bonus,
  onClose,
  onCopy,
  onResend,
  onToggle,
}: {
  detail: AmbassadorDetailView
  audience: Platform
  canWrite: boolean
  offerNames: ReadonlyMap<string, string>
  bonus: AmbassadorBonusTotals | null
  onClose: () => void
  onCopy: (text: string, label: string) => Promise<void>
  onResend: () => void
  onToggle: () => void
}) {
  const a = detail.ambassador
  const { get } = useCommunityRequests(audience)
  const [results, setResults] = useState<OriginDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [offset, setOffset] = useState(0)
  const sequence = useRef(0)
  useEffect(() => {
    if (!canWrite) return
    const current = ++sequence.current
    setFailed(false)
    get<OriginDetail>(`/api/admin/referrals/ambassadors/${a.id}/results?offset=${offset}`)
      .then((next) => {
        if (current !== sequence.current) return
        if (isOriginDetail(next)) setResults(next)
        else setFailed(true)
      })
      .catch((err) => {
        if (isCanceledCommunityRequest(err) || current !== sequence.current) return
        setFailed(true)
      })
  }, [get, a.id, offset, canWrite])
  const numbers = results?.results
  const showRevenue = numbers?.revenueCents != null
  const firstName = a.name.split(' ')[0] ?? a.name
  // Os links que trouxeram gente: as entradas por presente e por compra, oferta a oferta.
  const links = (results?.byOffer ?? [])
    .filter((row) => row.kind !== 'subscription')
    .sort((x, y) => y.count - x.count)
  return (
    <Dialog open onClose={onClose} title={a.name} className="max-w-4xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {a.status === 'active' ? (
            <Badge className="bg-success/15 text-success-foreground">Ativo</Badge>
          ) : (
            <Badge variant="muted">Desativado</Badge>
          )}
          <span className="text-muted-foreground">
            {a.email} · embaixador desde {formatDate(a.createdAt)}
          </span>
          {canWrite ? (
            <span className="ml-auto flex gap-2">
              {a.status === 'active' ? (
                <Button variant="outline" size="sm" onClick={onResend}>
                  Reenviar o link da página
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={onToggle}>
                {a.status === 'active' ? 'Desativar' : 'Reativar'}
              </Button>
            </span>
          ) : null}
        </div>

        {numbers ? (
          <div className="flex flex-wrap gap-3">
            <DetailKpi
              title="Pessoas que entraram"
              value={numbers.people}
              hint={`${numbers.gifts} por presente`}
            />
            <DetailKpi title="Compras" value={numbers.purchases} hint="fora a assinatura" />
            <DetailKpi title="Assinaturas" value={numbers.subscriptions} />
            {showRevenue ? (
              <DetailKpi
                title="Faturamento"
                value={moneyRounded(numbers.revenueCents)}
                hint="sem estornos"
              />
            ) : null}
            {bonus ? (
              <DetailKpi
                title="Bônus"
                value={moneyRounded(bonus.toPay)}
                hint={`a pagar · ${moneyFromCents(bonus.paid)} já pagos`}
              />
            ) : null}
          </div>
        ) : null}
        {failed ? (
          <p role="alert" className="text-destructive text-sm">
            Os resultados não carregaram agora.
          </p>
        ) : null}

        {results ? (
          <div className="grid gap-4 md:grid-cols-2">
            <section aria-labelledby="vendas-por-oferta" className="space-y-2">
              <h3 id="vendas-por-oferta" className="font-display font-bold">
                Vendas por oferta
              </h3>
              <ByOfferTable detail={results} names={offerNames} showRevenue={showRevenue} />
            </section>
            <section aria-labelledby="links-gente" className="space-y-2">
              <h3 id="links-gente" className="font-display font-bold">
                Links que mais trouxeram gente
              </h3>
              {links.length === 0 ? (
                <p className="text-muted-foreground text-sm">Ninguém entrou pelos links ainda.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {links.map((row) => (
                    <li
                      key={`${row.kind}:${row.offerSlug}`}
                      className="flex justify-between gap-3 border-b py-1"
                    >
                      <span>
                        {row.kind === 'gift' ? 'Presente' : 'Indicação'} ·{' '}
                        {offerNames.get(row.offerSlug ?? '') ?? row.offerSlug}
                      </span>
                      <span className="font-mono">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              {numbers?.people ? (
                <p className="text-muted-foreground text-xs">
                  {numbers.subscriptions} das {numbers.people} pessoas assinaram (
                  {percent(numbers.subscriptions, numbers.people)}).
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        <section aria-labelledby="pagina-pagamento" className="space-y-2 text-sm">
          <h3 id="pagina-pagamento" className="font-display font-bold">
            Página e pagamento
          </h3>
          {a.pageUrl ? (
            <LinkRow
              label={`Página de ${firstName} (só para ${firstName})`}
              value={a.pageUrl}
              onCopy={onCopy}
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            {a.linkEmailSentAt
              ? `E-mail com o link enviado em ${formatDate(a.linkEmailSentAt)}.`
              : 'O e-mail do link ainda não foi enviado. Copie a página acima e mande por fora.'}
          </p>
          {a.shareUrl ? (
            <div className="flex flex-wrap items-center gap-3">
              <LinkRow
                label="Link de presente (compartilhável)"
                value={a.shareUrl}
                onCopy={onCopy}
              />
              <ShareCard
                url={a.shareUrl}
                title="Um presente para criar em família"
                subtitle="Kids · 5 a 17 anos"
                description="7 dias gratuitos no curso Cadê Todo Mundo e no Mural de criações."
                notice="Acesse o link e faça o cadastro como responsável pela criança."
              />
            </div>
          ) : null}
          {a.code ? (
            <p>
              <span className="text-muted-foreground text-xs">Código </span>
              <span className="font-mono">{a.code}</span>
            </p>
          ) : null}
        </section>

        {results ? (
          <section aria-labelledby="pessoas-embaixador" className="space-y-2">
            <h3 id="pessoas-embaixador" className="font-display font-bold">
              Pessoas que vieram por {firstName}
            </h3>
            <PeopleTable
              detail={results}
              names={offerNames}
              offset={offset}
              onOffset={setOffset}
              personLabel="Pessoa"
              filename={`embaixador-${a.code ?? a.id}-pessoas.csv`}
            />
          </section>
        ) : null}

        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer font-semibold text-sm">
            Resgates pelo código ({detail.redemptions.length})
          </summary>
          {detail.redemptions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum resgate ainda.</p>
          ) : (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.redemptions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="text-sm">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell>
                        {r.status === 'completed' ? (
                          <Badge className="bg-success/15 text-success-foreground">Concluído</Badge>
                        ) : r.status === 'failed' ? (
                          <Badge variant="destructive" title={r.lastError ?? undefined}>
                            Não deu certo{r.failedReason ? ` (${r.failedReason})` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="muted">Pendente</Badge>
                        )}
                        {r.status !== 'completed' && r.lastError ? (
                          <div
                            className="mt-1 max-w-52 truncate text-xs text-muted-foreground"
                            title={r.lastError}
                          >
                            {r.lastError}
                            {r.attemptCount
                              ? ` · ${r.attemptCount} ${r.attemptCount === 1 ? 'tentativa' : 'tentativas'}`
                              : ''}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StageBadge r={r} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(r.completedAt ?? r.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </details>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

/** Rótulos da ETAPA (fraseado próprio; Record EXAUSTIVO como o do badge). */
const STAGE_LABEL: Record<ConversionStatus, string> = {
  pending: 'Assinou, na garantia',
  eligible: 'Bônus liberado',
  paid: 'Bônus pago',
  canceled: CONVERSION_STATUS_LABEL.canceled,
  self_blocked: CONVERSION_STATUS_LABEL.self_blocked,
  unrewarded: CONVERSION_STATUS_LABEL.unrewarded,
  superseded: CONVERSION_STATUS_LABEL.superseded,
}

/**
 * Etapa do bolsista dentro do detalhe: ficou só no curso indicado ou virou
 * assinatura (e em que pé o bônus está). Deriva de `redemption.conversion`;
 * variante/tooltip vêm da MESMA tabela do badge da lista (uma fonte só).
 */
function StageBadge({ r }: { r: AmbassadorRedemptionView }) {
  if (r.status !== 'completed') return <span className="text-xs text-muted-foreground">—</span>
  const c = r.conversion
  if (!c) return <Badge variant="outline">Sem assinatura</Badge>
  const p = CONVERSION_STATUS_BADGE[c.status]
  const title =
    c.status === 'pending'
      ? `Assinou em ${formatDate(c.subscribedAt)}`
      : c.status === 'self_blocked'
        ? SELF_BLOCKED_HINT
        : undefined
  return (
    <Badge variant={p.variant} className={p.className} title={title}>
      {STAGE_LABEL[c.status]}
    </Badge>
  )
}

function LinkRow({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: (text: string, label: string) => Promise<void>
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{value}</code>
        <Button
          variant="ghost"
          size="icon"
          title="Copiar"
          aria-label={`Copiar: ${label}`}
          onClick={() => void onCopy(value, label)}
        >
          <Copy className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
