'use client'

import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadView } from '@/lib/types'

const MAX_BODY = 8000

export function RecadoThreadClient({ threadId }: { threadId: string }) {
  const [thread, setThread] = useState<TeacherThreadView | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const scrollOnNextMessages = useRef(true)

  useEffect(() => {
    let alive = true
    apiGet<TeacherThreadView>(`/api/members/teacher-threads/${threadId}`)
      .then((value) => {
        if (!alive) return
        setThread(value)
        setState('ready')
        apiSend(`/api/members/teacher-threads/${threadId}/read`, 'POST', {}).catch(() => {})
      })
      .catch((error: ApiError) => {
        if (!alive) return
        if (error.status === 404) setState('notfound')
        else {
          setError('Não foi possível carregar a conversa. Atualize a página e tente novamente.')
          setState('ready')
        }
      })
    return () => {
      alive = false
    }
  }, [threadId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao fim quando chegam turnos
  useEffect(() => {
    if (scrollOnNextMessages.current) endRef.current?.scrollIntoView({ block: 'end' })
    scrollOnNextMessages.current = true
  }, [thread?.messages.length])

  const loadOlder = async () => {
    if (!thread?.nextCursor || loadingOlder) return
    setLoadingOlder(true)
    scrollOnNextMessages.current = false
    try {
      const older = await apiGet<TeacherThreadView>(
        `/api/members/teacher-threads/${threadId}?before=${encodeURIComponent(thread.nextCursor)}`,
      )
      setThread((current) =>
        current ? { ...older, messages: [...older.messages, ...current.messages] } : older,
      )
    } catch {
      setError('Não foi possível carregar as mensagens anteriores.')
    } finally {
      setLoadingOlder(false)
    }
  }

  const send = async () => {
    const body = reply.trim()
    if (!body || body.length > MAX_BODY || sending) return
    setSending(true)
    scrollOnNextMessages.current = true
    try {
      const updated = await apiSend<TeacherThreadView>(
        `/api/members/teacher-threads/${threadId}/messages`,
        'POST',
        { body },
      )
      setThread(updated)
      setReply('')
    } catch {
      setError('Não foi possível enviar sua resposta. Seu texto foi mantido para tentar novamente.')
    } finally {
      setSending(false)
    }
  }

  if (state === 'notfound') {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">Conversa não encontrada.</p>
    )
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/recados" className="rounded-full border p-2" aria-label="Voltar aos recados">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="font-medium">{thread?.title ?? 'Conversa com a equipe'}</p>
          <p className="text-xs text-muted-foreground">Recado privado</p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-xl border bg-card p-4">
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {state === 'loading' ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : null}
        {thread ? (
          <ul className="flex flex-col gap-3">
            {thread.nextCursor ? (
              <li className="self-center">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="text-xs text-primary underline disabled:opacity-50"
                >
                  {loadingOlder ? 'Carregando…' : 'Carregar mensagens anteriores'}
                </button>
              </li>
            ) : null}
            {thread.messages.map((message) => {
              const mine = message.authorRole === 'student'
              return (
                <li key={message.id} className={`max-w-[85%] ${mine ? 'self-end' : 'self-start'}`}>
                  <div
                    className={`rounded-xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  >
                    <p className="mb-1 text-xs opacity-75">
                      {mine ? 'Você' : (message.authorName ?? 'Equipe')} ·{' '}
                      {new Date(message.createdAt).toLocaleString('pt-BR')}
                    </p>
                    {mine ? (
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    ) : (
                      <div className="rich-text-content break-words">
                        {renderMarkdown(message.body)}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          maxLength={MAX_BODY}
          rows={3}
          placeholder="Escreva uma resposta…"
          className="min-h-20 flex-1 resize-none rounded-xl border bg-card p-3 text-sm"
        />
        <button
          type="button"
          onClick={send}
          disabled={!reply.trim() || sending}
          className="rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-50"
          aria-label="Enviar resposta"
        >
          <Send className="size-5" />
        </button>
      </div>
    </section>
  )
}
