'use client'

import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadContext, TeacherThreadView } from '@/lib/types'

const CONTEXT_LABEL: Record<TeacherThreadContext, string> = {
  studio_submission: 'Sua entrega',
  mural_publication: 'Seu jogo no Mural',
  general: 'Recado',
}

/**
 * Conversa com o professor: carrega + marca lida (server), mostra os turnos (professor
 * à esquerda, "Você" à direita) e deixa o aluno responder. O recado do PROFESSOR é
 * markdown rico (negrito/listas/print/código — autor confiável, `renderMarkdown`); a
 * resposta do ALUNO é PLAIN (React escapa — sem markdown/HTML de UGC infantil).
 */
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
      .then((t) => {
        if (!alive) return
        setThread(t)
        setState('ready')
        // Marca lida (zera o não-lido do aluno) — best-effort, não bloqueia a leitura.
        apiSend(`/api/members/teacher-threads/${threadId}/read`, 'POST').catch(() => {})
      })
      .catch((e: ApiError) => {
        if (!alive) return
        if (e?.status === 404) setState('notfound')
        else {
          setError('Não consegui abrir esse recado. Atualize a página e tente de novo.')
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

  const send = async () => {
    const body = reply.trim()
    if (!body || sending) return
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
      setError('Não consegui enviar agora. Seu texto ficou aqui para você tentar de novo.')
    } finally {
      setSending(false)
    }
  }

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
      setError('Não consegui carregar as mensagens anteriores.')
    } finally {
      setLoadingOlder(false)
    }
  }

  if (state === 'notfound') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 text-center">
        <p className="font-bold">Recado não encontrado</p>
        <Link href="/recados" className="mt-3 inline-block text-primary underline">
          Voltar aos recados
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/recados"
          aria-label="Voltar aos recados"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card hover:border-primary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="font-bold text-primary text-xs uppercase tracking-wide">
            {thread ? CONTEXT_LABEL[thread.contextType] : ''}
          </p>
          <p className="truncate font-bold [font-family:var(--font-display)]">
            {thread?.title ?? 'Conversa com o professor'}
          </p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-2xl border-2 border-border bg-card p-3">
        {error ? <p className="mb-3 text-destructive text-sm">{error}</p> : null}
        {state === 'loading' ? (
          <p className="py-8 text-center text-muted-foreground text-sm">Carregando…</p>
        ) : thread && thread.messages.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {thread.nextCursor ? (
              <li className="self-center">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="rounded-full border-2 border-border px-3 py-1 font-bold text-xs hover:border-primary disabled:opacity-50"
                >
                  {loadingOlder ? 'Carregando…' : 'Ver mensagens anteriores'}
                </button>
              </li>
            ) : null}
            {thread.messages.map((m) => {
              const mine = m.authorRole === 'student'
              return (
                <li key={m.id} className={`max-w-[85%] ${mine ? 'self-end' : 'self-start'}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <p className="mb-0.5 font-bold text-[0.7rem] opacity-80">
                      {mine ? 'Você' : m.authorName || 'Professor(a)'}
                    </p>
                    {mine ? (
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    ) : (
                      // Recado do professor formatado (negrito/listas/print/código).
                      <div className="lesson-prose break-words text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_img]:max-h-72 [&_img]:rounded-lg">
                        {renderMarkdown(m.body)}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-8 text-center text-muted-foreground text-sm">Sem mensagens.</p>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Escreva uma resposta…"
          maxLength={1000}
          rows={2}
          className="flex-1 resize-none rounded-2xl border-2 border-border bg-card p-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={send}
          disabled={!reply.trim() || sending}
          aria-label="Enviar resposta"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </div>
    </div>
  )
}
