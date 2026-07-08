'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Inbox, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
// Viewer compartilhado com a aba "Entregas" do editor de curso (mesma tela de
// correção; vive lá porque nasceu lá — mover é limpeza futura, o arquivo irmão
// `teacher-thread-panel` tem WIP concorrente).
import { StudioSubmissionViewer } from '@/app/admin/membros/cursos/[courseId]/studio-submission-viewer'
import { AdminHeader } from '@/components/admin/admin-header'
import { type ApiError, apiGet } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { CourseView, Paginated, StudioSubmissionQueueRow } from '@/lib/types'

const PAGE = 30

/** Nome de exibição do aluno: a criança (perfil) no kids; o titular no adulto. */
function studentNameOf(s: StudioSubmissionQueueRow): string {
  return s.childName || s.accountName || 'Aluno'
}

/**
 * Fila unificada de entregas do Estúdio (Sala do Professor → Entregas): TODOS os
 * cursos numa lista só, PENDENTES primeiro (sem resposta do professor após o
 * último envio — um reenvio reabre a pendência). Abrir usa o mesmo viewer da aba
 * de entregas do curso (Estúdio embutido + conversa com o aluno).
 */
export function EntregasClient() {
  const [items, setItems] = useState<StudioSubmissionQueueRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [courseId, setCourseId] = useState('')
  const [audience, setAudience] = useState('')
  const [status, setStatus] = useState('')
  const [courses, setCourses] = useState<CourseView[]>([])
  const [open, setOpen] = useState<StudioSubmissionQueueRow | null>(null)

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(nextOffset) })
        if (courseId) params.set('courseId', courseId)
        if (audience) params.set('audience', audience)
        if (status) params.set('status', status)
        const res = await apiGet<{ items: StudioSubmissionQueueRow[]; total: number }>(
          `/api/members/studio-submissions?${params}`,
        )
        setItems((prev) => (append ? [...prev, ...res.items] : res.items))
        setTotal(res.total)
        setOffset(nextOffset)
      } catch (err) {
        toast.error((err as ApiError).message ?? 'Falha ao carregar as entregas.')
      } finally {
        setLoading(false)
      }
    },
    [courseId, audience, status],
  )

  useEffect(() => {
    load(0, false)
  }, [load])

  // Cursos p/ o filtro (best-effort).
  useEffect(() => {
    apiGet<Paginated<CourseView>>('/api/members/courses?limit=100')
      .then((res) => setCourses(res.items))
      .catch(() => {})
  }, [])

  const pendingCount = items.filter((i) => !i.answered).length

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Entregas"
        description="Fila unificada de entregas do Estúdio, de todos os cursos — pendentes primeiro."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Curso" htmlFor="ent-course">
          <Select id="ent-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Todos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plataforma" htmlFor="ent-audience">
          <Select id="ent-audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="">Todas</option>
            <option value="kids">Kids</option>
            <option value="adult">Adultos</option>
          </Select>
        </Field>
        <Field label="Situação" htmlFor="ent-status">
          <Select id="ent-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas</option>
            <option value="pending">Pendentes</option>
            <option value="answered">Respondidas</option>
          </Select>
        </Field>
        {!loading && items.length > 0 ? (
          <p className="pb-2 text-xs text-muted-foreground">
            {total} entregas{pendingCount > 0 ? ` · ${pendingCount} pendentes nesta página` : ''}
          </p>
        ) : null}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Inbox className="mx-auto mb-2 size-6" />
          Nenhuma entrega com estes filtros.
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={`${s.userId}:${s.blockId}`}>
              <button
                onClick={() => setOpen(s)}
                className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`truncate text-sm ${s.answered ? 'font-medium' : 'font-semibold'}`}
                  >
                    {studentNameOf(s)}
                  </span>
                  {s.childName && s.accountName ? (
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      resp.: {s.accountName}
                    </span>
                  ) : null}
                  {s.answered ? (
                    <Badge variant="success">Respondida</Badge>
                  ) : (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                  {s.message ? (
                    <Badge variant="outline">
                      <MessageSquare className="size-3" /> Recado
                    </Badge>
                  ) : null}
                  {s.score !== null ? (
                    <span className={`text-xs ${s.passed ? 'text-success' : 'text-destructive'}`}>
                      {s.score}/100
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDate(s.submittedAt)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {s.courseTitle} · {s.moduleTitle} · {s.lessonTitle}
                  <span className="ml-2">{s.audience === 'kids' ? 'Kids' : 'Adulto'}</span>
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length < total ? (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loading} onClick={() => load(offset + PAGE, true)}>
            Carregar mais ({items.length} de {total})
          </Button>
        </div>
      ) : null}

      {open ? (
        <StudioSubmissionViewer
          open
          onClose={() => {
            setOpen(null)
            // O professor pode ter respondido — recarrega p/ atualizar a pendência.
            load(0, false)
          }}
          blockId={open.blockId}
          userId={open.userId}
          studentName={studentNameOf(open)}
          responsible={open.childName ? open.accountName : null}
          audience={open.audience}
          courseId={open.courseId}
          lessonId={open.lessonId}
          lessonTitle={open.lessonTitle}
        />
      ) : null}
    </div>
  )
}
