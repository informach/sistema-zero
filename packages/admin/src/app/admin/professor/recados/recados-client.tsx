'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Switch } from '@sistemazero/ui/switch'
import { MailCheck, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  type CommunityScope,
  CommunityScopeSelect,
} from '@/components/admin/community-scope-select'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { usePlatform } from '@/components/admin/platform-provider'
import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { useConfirm } from '@/components/admin/use-confirm'
import { MoreMenu } from '@/components/professor/more-menu'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { createForegroundPriority, runLatestForeground } from '@/lib/latest-wins'
import { COMMUNITY_NAMES, PLATFORM_LABELS, type Platform } from '@/lib/platform'
import { platformTransition } from '@/lib/platform-transition'
import { threadSubject } from '@/lib/teacher-thread-subject'
import type { CourseView, Paginated, TeacherThreadRow, TeacherThreadView } from '@/lib/types'
import { BroadcastPanel } from './broadcast-panel'
import { CONTEXT_LABELS, CONTEXTS, WORKFLOW_STATUSES, workflowLabel } from './recados-copy'
import { ThreadDialog } from './thread-dialog'

const PAGE = 30

/** Nome de exibição: a criança (perfil) no Kids; o titular no Adultos. */
export function studentNameOf(t: TeacherThreadRow): string {
  return t.childName || t.accountName || (t.audience === 'kids' ? 'Criança' : 'Aluno')
}

const DESCRIPTION: Record<Platform, string> = {
  kids: 'Recados com as crianças e os responsáveis. Os que você ainda não leu vêm primeiro.',
  adult: 'Recados com os alunos. Os que você ainda não leu vêm primeiro.',
}
const DESCRIPTION_BOTH = 'Recados das duas comunidades. Os que você ainda não leu vêm primeiro.'

/**
 * Recados (Turma → Recados): TODOS os recados com a comunidade da lente (projetos, dúvidas na
 * aula, Mural e recados gerais) sem precisar navegar até o curso. Os não lidos vêm primeiro;
 * abrir marca como lido e permite responder. `?abrir=<id>` abre um direto (o link da Home).
 */
