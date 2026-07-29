'use client'

import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { ReplyTemplatesMenu } from '@/components/professor/reply-templates'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadView } from '@/lib/types'

/** Teto do corpo — espelha o DTO do members (`TeacherThreadReplyBody`). */
const MAX_BODY = 8000

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

  useEffect(() => {
    let active = true
    setLoading(true)
    apiGet<TeacherThreadView>(`/api/members/teacher-threads/${threadId}`)
      .then((t) => {
        if (active) setThread(t)
      })
      .catch((err) => {
        toast.error((err as ApiError).message ?? 'Falha ao abrir a conversa.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    // Marca como lida ao abrir — best-effort (a lista recarrega ao fechar); o badge
    // da sidebar re-busca junto (senão fica 60s mentindo depois da leitura).
    apiSend(`/api/members/teacher-threads/${threadId}/read`, 'POST', {})
      .then(() => refreshProfessorCounts())
      .catch(() => {})
    return () => {
      active = false
    }
  }, [threadId])

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
    <Dialog open onClose={onClose} title={`Conversa com ${studentName}`} className="max-w-2xl">
      {loading || !thread ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-10 w-2/3 self-end" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      ) : (
        <div className="space-y-3">
          {thread.title ? <p className="text-xs text-muted-foreground">{thread.title}</p> : null}

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
  )
}
