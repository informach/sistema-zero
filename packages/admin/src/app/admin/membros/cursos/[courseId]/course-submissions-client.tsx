'use client'

import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet } from '@/lib/api'
import type { StudioSubmissionCourseRow } from '@/lib/types'
import { StudioSubmissionViewer } from './studio-submission-viewer'

// Mostra a CRIANÇA (perfil) quando a entrega veio de um perfil; senão a conta.
// Espelha o studio-submissions-dialog por-bloco (nunca expõe o uuid cru).
const studentName = (r: StudioSubmissionCourseRow) =>
  r.childName ?? r.accountName ?? r.accountEmail ?? 'Aluno sem identificação'
const responsibleLabel = (r: StudioSubmissionCourseRow) =>
  [r.accountName, r.accountEmail].filter(Boolean).join(' · ') || '—'

interface LessonGroup {
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  rows: StudioSubmissionCourseRow[]
}

/**
 * Aba "Entregas" do CURSO: centraliza as entregas do Estúdio de TODAS as aulas/alunos
 * num só lugar (sem drilar Curso→Módulo→Aula→bloco). Agrupa por aula (o backend já
 * ordena por módulo→aula→data) e abre cada entrega no viewer (com tela cheia).
 */
export function CourseSubmissionsPanel({
  courseId,
  audience,
}: {
  courseId: string
  /** Vitrine do curso — o recado ao aluno precisa nascer na vitrine certa (canal de retorno). */
  audience: 'adult' | 'kids'
}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<StudioSubmissionCourseRow[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StudioSubmissionCourseRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ submissions: StudioSubmissionCourseRow[] }>(
        `/api/members/courses/${courseId}/studio-submissions`,
      )
      setRows(res.submissions)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar as entregas.')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  // Agrupa por aula preservando a ordem do backend (módulo→aula→data). O filtro por
  // aluno/aula é aplicado ANTES do agrupamento (some a aula sem entrega correspondente).
  const groups = useMemo<LessonGroup[]>(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? rows.filter(
          (r) =>
            studentName(r).toLowerCase().includes(q) ||
            r.lessonTitle.toLowerCase().includes(q) ||
            r.moduleTitle.toLowerCase().includes(q),
        )
      : rows
    const out: LessonGroup[] = []
    for (const r of filtered) {
      const last = out[out.length - 1]
      if (last && last.lessonId === r.lessonId) last.rows.push(r)
      else
        out.push({
          lessonId: r.lessonId,
          lessonTitle: r.lessonTitle,
          moduleTitle: r.moduleTitle,
          rows: [r],
        })
    }
    return out
  }, [rows, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'entrega' : 'entregas'} de todas as aulas deste curso.
        </p>
        <Input
          aria-label="Filtrar por aluno ou aula"
          placeholder="Filtrar por aluno ou aula…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
      </div>

      {loading ? (
        <Card className="py-10 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted-foreground">
          Nenhum aluno enviou projeto do Estúdio neste curso ainda.
        </Card>
      ) : groups.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma entrega para "{search}".
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.lessonId} className="space-y-2">
              <div className="text-sm font-medium">
                {g.lessonTitle}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {g.moduleTitle}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {g.rows.map((r) => (
                  <Card
                    key={`${r.blockId}:${r.userId}`}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{studentName(r)}</span>
                        {r.score !== null ? (
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                              r.passed
                                ? 'bg-success/15 text-success-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {r.score}/100
                          </span>
                        ) : null}
                      </div>
                      {r.childName ? (
                        <div className="truncate text-xs text-muted-foreground">
                          Responsável: {responsibleLabel(r)}
                        </div>
                      ) : null}
                      <div className="truncate text-xs text-muted-foreground">
                        Enviado em {new Date(r.submittedAt).toLocaleString('pt-BR')}
                      </div>
                      {r.message ? (
                        <div className="mt-0.5 flex items-center gap-1 text-foreground text-xs">
                          <MessageSquare className="size-3 shrink-0" /> Deixou um recado
                        </div>
                      ) : null}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelected(r)}>
                      <ArrowLeft className="size-4 rotate-180" /> Abrir no estúdio
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected ? (
        <StudioSubmissionViewer
          open
          onClose={() => setSelected(null)}
          blockId={selected.blockId}
          userId={selected.userId}
          studentName={studentName(selected)}
          responsible={selected.childName ? responsibleLabel(selected) : null}
          audience={audience}
          courseId={courseId}
          lessonId={selected.lessonId}
          lessonTitle={selected.lessonTitle}
        />
      ) : null}
    </div>
  )
}
