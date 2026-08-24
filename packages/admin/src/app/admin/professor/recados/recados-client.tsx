'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Switch } from '@sistemazero/ui/switch'
import { Mail, MailCheck, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { usePlatform } from '@/components/admin/platform-store'
import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
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
  const searchParams = useSearchParams()
  const [threads, setThreads] = useState<TeacherThreadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [context, setContext] = useState('')
  // Filtro "Plataforma" nasce na plataforma ATIVA do seletor global e re-sincroniza
  // quando ele muda; o Select local segue como override pontual ("Todas"/a outra).
  const platform = usePlatform()
  const [audience, setAudience] = useState<string>(platform)
  useEffect(() => {
    setAudience(platform)
  }, [platform])
  const [courseId, setCourseId] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [courses, setCourses] = useState<CourseView[]>([])
  const [open, setOpen] = useState<TeacherThreadRow | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const { confirm, confirmDialog } = useConfirm()
  /** Filtro por aluno vindo da FICHA (`?userId=`) — chip removível. */
  const [studentFilter, setStudentFilter] = useState<string | null>(
    () => searchParams.get('userId') || null,
  )
  // Busca livre por RESPONSÁVEL (nome/e-mail, resolvida no auth) com debounce.
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(nextOffset) })
        if (context) params.set('context', context)
        if (audience) params.set('audience', audience)
        if (courseId) params.set('courseId', courseId)
        if (unreadOnly) params.set('unread', 'true')
        if (studentFilter) params.set('userId', studentFilter)
        else if (qDebounced) params.set('q', qDebounced)
        const res = await apiGet<{ threads: TeacherThreadRow[]; hint?: string }>(
          `/api/members/teacher-threads?${params}`,
        )
        setThreads((prev) => (append ? [...prev, ...res.threads] : res.threads))
        setHasMore(res.threads.length === PAGE)
        setOffset(nextOffset)
        setHint(res.hint === 'refine' ? 'Muitos resultados no auth — refine a busca.' : null)
      } catch (err) {
        toast.error((err as ApiError).message ?? 'Falha ao carregar os recados.')
      } finally {
        setLoading(false)
      }
    },
    [context, audience, courseId, unreadOnly, studentFilter, qDebounced],
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

  /** "Marcar todas como lidas" respeitando os filtros ativos (contexto/plataforma/curso). */
  function markAllRead() {
    const scoped = Boolean(context || audience || courseId)
    confirm({
      title: 'Marcar todas como lidas?',
      message: scoped
        ? 'Todas as conversas não-lidas DOS FILTROS ATUAIS serão marcadas como lidas para você.'
        : 'Todas as conversas não-lidas serão marcadas como lidas para você (só a sua leitura — outros professores não são afetados).',
      confirmText: 'Marcar como lidas',
      onConfirm: async () => {
        setMarkingAll(true)
        try {
          const res = await apiSend<{ updated: number }>(
            '/api/members/teacher-threads/read-all',
            'POST',
            {
              context: context || undefined,
              audience: audience || undefined,
              courseId: courseId || undefined,
            },
          )
          toast.success(
            res.updated === 0
              ? 'Nada a marcar — tudo lido por aqui.'
              : `${res.updated} conversa${res.updated === 1 ? '' : 's'} marcada${res.updated === 1 ? '' : 's'} como lida.`,
          )
          load(0, false)
          refreshProfessorCounts()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não consegui marcar as conversas.')
        } finally {
          setMarkingAll(false)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Recados"
        description="Conversas com os alunos — entregas, Mural e recados gerais. Não-lidas primeiro."
      />

      {studentFilter ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
            Filtrando por aluno{threads[0] ? `: ${studentNameOf(threads[0])}` : ''}
            <button
              type="button"
              aria-label="Remover o filtro por aluno"
              onClick={() => setStudentFilter(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {!studentFilter ? (
          <Field label="Aluno" htmlFor="rec-q" hint="Busque pelo responsável (nome ou e-mail).">
            <Input
              id="rec-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome ou e-mail…"
            />
          </Field>
        ) : null}
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
        <Button
          variant="outline"
          size="sm"
          className="mb-1.5 sm:ml-auto"
          disabled={markingAll || loading}
          onClick={markAllRead}
        >
          <MailCheck className="size-4" /> Marcar todas como lidas
        </Button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {confirmDialog}

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
