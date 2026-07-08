'use client'

import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { MessagesSquare, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadView } from '@/lib/types'

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

  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-center gap-1.5 font-medium text-sm">
        <MessagesSquare className="size-4" /> Conversa com {studentName}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-xs">Carregando conversa…</p>
      ) : thread && thread.messages.length > 0 ? (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
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
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
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

      <div className="flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={`Recado para ${studentName}…`}
          maxLength={1000}
          rows={2}
          className="flex-1 resize-none rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
        />
        <Button size="sm" onClick={send} disabled={!reply.trim() || sending}>
          <Send className="size-4" /> Enviar
        </Button>
      </div>
    </Card>
  )
}
