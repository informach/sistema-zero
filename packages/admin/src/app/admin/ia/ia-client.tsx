'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState } from '@/components/admin/empty-state'
import { OverviewCard } from '@/components/admin/overview-card'
import {
  type AiUsagePanelLoaders,
  loadAiUsagePanels,
  runZappyBackfillBatches,
  type ZappyBackfillSummary,
  type ZappyFailedQuestionsPageView,
  type ZappyFailureFilter,
  type ZappyKnowledgeReportView,
  type ZappyMetricsView,
  zappyBackfillNotice,
} from '@/lib/ai-usage-panels'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { AiUsageStatsView } from '@/lib/types'
import { PensaFunnelCard } from './pensa-funnel-card'

/** Rótulos amigáveis dos recursos que gastam créditos (feature desconhecida = cru). */
const FEATURE_LABELS: Record<string, string> = {
  'pensa-planning': 'Pensa: planejamento do jogo',
  'pensa-help': 'Pensa: ajuda com o projeto',
  'studio-describe': 'Mural: descrição do jogo',
  'studio-zappy': 'Zappy do Estúdio',
  'studio-builder': 'Construção no Estúdio Pro',
}

interface PanelErrors {
  usage?: string
  metrics?: string
  knowledge?: string
}

const PANEL_LOADERS: AiUsagePanelLoaders = {
  usage: (month) => apiGet<AiUsageStatsView>(`/api/members/ai-usage?month=${month}`),
  metrics: (month) => apiGet<ZappyMetricsView>(`/api/members/zappy/metrics?month=${month}`),
  knowledge: () => apiGet<ZappyKnowledgeReportView>('/api/members/zappy/knowledge'),
}

const ZAPPY_BACKFILL_CURSOR_KEY = 'sz:zappy-backfill:v2:cursor'

function panelError(result: PromiseRejectedResult, fallback: string): string {
  const reason = result.reason as ApiError | undefined
  return reason?.message ?? fallback
}

function PanelError({ children }: { children?: string }) {
  return children ? (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm"
    >
      {children}
    </p>
  ) : null
}

/** Mês civil corrente em São Paulo (`YYYY-MM`) — espelha a régua do members. */
function currentMonthSp(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .slice(0, 7)
}

