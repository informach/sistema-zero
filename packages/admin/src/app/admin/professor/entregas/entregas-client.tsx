'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { MessageSquare, X } from 'lucide-react'
// Viewer compartilhado com a aba de projetos do editor de curso (mesma tela de
// correção; vive lá porque nasceu lá — mover é limpeza futura, o arquivo irmão
// `teacher-thread-panel` tem WIP concorrente).
import dynamic from 'next/dynamic'
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

// LAZY de propósito, e não só por peso: o viewer (e os embeds do Estúdio/Pinta
// atrás dele) só carrega quando um projeto ABRE — a fila lista sem pagar o
// chunk. Também mantém o módulo do viewer fora de qualquer processo de teste
// que venha a carregar a fila: `mock.module` não religa módulo já materializado
// (vermelhos de 21/08, só no Linux do CI).
const StudioSubmissionViewer = dynamic(
  () =>
    import('@/app/admin/membros/cursos/[courseId]/studio-submission-viewer').then(
      (m) => m.StudioSubmissionViewer,
    ),
  { ssr: false },
)

import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { SpokenChip } from '@/components/admin/spoken-chip'
import { type ApiError, apiGet } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { canBackgroundRefreshPage, createForegroundPriority } from '@/lib/latest-wins'
import { BOTH_COMMUNITIES_LABEL, PLATFORM_LABELS, type Platform } from '@/lib/platform'
import { platformTransition } from '@/lib/platform-transition'
import {
  isSubmissionPending,
  SUBMISSION_STATUS_LABEL,
  submissionStatus,
} from '@/lib/submission-status'
import type { CourseView, Paginated, StudioSubmissionQueueRow } from '@/lib/types'

const PAGE = 30
const VISIBLE_REFRESH_MS = 15_000

/** Nome de exibição: a criança (perfil) no Kids; o titular no Adultos. */
function studentNameOf(s: StudioSubmissionQueueRow): string {
  return s.childName || s.accountName || (s.audience === 'kids' ? 'Criança' : 'Aluno')
}

const submissionKey = (s: Pick<StudioSubmissionQueueRow, 'userId' | 'blockId'>) =>
  `${s.userId}:${s.blockId}`

/** `?abrir=<userId>:<blockId>` (o link da Home): o projeto que a tela abre sozinha. */
export function parseOpenSubmission(
  value: string | null,
): { userId: string; blockId: string } | null {
  if (!value) return null
  const at = value.indexOf(':')
  if (at <= 0 || at === value.length - 1) return null
  return { userId: value.slice(0, at), blockId: value.slice(at + 1) }
}

const DESCRIPTION: Record<Platform, string> = {
  kids: 'Os projetos do Estúdio e os desenhos do Pinta que as crianças enviaram. Os que esperam a equipe vêm primeiro.',
  adult:
    'Os projetos do Estúdio e os desenhos do Pinta que os alunos enviaram. Os que esperam a equipe vêm primeiro.',
}
const DESCRIPTION_BOTH =
  'Os projetos do Estúdio e os desenhos do Pinta das duas comunidades. Os que esperam a equipe vêm primeiro.'

/**
 * Projetos (Turma → Projetos): os projetos do Estúdio e os desenhos do Pinta de TODOS os cursos
 * da comunidade da lente numa lista só, os que esperam a equipe primeiro (sem resposta nem
 * visto depois do último envio; um reenvio volta a esperar). Abrir usa o mesmo viewer da aba de
 * projetos do curso (Estúdio embutido + recados com quem enviou). `?abrir=` abre um direto.
 */