export function RecadosClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [threads, setThreads] = useState<TeacherThreadRow[]>([])
  const [loading, setLoading] = useState(true)
  /** A última leitura falhou: a lista diz que não carregou, em vez de parecer vazia. */
  const [loadFailed, setLoadFailed] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [context, setContext] = useState('')
  const [workflowStatus, setWorkflowStatus] = useState('')
  // A lista nasce na LENTE (Kids/Adultos) do cabeçalho; o filtro "Comunidade" junta as duas
  // ('' = sem filtro de audiência) e volta para a lente quando ela muda.
  const platform = usePlatform()
  const [audience, setAudience] = useState<CommunityScope>(platform)
  const loadAuthority = useRef(createForegroundPriority()).current
  const [courseId, setCourseId] = useState('')
  useEffect(() => {
    const transition = platformTransition(platform).teaching
    loadAuthority.invalidate()
    setAudience(transition.audience)
    setCourseId(transition.courseId)
    setOffset(0)
    setOpen(null)
  }, [platform, loadAuthority])
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [courses, setCourses] = useState<CourseView[]>([])
  /** O recado aberto; `name` null enquanto quem mandou ainda não é conhecido. */
  const [open, setOpen] = useState<{ id: string; name: string | null } | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const { confirm, confirmDialog } = useConfirm()
  /** Filtro por pessoa vindo da FICHA (`?userId=`), num chip removível. */
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
      await runLatestForeground(
        loadAuthority,
        () => {
          const params = new URLSearchParams({ limit: String(PAGE), offset: String(nextOffset) })
          if (context) params.set('context', context)
          if (workflowStatus) params.set('workflowStatus', workflowStatus)
          if (audience) params.set('audience', audience)
          if (courseId) params.set('courseId', courseId)
          if (unreadOnly) params.set('unread', 'true')
          if (studentFilter) params.set('userId', studentFilter)
          else if (qDebounced) params.set('q', qDebounced)
          return apiGet<{ threads: TeacherThreadRow[]; hint?: string }>(
            `/api/members/teacher-threads?${params}`,
          )
        },
        {
          onSuccess: (result) => {
            setThreads((previous) => (append ? [...previous, ...result.threads] : result.threads))
            setHasMore(result.threads.length === PAGE)
            setOffset(nextOffset)
            setLoadFailed(false)
            setHint(
              result.hint === 'refine'
                ? 'Encontramos muita gente. Digite mais do nome ou o e-mail.'
                : null,
            )
          },
          onError: (error) => {
            if (!append) setLoadFailed(true)
            toast.error((error as ApiError).message ?? 'Não conseguimos carregar os recados.')
          },
          onSettled: () => setLoading(false),
        },
      )
    },
    [
      context,
      workflowStatus,
      audience,
      courseId,
      unreadOnly,
      studentFilter,
      qDebounced,
      loadAuthority,
    ],
  )

  useEffect(() => {
    void load(0, false)
    return () => loadAuthority.invalidate()
  }, [load, loadAuthority])

  // Cursos p/ o filtro (best-effort — sem eles o filtro só não aparece populado).
  useEffect(() => {
    apiGet<Paginated<CourseView>>('/api/members/courses?limit=100')
      .then((res) => setCourses(res.items))
      .catch(() => {})
  }, [])

  // `?abrir=<id>` (o item da Home): abre ESTE recado. O nome da criança ou do aluno nunca vem
  // no endereço: sai da lista quando o recado está nela e, se não, dos recados de quem mandou,
  // procurados quando a conversa carrega (`resolveOpenName`). Depois tira o parâmetro do
  // endereço, para fechar não reabrir (e um `?nome=` de link antigo some junto).
  const openParam = searchParams.get('abrir')
  const handledOpen = useRef<string | null>(null)
  useEffect(() => {
    if (!openParam || handledOpen.current === openParam) return
    const row = threads.find((t) => t.id === openParam)
    if (!row && loading) return
    handledOpen.current = openParam
    setOpen({ id: openParam, name: row ? studentNameOf(row) : null })
    const next = new URLSearchParams(searchParams.toString())
    next.delete('abrir')
    next.delete('nome')
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [openParam, threads, loading, pathname, router, searchParams])

  /** Recado aberto fora da lista carregada: o nome vem dos recados de quem mandou. */
  const resolveOpenName = useCallback(
    (thread: TeacherThreadView) => {
      if (!open || open.id !== thread.id || open.name !== null) return
      const listed = threads.find((t) => t.id === thread.id)
      if (listed) {
        setOpen((current) =>
          current?.id === thread.id ? { ...current, name: studentNameOf(listed) } : current,
        )
        return
      }
      const params = new URLSearchParams({
        userId: thread.userId,
        audience: thread.audience,
        limit: String(PAGE),
        offset: '0',
      })
      apiGet<{ threads: TeacherThreadRow[] }>(`/api/members/teacher-threads?${params}`)
        .then((res) => {
          const row = res.threads.find((t) => t.id === thread.id)
          if (!row) return
          setOpen((current) =>
            current?.id === thread.id && current.name === null
              ? { ...current, name: studentNameOf(row) }
              : current,
          )
        })
        .catch(() => {})
    },
    [open, threads],
  )

  /** "Marcar todos como lidos" respeitando os filtros ativos (assunto/situação/curso/busca). */
  function markAllRead() {
    const scoped = Boolean(context || workflowStatus || courseId || studentFilter || qDebounced)
    confirm({
      title: 'Marcar todos como lidos?',
      message: scoped
        ? 'Os recados não lidos que aparecem com estes filtros vão ficar como lidos para você. Só a sua leitura muda: o resto da equipe continua vendo como antes.'
        : `Todos os recados não lidos ${audience ? `da ${COMMUNITY_NAMES[audience]}` : 'das duas comunidades'} vão ficar como lidos para você. Só a sua leitura muda: o resto da equipe continua vendo como antes.`,
      confirmText: 'Marcar como lidos',
      onConfirm: async () => {
        setMarkingAll(true)
        try {
          const res = await apiSend<{ updated: number }>(
            '/api/members/teacher-threads/read-all',
            'POST',
            {
              context: context || undefined,
              workflowStatus: workflowStatus || undefined,
              audience: audience || undefined,
              courseId: courseId || undefined,
              userId: studentFilter || undefined,
              q: studentFilter ? undefined : qDebounced || undefined,
            },
          )
          toast.success(
            res.updated === 0
              ? 'Nada para marcar: tudo já estava lido.'
              : `${res.updated} ${res.updated === 1 ? 'recado marcado como lido' : 'recados marcados como lidos'}.`,
          )
          load(0, false)
          refreshProfessorCounts()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não conseguimos marcar os recados como lidos.')
        } finally {
          setMarkingAll(false)
        }
      },
    })
  }

  const kids = platform === 'kids'
  const visibleCourses = audience ? courses.filter((c) => c.audience === audience) : courses
  /** Trocar o recorte não deixa um curso da outra comunidade escolhido (a lista ficaria vazia). */
  const changeScope = (scope: CommunityScope) => {
    setAudience(scope)
    if (scope && courses.some((c) => c.id === courseId && c.audience !== scope)) setCourseId('')
  }
  const filtered = Boolean(
    context || workflowStatus || courseId || unreadOnly || studentFilter || qDebounced,
  )

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Recados"
        description={audience ? DESCRIPTION[platform] : DESCRIPTION_BOTH}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {kids ? (
              <BroadcastPanel
                courses={courses}
                initialProfileId={
                  searchParams.get('compose') === '1'
                    ? (searchParams.get('userId') ?? undefined)
                    : undefined
                }
              />
            ) : null}
            <MoreMenu
              items={[
                {
                  label: 'Marcar todos como lidos',
                  icon: <MailCheck className="size-4" aria-hidden />,
                  onSelect: markAllRead,
                  disabled: markingAll || loading,
                },
              ]}
            />
          </div>
        }
      />

      {studentFilter ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium">
            {threads[0]
              ? `Mostrando só os recados de ${studentNameOf(threads[0])}`
              : kids
                ? 'Mostrando só os recados desta criança'
                : 'Mostrando só os recados deste aluno'}
            <button
              type="button"
              aria-label="Mostrar os recados de todo mundo"
              onClick={() => setStudentFilter(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label="Situação" htmlFor="rec-status">
          <Select
            id="rec-status"
            value={workflowStatus}
            onChange={(e) => setWorkflowStatus(e.target.value)}
          >
            <option value="">Todas</option>
            {WORKFLOW_STATUSES.map((value) => (
              <option key={value} value={value}>
                {workflowLabel(value, platform)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assunto" htmlFor="rec-context">
          <Select id="rec-context" value={context} onChange={(e) => setContext(e.target.value)}>
            <option value="">Todos</option>
            {CONTEXTS.map((value) => (
              <option key={value} value={value}>
                {CONTEXT_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <CommunityScopeSelect
          id="rec-community"
          platform={platform}
          value={audience}
          onChange={changeScope}
        />
        <Field label="Curso" htmlFor="rec-course">
          <Select id="rec-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Todos</option>
            {visibleCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        {!studentFilter ? (
          <Field
            label={kids ? 'Responsável' : 'Aluno'}
            htmlFor="rec-q"
            hint={
              kids
                ? 'Busque pelo nome ou e-mail de quem responde pela conta.'
                : 'Busque pelo nome ou e-mail.'
            }
          >
            <Input
              id="rec-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome ou e-mail"
            />
          </Field>
        ) : null}
        <label className="flex min-h-11 items-center gap-2 pb-1 text-[15px]">
          <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
          Só os não lidos
        </label>
      </div>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {confirmDialog}

      {loading && threads.length === 0 ? (
        <div className="space-y-2" role="status" aria-label="Carregando os recados">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : loadFailed && threads.length === 0 ? (
        <div className="rounded-[18px] border border-border bg-card">
          <LoadError what="os recados" onRetry={() => void load(0, false)} />
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-[18px] border border-border bg-card">
          {unreadOnly &&
          !context &&
          !workflowStatus &&
          !courseId &&
          !studentFilter &&
          !qDebounced ? (
            <EmptyState
              zappy="celebrating"
              title="Nenhum recado por ler."
              description="Você leu tudo o que chegou. Quando chegar um recado novo, ele aparece aqui."
            />
          ) : filtered ? (
            <EmptyState
              title="Nenhum recado com estes filtros."
              description="Tente outra situação, outro assunto ou outro curso."
            />
          ) : (
            <EmptyState
              zappy="happy"
              title="Nenhum recado ainda."
              description={
                kids
                  ? 'Quando uma criança mandar uma dúvida ou um projeto com recado, ele aparece aqui.'
                  : 'Quando um aluno mandar uma dúvida ou um projeto com recado, ele aparece aqui.'
              }
            />
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          {threads.map((t) => {
            const name = studentNameOf(t)
            const subject = threadSubject(t)
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setOpen({ id: t.id, name })}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    aria-hidden
                    className={`grid size-10 shrink-0 place-items-center rounded-full font-bold ${t.unread ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {name.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      {t.unread ? (
                        <span
                          className="size-2 shrink-0 rounded-full bg-primary"
                          role="status"
                          aria-label="Não lido"
                        />
                      ) : null}
                      <span className={`truncate ${t.unread ? 'font-bold' : 'font-medium'}`}>
                        {name}
                      </span>
                      {t.childName && t.accountName ? (
                        <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                          Responsável: {t.accountName}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {subject ? <span className="font-medium">{subject}</span> : null}
                      {subject && t.lastMessagePreview ? ': ' : null}
                      {t.lastMessagePreview ? (
                        <>
                          {t.lastMessageRole === 'teacher' ? 'Você: ' : ''}
                          {t.lastMessagePreview}
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      {!audience ? (
                        <Badge variant="muted">{PLATFORM_LABELS[t.audience]}</Badge>
                      ) : null}
                      <Badge variant="outline">{CONTEXT_LABELS[t.contextType]}</Badge>
                      {t.workflowStatus ? (
                        <Badge
                          variant={t.workflowStatus === 'waiting_teacher' ? 'warning' : 'muted'}
                        >
                          {workflowLabel(t.workflowStatus, t.audience)}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(t.lastMessageAt)} · {t.messageCount}{' '}
                      {t.messageCount === 1 ? 'mensagem' : 'mensagens'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
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
          studentName={open.name ?? (kids ? 'esta criança' : 'este aluno')}
          onLoaded={resolveOpenName}
          onClose={() => {
            setOpen(null)
            // Recarrega a página corrente: a leitura/resposta mudou o não lido e a prévia.
            load(0, false)
          }}
        />
      ) : null}
    </div>
  )
}
