'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { TrendingDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { usePlatform } from '@/components/admin/platform-provider'
import { AlunosTabs } from '@/components/admin/section-tabs'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet } from '@/lib/api'
import { createForegroundPriority, runLatestForeground } from '@/lib/latest-wins'
import { platformTransition } from '@/lib/platform-transition'
import type { CourseAnalyticsView, CourseFunnelView } from '@/lib/types'

/** Largura de barra segura (0–100%) — protege contra taxa fora da faixa nos dados. */
const clampPct = (n: number) => Math.max(0, Math.min(100, n))

export function AnalisesClient() {
  const [courses, setCourses] = useState<CourseAnalyticsView[]>([])
  // Seletor global: as análises mostram só a plataforma ativa (filtro client-side —
  // a view já traz `audience`; o funil abre por curso, então nada muda no server).
  const platform = usePlatform()
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [funnelFailed, setFunnelFailed] = useState(false)
  const [selected, setSelected] = useState<CourseAnalyticsView | null>(null)
  const [funnel, setFunnel] = useState<CourseFunnelView | null>(null)
  const [funnelLoading, setFunnelLoading] = useState(false)
  const funnelAuthority = useRef(createForegroundPriority()).current

  useEffect(() => {
    funnelAuthority.invalidate()
    const transition = platformTransition(platform).analytics
    if (transition.selectedCourseId === null) setSelected(null)
    setFunnel(null)
    setFunnelLoading(false)
  }, [platform, funnelAuthority])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ courses: CourseAnalyticsView[] }>('/api/members/analytics/courses')
      setCourses(res.courses)
      setLoadFailed(false)
    } catch (err) {
      setLoadFailed(true)
      toast.error((err as ApiError).message ?? 'Não conseguimos carregar as análises.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openFunnel(c: CourseAnalyticsView) {
    setSelected(c)
    setFunnel(null)
    setFunnelFailed(false)
    setFunnelLoading(true)
    await runLatestForeground(
      funnelAuthority,
      () => apiGet<CourseFunnelView>(`/api/members/analytics/courses/${c.courseId}`),
      {
        onSuccess: setFunnel,
        onError: (error) => {
          setFunnelFailed(true)
          toast.error((error as ApiError).message ?? 'Não conseguimos carregar o funil.')
        },
        onSettled: () => setFunnelLoading(false),
      },
    )
  }

  const visibleCourses = courses.filter((c) => c.audience === platform)

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Alunos"
        description="Quantos começaram e quantos terminaram cada curso, e em que aula a turma mais para."
      />
      <AlunosTabs />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Aulas</TableHead>
                <TableHead>Engajaram</TableHead>
                <TableHead>Concluíram</TableHead>
                <TableHead className="w-48">Taxa de conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows columns={5} />
              ) : loadFailed ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <LoadError what="as análises" onRetry={() => void load()} />
                  </TableCell>
                </TableRow>
              ) : visibleCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      zappy="happy"
                      title="Nenhum curso publicado ainda."
                      description="Quando um curso for publicado, a conclusão dele aparece aqui."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                visibleCourses.map((c) => (
                  <TableRow
                    key={c.courseId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openFunnel(c)}
                  >
                    <TableCell>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-muted-foreground text-xs">
                        {c.courseRef}
                        {c.status === 'archived' ? ' · Arquivado' : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.publishedLessons}</TableCell>
                    <TableCell className="text-muted-foreground">{c.started}</TableCell>
                    <TableCell className="text-muted-foreground">{c.completed}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-[color:var(--primary)]"
                            style={{ width: `${clampPct(c.completionRate)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-muted-foreground text-xs">
                          {c.completionRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {selected ? (
          <Card className="space-y-4 p-5 xl:sticky xl:top-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">Funil de aulas · {selected.title}</h2>
                {funnel ? (
                  <p className="text-muted-foreground text-sm">
                    {funnel.started} engajaram · {funnel.completed} concluíram
                  </p>
                ) : null}
              </div>
            </div>
            {funnelLoading ? (
              <Spinner className="mx-auto" />
            ) : funnelFailed ? (
              <LoadError what="o funil" onRetry={() => void openFunnel(selected)} />
            ) : !funnel || funnel.lessons.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Este curso ainda não tem aulas publicadas.
              </p>
            ) : (
              <Funnel funnel={funnel} />
            )}
          </Card>
        ) : (
          <Card className="p-5 text-muted-foreground text-sm">
            Escolha um curso na tabela para ver em que aula a turma mais para.
          </Card>
        )}
      </div>
    </div>
  )
}

/** Barras de conclusão por aula (escala = quem engajou); marca a maior queda. */
function Funnel({ funnel }: { funnel: CourseFunnelView }) {
  const base = Math.max(funnel.started, 1)
  // Maior queda no funil (gargalo) — inclui a 1ª aula (engajaram → aula 1), não só pares de
  // aulas consecutivas; destaca a aula onde mais gente parou.
  let worstDropIndex = -1
  let worstDrop = 0
  let prev = funnel.started
  for (let i = 0; i < funnel.lessons.length; i++) {
    const current = funnel.lessons[i]?.completions ?? 0
    const drop = prev - current
    if (drop > worstDrop) {
      worstDrop = drop
      worstDropIndex = i
    }
    prev = current
  }
  return (
    <div className="space-y-3">
      {funnel.lessons.map((l, i) => {
        const pct = Math.round((l.completions / base) * 100)
        const isBottleneck = i === worstDropIndex
        return (
          <div key={l.lessonId} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                <span className="text-muted-foreground">{l.moduleTitle} · </span>
                {l.title}
                {isBottleneck ? (
                  <Badge variant="destructive" className="ml-2">
                    <TrendingDown className="size-3" /> maior queda (−{worstDrop})
                  </Badge>
                ) : null}
              </span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {l.completions} ({pct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${isBottleneck ? 'bg-destructive' : 'bg-[color:var(--primary)]'}`}
                style={{ width: `${clampPct(pct)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
