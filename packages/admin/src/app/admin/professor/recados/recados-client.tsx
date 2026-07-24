'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Switch } from '@sistemazero/ui/switch'
import { Mail } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { type ApiError, apiGet } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { CourseView, Paginated, TeacherThreadContext, TeacherThreadRow } from '@/lib/types'
import { ThreadDialog } from './thread-dialog'

const PAGE = 30

const CONTEXT_LABELS: Record<TeacherThreadContext, string> = {
  studio_submission: 'Entrega',
  mural_publication: 'Mural',
  general: 'Recado',
}

/** Nome de exibição do aluno: a criança (perfil) no kids; o titular no adulto. */
export function studentNameOf(t: TeacherThreadRow): string {
  return t.childName || t.accountName || 'Aluno'
}

/**
 * Caixa de entrada do professor (Sala do Professor → Recados): TODAS as conversas
 * com alunos — entregas do Estúdio, moderação do Mural e recados gerais — sem
 * precisar navegar até o curso. Não-lidas vêm primeiro; abrir a conversa marca
 * como lida e permite responder.
 */
export function RecadosClient() {
  const [threads, setThreads] = useState<TeacherThreadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [context, setContext] = useState('')
  const [audience, setAudience] = useState('')
  const [courseId, setCourseId] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [courses, setCourses] = useState<CourseView[]>([])
  const [open, setOpen] = useState<TeacherThreadRow | null>(null)

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(nextOffset) })
        if (context) params.set('context', context)
        if (audience) params.set('audience', audience)
        if (courseId) params.set('courseId', courseId)
        if (unreadOnly) params.set('unread', 'true')
        const res = await apiGet<{ threads: TeacherThreadRow[] }>(
          `/api/members/teacher-threads?${params}`,
        )
        setThreads((prev) => (append ? [...prev, ...res.threads] : res.threads))
        setHasMore(res.threads.length === PAGE)
        setOffset(nextOffset)
      } catch (err) {
        toast.error((err as ApiError).message ?? 'Falha ao carregar os recados.')
      } finally {
        setLoading(false)
      }
    },
    [context, audience, courseId, unreadOnly],
  )

  useEffect(() => {
    load(0, false)
  }, [load])

  // Cursos p/ o filtro (best-effort — sem eles o filtro só não aparece populado).
  useEffect(() => {
    apiGet<Paginated<CourseView>>('/api/members/courses?limit=100')
      .then((res) => setCourses(res.items))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Recados"
        description="Conversas com os alunos — entregas, Mural e recados gerais. Não-lidas primeiro."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Contexto" htmlFor="rec-context">
          <Select id="rec-context" value={context} onChange={(e) => setContext(e.target.value)}>
            <option value="">Todos</option>
            <option value="studio_submission">Entrega</option>
            <option value="mural_publication">Mural</option>
            <option value="general">Recado geral</option>
          </Select>
        </Field>
        <Field label="Plataforma" htmlFor="rec-audience">
          <Select id="rec-audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="">Todas</option>
            <option value="kids">Kids</option>
            <option value="adult">Adultos</option>
          </Select>
        </Field>
        <Field label="Curso" htmlFor="rec-course">
          <Select id="rec-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Todos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
          Só não-lidas
        </label>
      </div>

      {loading && threads.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : threads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Mail className="mx-auto mb-2 size-6" />
          Nenhuma conversa por aqui{unreadOnly ? ' (sem não-lidas)' : ''}.
        </Card>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setOpen(t)}
                className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {t.unread ? (
                    <span
                      className="size-2 shrink-0 rounded-full bg-primary"
                      role="status"
                      aria-label="Não lida"
                    />
                  ) : null}
                  <span
                    className={`truncate text-sm ${t.unread ? 'font-semibold' : 'font-medium'}`}
                  >
                    {studentNameOf(t)}
                  </span>
                  {t.childName && t.accountName ? (
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      resp.: {t.accountName}
                    </span>
                  ) : null}
                  <Badge variant="outline">{CONTEXT_LABELS[t.contextType]}</Badge>
                  <Badge variant="outline">{t.audience === 'kids' ? 'Kids' : 'Adulto'}</Badge>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDate(t.lastMessageAt)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {t.title ? <span className="truncate font-medium">{t.title}</span> : null}
                  {t.lastMessagePreview ? (
                    <span className="truncate">
                      {t.lastMessageRole === 'teacher' ? 'Você: ' : ''}
                      {t.lastMessagePreview}
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0">
                    {t.messageCount} {t.messageCount === 1 ? 'mensagem' : 'mensagens'}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loading} onClick={() => load(offset + PAGE, true)}>
            Carregar mais
          </Button>
        </div>
      ) : null}

      {open ? (
        <ThreadDialog
          threadId={open.id}
          studentName={studentNameOf(open)}
          onClose={() => {
            setOpen(null)
            // Recarrega a página corrente — o read/resposta mudou unread/preview.
            load(0, false)
          }}
        />
      ) : null}
    </div>
  )
}
