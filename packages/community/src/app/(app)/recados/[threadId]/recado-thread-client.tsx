'use client'
import { TeacherLessonLink } from '@sistemazero/member-shell/components/teacher-lesson-link'
import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { refreshTeacherUnread } from '@sistemazero/member-shell/lib/teacher-unread'
import { Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { BackLink } from '@/components/community/page'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { TeacherThreadView } from '@/lib/types'

const MAX_BODY = 8000

const WHEN = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * A conversa aberta (direção de arte de 18/10/2026): o título, o caminho de volta à seção da
 * dúvida, as falas (a sua à direita, na cor de ação; a da equipe à esquerda) e a resposta com o
 * rótulo sempre visível.
 */
export function RecadoThreadClient({ threadId }: { threadId: string }) {
  const [thread, setThread] = useState<TeacherThreadView | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const scrollOnNextMessages = useRef(true)
  const replyId = useId()
  const helpId = useId()

  useEffect(() => {
    let alive = true
    apiGet<TeacherThreadView>(`/api/members/teacher-threads/${threadId}`)
      .then((value) => {
        if (!alive) return
        setThread(value)
        setState('ready')
        apiSend(`/api/members/teacher-threads/${threadId}/read`, 'POST', {})
          .then(refreshTeacherUnread)
          .catch(() => {})
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

  // Rola só a caixa das falas até a última (o `scrollIntoView` rolava a página inteira no celular).
  // biome-ignore lint/correctness/useExhaustiveDependencies: rola ao fim quando chegam turnos
  useEffect(() => {
    const box = messagesRef.current
    if (scrollOnNextMessages.current && box) box.scrollTop = box.scrollHeight
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
    setError(null)
    scrollOnNextMessages.current = true
    try {
      const updated = await apiSend<TeacherThreadView>(
        `/api/members/teacher-threads/${threadId}/messages`,
        'POST',
        { body },
      )
      setThread(updated)
      refreshTeacherUnread()
      setReply('')
    } catch {
      setError('Não foi possível enviar sua resposta. Seu texto foi mantido para tentar novamente.')
    } finally {
      setSending(false)
    }
  }

  if (state === 'notfound') {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href="/recados" label="Recados" className="lg:hidden" />
        <div className="sz-card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="m-0 font-bold">Conversa não encontrada.</p>
          <Link href="/recados" prefetch={false} className="sz-link">
            Ver todos os recados
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/recados" label="Recados" className="lg:hidden" />
      <section aria-label="Conversa aberta" className="sz-card flex flex-col overflow-hidden">
        <header className="flex flex-wrap items-center gap-4 border-border border-b p-5 md:px-6">
          <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
            <h2 className="sz-h3 break-words">
              {thread?.title ?? (state === 'loading' ? 'Carregando…' : 'Conversa com a equipe')}
            </h2>
            <span className="text-[0.85rem] text-muted-foreground">
              Recado privado com a equipe
            </span>
          </div>
          {/* O caminho de volta à seção da dúvida é o componente compartilhado; aqui ele só
              ganha a forma do botão de contorno do adulto. */}
          <div className="[&_a]:inline-flex [&_a]:min-h-[2.4rem] [&_a]:items-center [&_a]:rounded-[0.6rem] [&_a]:border-2 [&_a]:border-foreground [&_a]:bg-card [&_a]:px-3.5 [&_a]:font-bold [&_a]:text-[0.9rem] [&_a]:text-foreground [&_a]:no-underline [&_a:hover]:bg-muted">
            <TeacherLessonLink thread={thread} />
          </div>
        </header>

        <div
          ref={messagesRef}
          className="flex max-h-[34rem] min-h-[14rem] flex-col gap-4 overflow-y-auto bg-background p-5 md:px-6"
        >
          {state === 'loading' ? (
            <p role="status" className="m-auto text-muted-foreground">
              Carregando…
            </p>
          ) : null}
          {thread?.nextCursor ? (
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="sz-link min-h-[2.4rem] self-center border-0 bg-transparent text-[0.9rem] disabled:opacity-50"
            >
              {loadingOlder ? 'Carregando…' : 'Carregar mensagens anteriores'}
            </button>
          ) : null}
          {thread?.messages.length === 0 ? (
            <p className="m-auto text-muted-foreground">Ainda não há mensagens nesta conversa.</p>
          ) : null}
          {thread ? (
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {thread.messages.map((message) => {
                const mine = message.authorRole === 'student'
                const when = new Date(message.createdAt)
                return (
                  <li
                    key={message.id}
                    className={cn(
                      'flex max-w-[78%] flex-col gap-1.5',
                      mine ? 'items-end self-end' : 'items-start self-start',
                    )}
                  >
                    <span className="text-[0.85rem] text-muted-foreground">
                      {mine ? 'Você' : (message.authorName ?? 'Equipe')}
                      {Number.isNaN(when.getTime()) ? '' : ` · ${WHEN.format(when)}`}
                    </span>
                    <div
                      className={cn(
                        'break-words px-[0.9rem] py-[0.8rem]',
                        mine
                          ? 'rounded-[0.9rem_0.9rem_0.3rem_0.9rem] bg-primary text-primary-foreground'
                          : 'rounded-[0.9rem_0.9rem_0.9rem_0.3rem] border border-border bg-card',
                      )}
                    >
                      {mine ? (
                        <p className="m-0 whitespace-pre-wrap">{message.body}</p>
                      ) : (
                        <div className="rich-text-content">{renderMarkdown(message.body)}</div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5 border-border border-t p-5 md:px-6">
          <label htmlFor={replyId} className="sz-label">
            Sua resposta
          </label>
          <textarea
            id={replyId}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            maxLength={MAX_BODY}
            rows={4}
            aria-describedby={helpId}
            placeholder="Escreva uma resposta…"
            className="min-h-[6.6rem] w-full resize-y rounded-[0.6rem] border-2 border-input bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground"
          />
          {error ? (
            <p role="alert" className="m-0 text-[0.9rem] text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span id={helpId} className="text-[0.85rem] text-muted-foreground">
              A resposta da equipe aparece nesta conversa.
            </span>
            <button
              type="button"
              onClick={send}
              disabled={!reply.trim() || sending}
              className="sz-btn"
            >
              <Send aria-hidden />
              {sending ? 'Enviando…' : 'Enviar resposta'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
