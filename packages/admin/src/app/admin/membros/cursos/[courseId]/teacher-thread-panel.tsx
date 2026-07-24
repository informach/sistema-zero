'use client'

import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { MessagesSquare, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadView } from '@/lib/types'

/** Teto do corpo — espelha o DTO do members (`TeacherThreadReplyBody`, ≤8000). */
const MAX_BODY = 8000

interface Props {
  userId: string
  blockId: string
  /** Vitrine da conversa (a do CURSO) — o aluno só vê o recado na vitrine certa. */
  audience: 'adult' | 'kids'
  courseId: string
  lessonId: string
  /** Título p/ a caixa do aluno renderizar (a aula da entrega). */
  title: string
  studentName: string
}

/**
 * Painel de CONVERSA com o aluno dentro do viewer da Entrega (canal de retorno): abre o
 * histórico por contexto (Entrega) e deixa o professor responder — "seu erro está no
 * bloco X" / "já está resolvido". O aluno vê e responde no app dele (Recados).
 */
export function TeacherThreadPanel({
  userId,
  blockId,
  audience,
  courseId,
  lessonId,
  title,
  studentName,
}: Props) {
  const [thread, setThread] = useState<TeacherThreadView | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    apiGet<{ thread: TeacherThreadView | null }>(
      `/api/members/teacher-threads/by-context?userId=${encodeURIComponent(userId)}&contextType=studio_submission&contextRef=${encodeURIComponent(blockId)}`,
    )
      .then((r) => {
        if (active) setThread(r.thread)
      })
      .catch(() => {
        // best-effort — o painel só não mostra o histórico se o members soluçar.
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, blockId])

  const send = async () => {
    const body = reply.trim()
    if (!body || sending) return
    if (body.length > MAX_BODY) {
      toast.error(`O recado excede ${MAX_BODY} caracteres.`)
      return
    }
    setSending(true)
    try {
      const updated = await apiSend<TeacherThreadView>('/api/members/teacher-threads', 'POST', {
        userId,
        audience,
        contextType: 'studio_submission',
        blockId,
        courseId,
        lessonId,
        title,
        body,
      })
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
      const older = await apiGet<{ thread: TeacherThreadView | null }>(
        `/api/members/teacher-threads/by-context?userId=${encodeURIComponent(userId)}&contextType=studio_submission&contextRef=${encodeURIComponent(blockId)}&before=${encodeURIComponent(thread.nextCursor)}`,
      )
      const olderThread = older.thread
      if (!olderThread) return
      setThread((current) =>
        current
          ? { ...olderThread, messages: [...olderThread.messages, ...current.messages] }
          : olderThread,
      )
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar mensagens anteriores.')
    } finally {
      setLoadingOlder(false)
    }
  }

  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-center gap-1.5 font-medium text-sm">
        <MessagesSquare className="size-4" /> Conversa com {studentName}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-xs">Carregando conversa…</p>
      ) : thread && thread.messages.length > 0 ? (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
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
                  </p>
                  {teacher ? (
                    // Recado do PROFESSOR = markdown rico (negrito/listas/print/código); o
                    // aluno vê o mesmo formatado no app dele (renderMarkdown, autor confiável).
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
      ) : (
        <p className="text-muted-foreground text-xs">
          Ainda não há conversa. Escreva um recado para {studentName} — explique o que ajustar ou
          avise que já está resolvido.
        </p>
      )}

      <div className="space-y-2">
        {/* Editor rico: negrito/listas/citação, código (inline e bloco) e PRINT (botão de
            imagem ou colar Ctrl+V) — para o professor explicar bem à criança. Saída markdown. */}
        <RichTextEditor content={reply} onChange={setReply} compact />
        <div className="flex justify-end">
          <Button size="sm" onClick={send} disabled={!reply.trim() || sending}>
            <Send className="size-4" /> Enviar
          </Button>
        </div>
      </div>
    </Card>
  )
}