export function EntregasClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [items, setItems] = useState<StudioSubmissionQueueRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  /** A última leitura em primeiro plano falhou: a lista diz que não carregou, não que está vazia. */
  const [loadFailed, setLoadFailed] = useState(false)
  const [courseId, setCourseId] = useState('')
  // A lista nasce na LENTE (Kids/Adultos) do cabeçalho; o filtro "Comunidade" junta as duas
  // ('' = sem filtro de audiência) e volta para a lente quando ela muda.
  const platform = usePlatform()
  const [audience, setAudience] = useState<CommunityScope>(platform)
  const [status, setStatus] = useState('')
  const [courses, setCourses] = useState<CourseView[]>([])
  const [open, setOpen] = useState<StudioSubmissionQueueRow | null>(null)
  /** Total dos que esperam a equipe no escopo curso/lente (null = indisponível). */
  const [pendingTotal, setPendingTotal] = useState<number | null>(null)
  /** Filtro por pessoa vindo da FICHA (`?userId=`), num chip removível. */
  const [studentFilter, setStudentFilter] = useState<string | null>(
    () => searchParams.get('userId') || null,
  )
  // Busca livre por RESPONSÁVEL (nome/e-mail, resolvida no auth) com debounce.
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const offsetRef = useRef(offset)
  offsetRef.current = offset
  // Filtros/paginação seguem latest-wins. Polling tem autoridade separada:
  // nunca cancela uma ação do operador nem publica depois que uma começou.
  const loadAuthority = useRef(createForegroundPriority()).current
  useEffect(() => {
    const transition = platformTransition(platform).teaching
    loadAuthority.invalidate()
    setAudience(transition.audience)
    setCourseId(transition.courseId)
    setOffset(0)
    setOpen(null)
  }, [platform, loadAuthority])
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(
    async (nextOffset: number, append: boolean, background = false) => {
      // Depois de carregar páginas adicionais, congelamos o polling silencioso:
      // substituir só a primeira página reordenaria/encolheria a lista; buscar
      // tudo a cada 15 s seria custo crescente. Filtro novo volta ao offset 0.
      if (background && !canBackgroundRefreshPage(offsetRef.current)) return
      const ticket = background ? loadAuthority.beginBackground() : loadAuthority.beginForeground()
      if (!ticket) return
      if (!background) setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(nextOffset) })
        if (courseId) params.set('courseId', courseId)
        if (audience) params.set('audience', audience)
        if (status) params.set('status', status)
        if (studentFilter) params.set('userId', studentFilter)
        else if (qDebounced) params.set('q', qDebounced)
        const res = await apiGet<{
          items: StudioSubmissionQueueRow[]
          total: number
          hint?: string
        }>(`/api/members/studio-submissions?${params}`)
        if (!loadAuthority.canPublish(ticket)) {
          loadAuthority.finish(ticket)
          return
        }
        setItems((prev) => (append ? [...prev, ...res.items] : res.items))
        setTotal(res.total)
        offsetRef.current = nextOffset
        setOffset(nextOffset)
        setLoadFailed(false)
        setHint(
          res.hint === 'refine'
            ? 'Encontramos muita gente. Digite mais do nome ou o e-mail.'
            : null,
        )
      } catch (err) {
        if (loadAuthority.canPublish(ticket) && !background) {
          if (!append) setLoadFailed(true)
          toast.error((err as ApiError).message ?? 'Não conseguimos carregar os projetos.')
        }
        if (!loadAuthority.canPublish(ticket)) {
          loadAuthority.finish(ticket)
          return
        }
      }
      if (loadAuthority.canPublish(ticket)) {
        // Total dos que ESPERAM A EQUIPE no escopo curso/lente (independente da página e do
        // filtro de situação): o `total` da fila com status=pending, em paralelo.
        try {
          const pendingParams = new URLSearchParams({ status: 'pending', limit: '1' })
          if (courseId) pendingParams.set('courseId', courseId)
          if (audience) pendingParams.set('audience', audience)
          const pending = await apiGet<{ total: number }>(
            `/api/members/studio-submissions?${pendingParams}`,
          )
          if (loadAuthority.canPublish(ticket)) setPendingTotal(pending.total)
        } catch {
          if (loadAuthority.canPublish(ticket)) setPendingTotal(null)
        }
      }
      loadAuthority.finish(ticket)
      if (!background && loadAuthority.canPublish(ticket)) setLoading(false)
    },
    [courseId, audience, status, studentFilter, qDebounced, loadAuthority],
  )

  useEffect(() => {
    load(0, false)
  }, [load])

  useEffect(
    () => () => {
      // Invalida respostas que terminem depois do unmount.
      loadAuthority.invalidate()
    },
    [loadAuthority],
  )

  // A fila também muda por ação de quem envia, fora deste browser. Enquanto a tela
  // estiver visível, atualiza silenciosamente; voltar à janela força uma leitura
  // imediata. Pausa com o viewer aberto para não trocar a fila sob a correção.
  useEffect(() => {
    if (open) return
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(0, false, true)
    }
    const interval = window.setInterval(refresh, VISIBLE_REFRESH_MS)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load, open])

  // Cursos p/ o filtro (best-effort).
  useEffect(() => {
    apiGet<Paginated<CourseView>>('/api/members/courses?limit=100')
      .then((res) => setCourses(res.items))
      .catch(() => {})
  }, [])

  // `?abrir=` (o item da Home): abre ESTE projeto. Procura na página carregada; se não estiver
  // nela, pede os projetos de quem enviou (a mesma fila, filtrada por pessoa). Depois tira o
  // parâmetro do endereço, para fechar o viewer não reabrir o projeto.
  const openParam = searchParams.get('abrir')
  const handledOpen = useRef<string | null>(null)
  useEffect(() => {
    const target = parseOpenSubmission(openParam)
    if (!openParam || !target || handledOpen.current === openParam) return
    const clearParam = () => {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('abrir')
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
    const found = items.find((s) => submissionKey(s) === openParam)
    if (found) {
      handledOpen.current = openParam
      setOpen(found)
      clearParam()
      return
    }
    if (loading) return
    handledOpen.current = openParam
    const params = new URLSearchParams({ userId: target.userId, limit: String(PAGE), offset: '0' })
    if (audience) params.set('audience', audience)
    apiGet<{ items: StudioSubmissionQueueRow[] }>(`/api/members/studio-submissions?${params}`)
      .then((res) => {
        const match = res.items.find((s) => s.blockId === target.blockId)
        if (match) setOpen(match)
        else toast.error('Não encontramos este projeto. Ele pode ser da outra comunidade.')
      })
      .catch((err) => {
        toast.error((err as ApiError).message ?? 'Não conseguimos abrir este projeto.')
      })
      .finally(clearParam)
  }, [openParam, items, loading, audience, pathname, router, searchParams])

  // Próximo projeto ESPERANDO depois do aberto (a fila circula: acabou → volta ao
  // topo). Alimenta o botão "Próximo esperando" do viewer.
  const nextPending = (() => {
    if (!open) return null
    const start = items.findIndex((s) => submissionKey(s) === submissionKey(open))
    for (let step = 1; step <= items.length; step++) {
      const candidate = items[(start + step) % items.length]
      if (
        candidate &&
        isSubmissionPending(candidate) &&
        submissionKey(candidate) !== submissionKey(open)
      ) {
        return candidate
      }
    }
    return null
  })()

  const kids = platform === 'kids'
  const visibleCourses = audience ? courses.filter((c) => c.audience === audience) : courses
  /** Trocar o recorte não deixa um curso da outra comunidade escolhido (a lista ficaria vazia). */
  const changeScope = (scope: CommunityScope) => {
    setAudience(scope)
    if (scope && courses.some((c) => c.id === courseId && c.audience !== scope)) setCourseId('')
  }
  const filtered = Boolean(status || courseId || studentFilter || qDebounced)

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Projetos"
        description={audience ? DESCRIPTION[platform] : DESCRIPTION_BOTH}
        community={audience ? true : BOTH_COMMUNITIES_LABEL}
      />

      {studentFilter ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium">
            {items[0]
              ? `Mostrando só os projetos de ${studentNameOf(items[0])}`
              : kids
                ? 'Mostrando só os projetos desta criança'
                : 'Mostrando só os projetos deste aluno'}
            <button
              type="button"
              aria-label="Mostrar os projetos de todo mundo"
              onClick={() => setStudentFilter(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {!studentFilter ? (
          <Field
            label={kids ? 'Responsável' : 'Aluno'}
            htmlFor="ent-q"
            hint={
              kids
                ? 'Busque pelo nome ou e-mail de quem responde pela conta.'
                : 'Busque pelo nome ou e-mail.'
            }
          >
            <Input
              id="ent-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome ou e-mail"
            />
          </Field>
        ) : null}
        <CommunityScopeSelect
          id="ent-community"
          platform={platform}
          value={audience}
          onChange={changeScope}
        />
        <Field label="Curso" htmlFor="ent-course">
          <Select id="ent-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Todos</option>
            {visibleCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Situação" htmlFor="ent-status">
          <Select id="ent-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas</option>
            <option value="pending">{SUBMISSION_STATUS_LABEL.pending}</option>
            <option value="answered">{SUBMISSION_STATUS_LABEL.answered}</option>
            <option value="reviewed">{SUBMISSION_STATUS_LABEL.reviewed}</option>
          </Select>
        </Field>
        {!loading && items.length > 0 ? (
          <p className="pb-2 text-sm text-muted-foreground">
            {total} {total === 1 ? 'projeto' : 'projetos'}
            {pendingTotal !== null ? ` · ${pendingTotal} esperando a equipe` : ''}
          </p>
        ) : null}
      </div>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

      {loading && items.length === 0 ? (
        <div className="space-y-2" role="status" aria-label="Carregando os projetos">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : loadFailed && items.length === 0 ? (
        <div className="rounded-[18px] border border-border bg-card">
          <LoadError what="os projetos" onRetry={() => void load(0, false)} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[18px] border border-border bg-card">
          {status === 'pending' && !courseId && !studentFilter && !qDebounced ? (
            <EmptyState
              zappy="celebrating"
              title="Nenhum projeto esperando a equipe."
              description="Quando alguém enviar um projeto ou um desenho, ele aparece aqui."
            />
          ) : filtered ? (
            <EmptyState
              title="Nenhum projeto com estes filtros."
              description="Tente outra situação ou outro curso."
            />
          ) : (
            <EmptyState
              zappy="happy"
              title="Nenhum projeto enviado ainda."
              description="Quando alguém enviar um projeto do Estúdio ou um desenho do Pinta, ele aparece aqui."
            />
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          {items.map((s) => {
            const pending = isSubmissionPending(s)
            const name = studentNameOf(s)
            return (
              <li key={submissionKey(s)}>
                <button
                  type="button"
                  onClick={() => setOpen(s)}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-bold text-muted-foreground"
                  >
                    {name.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`truncate ${pending ? 'font-bold' : 'font-medium'}`}>
                        {name}
                      </span>
                      {s.childName && s.accountName ? (
                        <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                          Responsável: {s.accountName}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {s.courseTitle} · {s.moduleTitle} · {s.lessonTitle}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      {!audience ? (
                        <Badge variant="muted">{PLATFORM_LABELS[s.audience]}</Badge>
                      ) : null}
                      {s.message ? (
                        <Badge variant="outline">
                          <MessageSquare className="size-3" aria-hidden /> Recado
                          {s.messageSpoken ? (
                            <SpokenChip className="ml-1 border-0 bg-transparent px-0 py-0" />
                          ) : null}
                        </Badge>
                      ) : null}
                      <Badge variant={pending ? 'warning' : 'success'}>
                        {SUBMISSION_STATUS_LABEL[submissionStatus(s)]}
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.submittedAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
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
            // A equipe pode ter respondido: recarrega para atualizar o que espera
            // (e o badge da sidebar junto).
            load(0, false)
            refreshProfessorCounts()
          }}
          blockId={open.blockId}
          userId={open.userId}
          studentName={studentNameOf(open)}
          responsible={open.childName ? open.accountName : null}
          audience={open.audience}
          courseId={open.courseId}
          lessonId={open.lessonId}
          lessonTitle={open.lessonTitle}
          onNext={nextPending ? () => setOpen(nextPending) : undefined}
        />
      ) : null}
    </div>
  )
}
