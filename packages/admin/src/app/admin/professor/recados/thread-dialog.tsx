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
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { LessonLearningPanel } from '@/components/professor/lesson-learning-panel'
import { ReplyTemplatesMenu } from '@/components/professor/reply-templates'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadView } from '@/lib/types'

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
}

/**
 * Conversa aberta PELA CAIXA DE ENTRADA (por id — ≠ do `TeacherThreadPanel` do
 * viewer da Entrega, que abre por contexto userId+blockId). Abrir marca como
 * lida (watermark do professor); responder usa a rota por id.
 */
export function ThreadDialog({ threadId, studentName, onClose }: Props) {
  const [thread, setThread] = useState<TeacherThreadView | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const cancelLoad = useRef<(() => void) | null>(null)
  const [viewingSubmission, setViewingSubmission] = useState(false)

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
          void apiSend(`/api/members/teacher-threads/${threadId}/read`, 'POST', {})
            .then(() => refreshProfessorCounts())
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Falha ao abrir a conversa.')
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
      toast.error(`O recado excede ${MAX_BODY} caracteres.`)
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
      toast.error((err as ApiError).message ?? 'Falha ao enviar o recado.')
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
      toast.error((err as ApiError).message ?? 'Falha ao carregar mensagens anteriores.')
    } finally {
      setLoadingOlder(false)
    }
  }

  return (
    <>
      <Dialog
        open={!viewingSubmission}
        onClose={onClose}
        title={`Conversa com ${studentName}`}
        className="max-w-2xl"
      >
        {loadError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm">
              {loadError}
            </p>
            <Button variant="outline" onClick={loadThread}>
              Tentar novamente
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
            {thread.title ? <p className="text-xs text-muted-foreground">{thread.title}</p> : null}
            <label className="block text-sm">
              Atendimento da equipe
              <select
                className="ml-2 rounded border p-2"
                value={thread.workflowStatus ?? 'waiting_student'}
                onChange={(e) => {
                  void apiSend<TeacherThreadView>(
                    `/api/members/teacher-threads/${threadId}/status`,
                    'POST',
                    { status: e.target.value },
                  )
                    .then(setThread)
                    .catch(() => toast.error('Não foi possível salvar o atendimento.'))
                }}
              >
                <option value="waiting_teacher">Aguardando professor</option>
                <option value="waiting_student">Aguardando aluno</option>
                <option value="resolved">Resolvido</option>
              </select>
            </label>
            {thread.messages
              .filter((m) => m.helpContext)
              .slice(-1)
              .map((m) => (
                <div key={m.id} className="rounded border p-3 text-sm">
                  <strong>No momento da dúvida · {m.helpContext?.sectionTitle}</strong>
                  <p>
                    {m.helpContext?.pending.length
                      ? m.helpContext.pending.join(' · ')
                      : 'Nenhum critério pendente registrado.'}
                  </p>
                </div>
              ))}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-sm">
                <strong>
                  {thread.audience === 'kids' ? 'Comunidade Kids' : 'Comunidade adulta'}
                </strong>
                <span className="block text-xs text-muted-foreground">
                  {thread.contextType === 'studio_submission'
                    ? 'Conversa sobre uma entrega'
                    : thread.contextType === 'lesson_section'
                      ? 'Dúvida em uma seção da aula'
                      : thread.contextType === 'mural_publication'
                        ? 'Conversa sobre uma publicação'
                        : 'Acompanhamento do aluno'}
                </span>
              </p>
              {thread.contextType === 'studio_submission' &&
              thread.contextRef &&
              thread.courseId &&
              thread.lessonId ? (
                <Button variant="outline" size="sm" onClick={() => setViewingSubmission(true)}>
                  Abrir entrega desta conversa
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
                      </p>
                      {teacher ? (
                        // Recado do PROFESSOR = markdown rico (autor confiável).
                        <div className="rich-text-content break-words text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_img]:max-h-72 [&_img]:rounded">
                          {renderMarkdown(m.body)}
                        </div>
                      ) : (
                        // Recado do ALUNO = texto simples (React escapa — conteúdo de criança).
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
          lessonTitle={thread.title ?? 'Entrega desta conversa'}
        />
      ) : null}
    </>
  )
}
