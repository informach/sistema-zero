'use client'

import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Send } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { SpokenChip } from '@/components/admin/spoken-chip'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { LessonLearningPanel } from '@/components/professor/lesson-learning-panel'
import { ReplyTemplatesMenu } from '@/components/professor/reply-templates'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { COMMUNITY_NAMES } from '@/lib/platform'
import { threadSubject } from '@/lib/teacher-thread-subject'
import type { TeacherThreadView } from '@/lib/types'
import { CONTEXT_DETAIL, WORKFLOW_STATUSES, workflowLabel } from './recados-copy'

/** Teto do corpo — espelha o DTO do members (`TeacherThreadReplyBody`). */
const MAX_BODY = 8000

const StudioSubmissionViewer = dynamic(
  () =>
    import('@/app/admin/membros/cursos/[courseId]/studio-submission-viewer').then(
      (module) => module.StudioSubmissionViewer,
    ),
  { ssr: false },
)

interface Props {
  threadId: string
  studentName: string
  onClose: () => void
  /** A conversa carregou (quem abre pode tirar dela o que ainda não sabe, como o nome). */
  onLoaded?: (thread: TeacherThreadView) => void
}

/**
 * Conversa aberta PELA CAIXA DE ENTRADA (por id — ≠ do `TeacherThreadPanel` do
 * viewer da Entrega, que abre por contexto userId+blockId). Abrir marca como
 * lida (watermark do professor); responder usa a rota por id.
 */
