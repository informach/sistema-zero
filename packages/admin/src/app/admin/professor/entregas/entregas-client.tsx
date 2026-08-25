'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Inbox, MessageSquare, X } from 'lucide-react'
// Viewer compartilhado com a aba "Entregas" do editor de curso (mesma tela de
// correção; vive lá porque nasceu lá — mover é limpeza futura, o arquivo irmão
// `teacher-thread-panel` tem WIP concorrente).
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { usePlatform } from '@/components/admin/platform-store'

// LAZY de propósito, e não só por peso: o viewer (e os embeds do Estúdio/Pinta
// atrás dele) só carrega quando uma entrega ABRE — a fila lista sem pagar o
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
import { type ApiError, apiGet } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { canBackgroundRefreshPage, createForegroundPriority } from '@/lib/latest-wins'
import {
  isSubmissionPending,
  SUBMISSION_STATUS_LABEL,
  submissionStatus,
} from '@/lib/submission-status'
import type { CourseView, Paginated, StudioSubmissionQueueRow } from '@/lib/types'

const PAGE = 30
const VISIBLE_REFRESH_MS = 15_000

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
  const searchParams = useSearchParams()
  const [items, setItems] = useState<StudioSubmissionQueueRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [courseId, setCourseId] = useState('')
  // Filtro "Plataforma" nasce na plataforma ATIVA do seletor global e re-sincroniza
  // quando ele muda; o Select local segue como override pontual ("Todas"/a outra).
  const platform = usePlatform()
  const [audience, setAudience] = useState<string>(platform)
  useEffect(() => {
    setAudience(platform)
  }, [platform])
  const [status, setStatus] = useState('')
  const [courses, setCourses] = useState<CourseView[]>([])
  const [open, setOpen] = useState<StudioSubmissionQueueRow | null>(null)
  /** Total de pendentes no escopo curso/plataforma (null = indisponível). */
  const [pendingTotal, setPendingTotal] = useState<number | null>(null)
  /** Filtro por aluno vindo da FICHA (`?userId=`) — chip removível. */
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
        setHint(res.hint === 'refine' ? 'Muitos resultados no auth — refine a busca.' : null)
      } catch (err) {
        if (loadAuthority.canPublish(ticket) && !background) {
          toast.error((err as ApiError).message ?? 'Falha ao carregar as entregas.')
        }
        if (!loadAuthority.canPublish(ticket)) {
          loadAuthority.finish(ticket)
          return
        }
      }
      if (loadAuthority.canPublish(ticket)) {
        // Total de PENDENTES do escopo curso/plataforma (independente da página e do
        // filtro de situação) — o `total` da fila com status=pending, em paralelo.
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

  // A fila também muda por ação do ALUNO, fora deste browser. Enquanto a tela
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

  // Próxima entrega PENDENTE depois da aberta (a fila circula: acabou → volta ao
  // topo). Alimenta o botão "Próxima pendente" do viewer.
  const nextPending = (() => {
    if (!open) return null
    const key = (s: StudioSubmissionQueueRow) => `${s.userId}:${s.blockId}`
    const start = items.findIndex((s) => key(s) === key(open))
    for (let step = 1; step <= items.length; step++) {
      const candidate = items[(start + step) % items.length]
      if (candidate && isSubmissionPending(candidate) && key(candidate) !== key(open)) {
        return candidate
      }
    }
    return null
  })()

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Entregas"
        description="Fila unificada de entregas do Estúdio, de todos os cursos — pendentes primeiro."
      />

      {studentFilter ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
            Filtrando por aluno{items[0] ? `: ${studentNameOf(items[0])}` : ''}
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
          <Field label="Aluno" htmlFor="ent-q" hint="Busque pelo responsável (nome ou e-mail).">
            <Input
              id="ent-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome ou e-mail…"
            />
          </Field>
        ) : null}
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
            <option value="reviewed">Conferidas</option>
          </Select>
        </Field>
        {!loading && items.length > 0 ? (
          <p className="pb-2 text-xs text-muted-foreground">
            {total} entregas
            {pendingTotal !== null ? ` · ${pendingTotal} pendentes no total` : ''}
          </p>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

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
                    className={`truncate text-sm ${isSubmissionPending(s) ? 'font-semibold' : 'font-medium'}`}
                  >
                    {studentNameOf(s)}
                  </span>
                  {s.childName && s.accountName ? (
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      resp.: {s.accountName}
                    </span>
                  ) : null}
                  <Badge variant={isSubmissionPending(s) ? 'outline' : 'success'}>
                    {SUBMISSION_STATUS_LABEL[submissionStatus(s)]}
                  </Badge>
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
            // O professor pode ter respondido — recarrega p/ atualizar a pendência
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