export function AiUsageClient() {
  const [month, setMonth] = useState(currentMonthSp)
  const [stats, setStats] = useState<AiUsageStatsView | null>(null)
  const [zappyMetrics, setZappyMetrics] = useState<ZappyMetricsView | null>(null)
  const [knowledge, setKnowledge] = useState<ZappyKnowledgeReportView | null>(null)
  const [errors, setErrors] = useState<PanelErrors>({})
  const [loading, setLoading] = useState(true)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillProcessed, setBackfillProcessed] = useState(0)
  const loadSequence = useRef(0)

  const load = useCallback(async (target: string) => {
    const sequence = ++loadSequence.current
    setLoading(true)
    try {
      const result = await loadAiUsagePanels(target, PANEL_LOADERS)
      if (sequence !== loadSequence.current) return
      const nextErrors: PanelErrors = {}
      if (result.usage.status === 'fulfilled') setStats(result.usage.value)
      else nextErrors.usage = panelError(result.usage, 'O uso do Zappy e do Pensa não carregou.')
      if (result.metrics.status === 'fulfilled') setZappyMetrics(result.metrics.value)
      else nextErrors.metrics = panelError(result.metrics, 'Os números do Zappy não carregaram.')
      if (result.knowledge.status === 'fulfilled') setKnowledge(result.knowledge.value)
      else
        nextErrors.knowledge = panelError(
          result.knowledge,
          'A situação da base do Zappy não carregou.',
        )
      setErrors(nextErrors)
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(month)
  }, [load, month])

  const fmt = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString('pt-BR'))

  const backfill = async () => {
    setBackfilling(true)
    setBackfillProcessed(0)
    try {
      const initialCursor = sessionStorage.getItem(ZAPPY_BACKFILL_CURSOR_KEY) ?? undefined
      const total = await runZappyBackfillBatches({
        ...(initialCursor ? { initialCursor } : {}),
        step: (cursor) =>
          apiSend<ZappyBackfillSummary>(
            '/api/members/zappy/knowledge',
            'POST',
            cursor ? { cursor } : {},
          ),
        checkpoint: (cursor, processed) => {
          setBackfillProcessed(processed)
          if (cursor) sessionStorage.setItem(ZAPPY_BACKFILL_CURSOR_KEY, cursor)
          else sessionStorage.removeItem(ZAPPY_BACKFILL_CURSOR_KEY)
        },
      })
      const notice = zappyBackfillNotice(total)
      if (notice.kind === 'success') toast.success(notice.message)
      else toast.warning(notice.message)
      await load(month)
    } catch (error) {
      toast.error(
        (error as ApiError).message ?? 'A base do Zappy não foi atualizada. Tente de novo.',
      )
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Zappy e Pensa"
        description="Quanto o Zappy e o Pensa foram usados, quanto custaram e onde as respostas não ajudaram. As famílias veem esse uso como créditos."
        action={
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Mês"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button variant="outline" onClick={() => load(month)} disabled={loading}>
              {loading ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />} Atualizar
            </Button>
          </div>
        }
      />

      <PanelError>{errors.usage}</PanelError>

      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewCard
          title="Pedidos no mês"
          value={fmt(stats?.monthUsed)}
          description="Pedidos dentro dos créditos incluídos"
        />
        <OverviewCard title="Hoje" value={fmt(stats?.todayUsed)} description="Pedidos de hoje" />
        <OverviewCard
          title="Contas que usaram"
          value={fmt(stats?.accounts)}
          description="Contas diferentes que usaram o Zappy ou o Pensa no mês"
        />
      </div>

      {stats?.studioCosts && (
        <Card>
          <CardHeader>
            <CardTitle>Quanto custou no Estúdio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-muted-foreground text-sm">
              Inclui os consertos internos. O valor não confirmado é a estimativa do pedido. O
              reservado volta quando o pedido termina ou vence. Os outros produtos ainda aparecem só
              na contagem de pedidos.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quem paga e modelo</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Confirmado (US$)</TableHead>
                  <TableHead>Não confirmado (US$)</TableHead>
                  <TableHead>Reservado (US$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.studioCosts.map((row) => (
                  <TableRow key={`${row.source}:${row.model}:${row.purpose}:${row.privileged}`}>
                    <TableCell>
                      {row.source === 'platform'
                        ? 'Sistema Zero'
                        : 'Chave do responsável (OpenRouter)'}
                      <br />
                      {row.model}
                    </TableCell>
                    <TableCell>
                      {row.purpose === 'tutor' ? 'Ajuda (Zappy)' : 'Construção'}
                      {row.privileged ? ' · equipe' : ''}
                    </TableCell>
                    <TableCell>{row.calls}</TableCell>
                    {[row.confirmedMicroUsd, row.uncertainMicroUsd, row.reservedMicroUsd].map(
                      (value, index) => (
                        <TableCell
                          key={['confirmed', 'uncertain', 'reserved'][index]}
                          className="tabular-nums"
                        >
                          {(value / 1_000_000).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Onde foi usado</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.byFeature.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum uso registrado neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Onde</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.byFeature ?? []).map((f) => (
                    <TableRow key={f.feature}>
                      <TableCell>{FEATURE_LABELS[f.feature] ?? f.feature}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.used.toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contas que mais usaram no mês</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.topAccounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum uso registrado neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.topAccounts ?? []).map((a) => (
                    <TableRow key={a.accountId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {a.name ?? `Conta ${a.accountId.slice(0, 8)}`}
                            </p>
                            {a.email ? (
                              <p className="truncate text-muted-foreground text-xs">{a.email}</p>
                            ) : null}
                          </div>
                          {a.privileged ? <Badge variant="muted">equipe</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {a.used.toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Zappy do Estúdio</CardTitle>
            <p className="mt-1 text-muted-foreground text-sm">
              Os números do mês. A lista de baixo mostra só as perguntas que não deram certo, com os
              dados pessoais tirados e sem dizer qual criança ou projeto.
            </p>
          </div>
          <Button variant="outline" onClick={() => void backfill()} disabled={backfilling}>
            {backfilling ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}{' '}
            {backfilling
              ? `Atualizando… ${backfillProcessed.toLocaleString('pt-BR')}`
              : 'Atualizar a base do Zappy'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <PanelError>{errors.metrics}</PanelError>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewCard title="Perguntas" value={fmt(zappyMetrics?.questions)} />
            <OverviewCard
              title="Úteis"
              value={fmt(zappyMetrics?.useful)}
              description={`Em ${fmt(zappyMetrics?.notUseful)} a pessoa marcou que não ajudou`}
            />
            <OverviewCard
              title="Recusas e pedidos de contexto"
              value={`${fmt(zappyMetrics?.refusals)} e ${fmt(zappyMetrics?.needsContext)}`}
            />
            <OverviewCard
              title="Tempo médio de resposta"
              value={
                zappyMetrics ? `${zappyMetrics.averageLatencyMs.toLocaleString('pt-BR')} ms` : '—'
              }
              description={`${fmt(zappyMetrics?.quota)} sem crédito · ${fmt(zappyMetrics?.errors)} erros · ${fmt(zappyMetrics?.rejected)} reprovadas`}
            />
          </div>
          <PanelError>{errors.knowledge}</PanelError>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium">Materiais prontos</p>
              <p className="mt-1 text-2xl font-bold">{fmt(knowledge?.readySources)}</p>
              <p className="text-muted-foreground text-xs">
                {fmt(knowledge?.pendingSources)} esperando · {fmt(knowledge?.errorSources)} com erro
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium">Vídeos sem transcrição</p>
              <p className="mt-1 text-2xl font-bold">
                {fmt(knowledge?.lessonsWithVideoWithoutTranscript.length)}
              </p>
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {knowledge?.lessonsWithVideoWithoutTranscript
                  .map((item) => item.lessonTitle)
                  .join(', ') || 'Tudo certo'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium">Cursos sem Passo a passo do projeto</p>
              <p className="mt-1 text-2xl font-bold">
                {fmt(knowledge?.coursesWithoutStudentNotebook.length)}
              </p>
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {knowledge?.coursesWithoutStudentNotebook
                  .map((item) => item.courseTitle)
                  .join(', ') || 'Tudo certo'}
              </p>
            </div>
          </div>
          {knowledge?.failedSources.length ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="font-medium text-destructive">Materiais que precisam de correção</p>
              <ul className="mt-2 space-y-2 text-sm">
                {knowledge.failedSources.slice(0, 8).map((source) => (
                  <li key={`${source.sourceType}:${source.sourceRef}`}>
                    <span className="font-medium">
                      {source.courseTitle} · {source.lessonTitle}
                    </span>
                    <span className="block text-muted-foreground">{source.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ZappyFailedQuestionsCard month={month} />

      <PensaFunnelCard />
    </div>
  )
}

const FAILURE_FILTER_LABELS: Record<ZappyFailureFilter, string> = {
  all: 'Todas as falhas',
  rejected: 'Reprovadas na conferência',
  error: 'Erros técnicos',
  'not-useful': 'A pessoa marcou que não ajudou',
}

const OUTCOME_LABELS: Record<string, string> = {
  rejected: 'Reprovada',
  error: 'Erro',
  'needs-context': 'Pediu contexto',
  refusal: 'Recusa',
  quota: 'Sem crédito',
  normal: 'Respondida',
}

/** Perguntas que o Zappy não conseguiu responder: o dado que faltava para
 *  melhorar o tutor. Redigidas na gravação; SEM identificar criança/projeto. */
function ZappyFailedQuestionsCard({ month }: { month: string }) {
  const [filter, setFilter] = useState<ZappyFailureFilter>('all')
  const [page, setPage] = useState<ZappyFailedQuestionsPageView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (offset = 0) => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiGet<ZappyFailedQuestionsPageView>(
          `/api/members/zappy/questions?month=${month}&filter=${filter}&offset=${offset}`,
        )
        setPage((current) =>
          offset > 0 && current
            ? { items: [...current.items, ...result.items], total: result.total }
            : result,
        )
      } catch (cause) {
        setError((cause as ApiError)?.message ?? 'As perguntas não carregaram. Tente de novo.')
      } finally {
        setLoading(false)
      }
    },
    [month, filter],
  )

  useEffect(() => {
    void load(0)
  }, [load])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Perguntas que falharam</CardTitle>
          <p className="mt-1 text-muted-foreground text-sm">
            O que as crianças perguntaram e o Zappy não conseguiu responder bem
            {page ? `: ${page.total.toLocaleString('pt-BR')} no mês.` : '.'}
          </p>
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as ZappyFailureFilter)}
          aria-label="Filtro de falhas"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {Object.entries(FAILURE_FILTER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="space-y-3">
        <PanelError>{error ?? undefined}</PanelError>
        {loading && !page ? <Spinner /> : null}
        {page && page.items.length === 0 ? (
          <EmptyState
            zappy="celebrating"
            title={
              filter === 'all' ? 'Nenhuma falha neste mês.' : 'Nenhuma falha desse tipo neste mês.'
            }
          />
        ) : null}
        {page && page.items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pergunta da criança</TableHead>
                <TableHead>Resposta dada</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={`${item.createdAt}:${item.question.slice(0, 40)}`}>
                  <TableCell className="max-w-72 whitespace-pre-wrap align-top font-medium">
                    {item.question}
                  </TableCell>
                  <TableCell className="max-w-96 align-top text-muted-foreground">
                    <span className="line-clamp-3">{item.answerText}</span>
                    {item.rejection ? (
                      <span className="mt-1 block text-destructive text-xs">
                        motivo: {item.rejection}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline">{OUTCOME_LABELS[item.outcome] ?? item.outcome}</Badge>
                    {item.useful === false ? (
                      <Badge variant="muted" className="ml-1">
                        Não ajudou
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-top text-muted-foreground text-sm">
                    {new Date(item.createdAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {page && page.items.length < page.total ? (
          <Button variant="outline" onClick={() => void load(page.items.length)} disabled={loading}>
            {loading ? <Spinner /> : null} Carregar mais
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