export function ThreadDialog({ threadId, studentName, onClose, onLoaded }: Props) {
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded
  const [thread, setThread] = useState<TeacherThreadView | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const cancelLoad = useRef<(() => void) | null>(null)
  const [viewingSubmission, setViewingSubmission] = useState(false)
  /** O "Salvo" ao lado da situação, depois que o servidor confirma a troca. */
  const [statusSaved, setStatusSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  const loadThread = useCallback(() => {
    cancelLoad.current?.()
    let active = true
    cancelLoad.current = () => {
      active = false
    }
    setLoading(true)
    setLoadError(null)
    setThread(null)
    apiGet<TeacherThreadView>(`/api/members/teacher-threads/${threadId}`)
      .then((t) => {
        if (active) {
          setThread(t)
          onLoadedRef.current?.(t)
          void apiSend(`/api/members/teacher-threads/${threadId}/read`, 'POST', {})
            .then(() => refreshProfessorCounts())
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (active)
          setLoadError(err instanceof Error ? err.message : 'Não conseguimos abrir o recado.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    // Marca como lida ao abrir — best-effort (a lista recarrega ao fechar); o badge
    // da sidebar re-busca junto (senão fica 60s mentindo depois da leitura).
  }, [threadId])

  useEffect(() => {
    loadThread()
    return () => cancelLoad.current?.()
  }, [loadThread])

  const send = async () => {
    const body = reply.trim()
    if (!body || sending) return
    if (body.length > MAX_BODY) {
      toast.error(`O recado passou de ${MAX_BODY} caracteres. Encurte um pouco e envie de novo.`)
      return
    }
    setSending(true)
    try {
      const updated = await apiSend<TeacherThreadView>(
        `/api/members/teacher-threads/${threadId}/messages`,
        'POST',
        { body },
      )
      setThread(updated)
      setReply('')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'O recado não foi enviado. Tente de novo.')
    } finally {
      setSending(false)
    }
  }

  const loadOlder = async () => {
    if (!thread?.nextCursor || loadingOlder) return
    setLoadingOlder(true)
    try {
      const older = await apiGet<TeacherThreadView>(
        `/api/members/teacher-threads/${threadId}?before=${encodeURIComponent(thread.nextCursor)}`,
      )
      setThread((current) =>
        current ? { ...older, messages: [...older.messages, ...current.messages] } : older,
      )
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não conseguimos carregar as mensagens anteriores.')
    } finally {
      setLoadingOlder(false)
    }
  }

  return (
    <>
      <Dialog
        open={!viewingSubmission}
        onClose={onClose}
        title={`Recados com ${studentName}`}
        className="max-w-2xl"
      >
        {loadError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm">
              {loadError}
            </p>
            <Button variant="outline" onClick={loadThread}>
              Tentar de novo
            </Button>
          </div>
        ) : loading || !thread ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-10 w-2/3 self-end" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        ) : (
          <div className="space-y-3">
            {threadSubject(thread) ? (
              <p className="text-sm text-muted-foreground">{threadSubject(thread)}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-[15px]">
              <label htmlFor={`thread-status-${threadId}`} className="font-medium">
                Situação
              </label>
              <select
                id={`thread-status-${threadId}`}
                className="min-h-11 rounded-xl border border-border bg-card px-3"
                value={thread.workflowStatus ?? 'waiting_student'}
                onChange={(e) => {
                  setStatusSaved(false)
                  void apiSend<TeacherThreadView>(
                    `/api/members/teacher-threads/${threadId}/status`,
                    'POST',
                    { status: e.target.value },
                  )
                    .then((updated) => {
                      setThread(updated)
                      setStatusSaved(true)
                      if (savedTimer.current) clearTimeout(savedTimer.current)
                      savedTimer.current = setTimeout(() => setStatusSaved(false), 2500)
                    })
                    .catch(() => toast.error('Não conseguimos salvar a situação. Tente de novo.'))
                }}
              >
                {WORKFLOW_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {workflowLabel(value, thread.audience)}
                  </option>
                ))}
              </select>
              <span role="status" className="text-sm font-medium text-success-foreground">
                {statusSaved ? 'Salvo' : ''}
              </span>
            </div>
            {thread.messages
              .filter((m) => m.helpContext)
              .slice(-1)
              .map((m) => (
                <div key={m.id} className="rounded border p-3 text-sm">
                  <strong>Quando a dúvida chegou: {m.helpContext?.sectionTitle}</strong>
                  <p>
                    {m.helpContext?.pending.length
                      ? `Pendente: ${m.helpContext.pending.join(' · ')}`
                      : 'Nada pendente ficou registrado nesta parte.'}
                  </p>
                </div>
              ))}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-sm">
                <strong>{COMMUNITY_NAMES[thread.audience]}</strong>
                <span className="block text-muted-foreground">
                  {CONTEXT_DETAIL[thread.contextType]}
                </span>
              </p>
              {thread.contextType === 'studio_submission' &&
              thread.contextRef &&
              thread.courseId &&
              thread.lessonId ? (
                <Button variant="outline" size="sm" onClick={() => setViewingSubmission(true)}>
                  Abrir o projeto deste recado
                </Button>
              ) : null}
            </div>

            {thread.lessonId ? (
              <LessonLearningPanel
                lessonId={thread.lessonId}
                userId={thread.userId}
                accountId={thread.accountId ?? thread.userId}
                sectionId={
                  thread.contextType === 'lesson_section'
                    ? thread.contextRef?.split(':')[1]
                    : undefined
                }
              />
            ) : null}
            <ul className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
              {thread.nextCursor ? (
                <li className="self-center">
                  <Button variant="outline" size="sm" disabled={loadingOlder} onClick={loadOlder}>
                    {loadingOlder ? 'Carregando…' : 'Carregar mensagens anteriores'}
                  </Button>
                </li>
              ) : null}
              {thread.messages.map((m) => {
                const teacher = m.authorRole === 'teacher'
                return (
                  <li key={m.id} className={`max-w-[85%] ${teacher ? 'self-end' : 'self-start'}`}>
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${teacher ? 'bg-primary/10' : 'bg-muted'}`}
                    >
                      <p className="mb-0.5 font-medium text-muted-foreground text-xs">
                        {teacher ? (m.authorName ?? 'Você') : studentName}
                        <span className="ml-2 font-normal">
                          {new Date(m.createdAt).toLocaleString('pt-BR')}
                        </span>
                        {!teacher && m.spoken ? <SpokenChip /> : null}
                      </p>
                      {teacher ? (
                        // Recado da EQUIPE = markdown rico (autor confiável).
                        <div className="rich-text-content break-words text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_img]:max-h-72 [&_img]:rounded">
                          {renderMarkdown(m.body)}
                        </div>
                      ) : (
                        // Recado de quem estuda = texto simples (React escapa: conteúdo de criança).
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="space-y-2">
              <RichTextEditor content={reply} onChange={setReply} compact />
              <div className="flex items-center justify-between gap-2">
                <ReplyTemplatesMenu value={reply} onChange={setReply} />
                <Button size="sm" onClick={send} disabled={!reply.trim() || sending}>
                  <Send className="size-4" /> Enviar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
      {viewingSubmission &&
      thread?.contextType === 'studio_submission' &&
      thread.contextRef &&
      thread.courseId &&
      thread.lessonId ? (
        <StudioSubmissionViewer
          open
          onClose={() => setViewingSubmission(false)}
          blockId={thread.contextRef}
          userId={thread.userId}
          studentName={studentName}
          audience={thread.audience}
          courseId={thread.courseId}
          lessonId={thread.lessonId}
          lessonTitle={thread.title ?? 'Projeto deste recado'}
        />
      ) : null}
    </>
  )
}
