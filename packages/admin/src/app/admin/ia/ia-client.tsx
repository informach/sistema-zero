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
import { OverviewCard } from '@/components/admin/overview-card'
import {
  type AiUsagePanelLoaders,
  loadAiUsagePanels,
  runZappyBackfillBatches,
  type ZappyBackfillSummary,
  type ZappyKnowledgeReportView,
  type ZappyMetricsView,
  zappyBackfillNotice,
} from '@/lib/ai-usage-panels'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { AiUsageStatsView } from '@/lib/types'

/** Rótulos amigáveis dos recursos que consomem IA (feature desconhecida = cru). */
const FEATURE_LABELS: Record<string, string> = {
  'pensa-chat': 'Pensa — conversa com o Zappy',
  'pensa-synthesis': 'Pensa — gerações (carta/desenho/missões)',
  'studio-describe': 'Mural — descrição do jogo',
  'studio-zappy': 'Zappy do Studio',
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
      else nextErrors.usage = panelError(result.usage, 'Falha ao carregar o consumo de IA.')
      if (result.metrics.status === 'fulfilled') setZappyMetrics(result.metrics.value)
      else
        nextErrors.metrics = panelError(result.metrics, 'Falha ao carregar as métricas do Zappy.')
      if (result.knowledge.status === 'fulfilled') setKnowledge(result.knowledge.value)
      else
        nextErrors.knowledge = panelError(
          result.knowledge,
          'Falha ao carregar a saúde da base do Zappy.',
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
      toast.error((error as ApiError).message ?? 'Falha ao sincronizar a base do Zappy.')
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Uso de IA"
        description="Consumo da quota de IA por conta (50/dia + 500/mês) — Pensa, descrição do Mural e Zappy do Studio."
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
              {loading ? <Spinner /> : <RefreshCw className="size-4" />} Atualizar
            </Button>
          </div>
        }
      />

      <PanelError>{errors.usage}</PanelError>

      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewCard
          title="Interações no mês"
          value={fmt(stats?.monthUsed)}
          description="Chamadas de IA pagas pelo servidor"
        />
        <OverviewCard title="Hoje" value={fmt(stats?.todayUsed)} description="Interações do dia" />
        <OverviewCard
          title="Contas ativas"
          value={fmt(stats?.accounts)}
          description="Contas distintas que usaram IA no mês"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por recurso</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.byFeature.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum uso registrado neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead className="text-right">Interações</TableHead>
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
            <CardTitle>Top contas do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.topAccounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum uso registrado neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Interações</TableHead>
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
            <CardTitle>Zappy do Studio</CardTitle>
            <p className="mt-1 text-muted-foreground text-sm">
              Somente métricas agregadas; as conversas infantis não aparecem neste painel.
            </p>
          </div>
          <Button variant="outline" onClick={() => void backfill()} disabled={backfilling}>
            {backfilling ? <Spinner /> : <RefreshCw className="size-4" />}{' '}
            {backfilling
              ? `Sincronizando… ${backfillProcessed.toLocaleString('pt-BR')}`
              : 'Sincronizar base'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <PanelError>{errors.metrics}</PanelError>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewCard title="Perguntas" value={fmt(zappyMetrics?.questions)} />
            <OverviewCard
              title="Úteis"
              value={fmt(zappyMetrics?.useful)}
              description={`${fmt(zappyMetrics?.notUseful)} marcadas como não úteis`}
            />
            <OverviewCard
              title="Recusas / contexto"
              value={`${fmt(zappyMetrics?.refusals)} / ${fmt(zappyMetrics?.needsContext)}`}
            />
            <OverviewCard
              title="Latência média"
              value={
                zappyMetrics ? `${zappyMetrics.averageLatencyMs.toLocaleString('pt-BR')} ms` : '—'
              }
              description={`${fmt(zappyMetrics?.quota)} quota · ${fmt(zappyMetrics?.errors)} erros`}
            />
          </div>
          <PanelError>{errors.knowledge}</PanelError>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium">Fontes prontas</p>
              <p className="mt-1 text-2xl font-bold">{fmt(knowledge?.readySources)}</p>
              <p className="text-muted-foreground text-xs">
                {fmt(knowledge?.pendingSources)} pendentes · {fmt(knowledge?.errorSources)} com erro
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
              <p className="font-medium">Cursos sem caderno</p>
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
              <p className="font-medium text-destructive">Fontes que precisam de correção</p>
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
    </div>
  )
}
