'use client'

import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Mail, Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadContext, TeacherThreadView } from '@/lib/types'

const CONTEXT_LABEL: Record<TeacherThreadContext, string> = {
  lesson_section: 'Dúvida na aula',
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

  const voltar = { href: '/recados', label: 'Voltar aos recados' }

  if (state === 'notfound') {
    return (
      <>
        <KidsBand tone="creme">
          <KidsPageHeader back={voltar} eyebrow="Recado" eyebrowIcon={Mail} title="Recados" />
        </KidsBand>
        <KidsBand tone="ceu">
          <KidsEmptyState
            icon={Mail}
            title="Recado não encontrado"
            description="Ele pode ter sido apagado. Os outros recados continuam na sua caixa."
            action={
              <Link
                href="/recados"
                prefetch={false}
                className="sz-btn-gradient h-[3.125rem] px-6 text-base"
              >
                Voltar aos recados
              </Link>
            }
          />
        </KidsBand>
      </>
    )
  }

  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          back={voltar}
          eyebrow={thread ? CONTEXT_LABEL[thread.contextType] : 'Recado'}
          eyebrowIcon={Mail}
          title={thread?.title ?? 'Conversa com o professor'}
        />
      </KidsBand>
      <KidsBand tone="ceu">
        <div className="kids-carta rounded-[1.75rem] p-4 md:p-6">
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {error ? (
              <p role="alert" className="mb-3 font-semibold text-destructive text-sm">
                {error}
              </p>
            ) : null}
            {state === 'loading' ? (
              <p role="status" className="py-8 text-center text-muted-foreground text-sm">
                Carregando…
              </p>
            ) : thread && thread.messages.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {thread.nextCursor ? (
                  <li className="self-center">
                    <button
                      type="button"
                      onClick={loadOlder}
                      disabled={loadingOlder}
                      className="sz-btn-gradient sz-btn-contorno h-10 text-sm disabled:opacity-50"
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
                        className={`rounded-[1.25rem] px-4 py-3 text-[0.9375rem] ${
                          mine ? 'kids-marca rounded-br-md' : 'rounded-bl-md bg-background'
                        }`}
                      >
                        <p className="mb-1 font-bold text-xs opacity-80">
                          {mine ? 'Você' : m.authorName || 'Professor(a)'}
                        </p>
                        {mine ? (
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        ) : (
                          // Recado do professor formatado (negrito/listas/print/código).
                          // Corpo e entrelinha por estilo INLINE: a `.lesson-prose` fica fora
                          // de camada (17px/1.8, a escala da aula) e venceria a utilitária;
                          // na bolha o recado tem o mesmo corpo da resposta da criança.
                          <div
                            className="lesson-prose break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_img]:max-h-72 [&_img]:rounded-lg"
                            style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}
                          >
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

          {/* A caixa de resposta é a pílula creme com o botão redondo azul: o campo do
              Clube na tela-modelo. O anel de foco fica na PÍLULA inteira. */}
          <div className="mt-4 flex items-end gap-2 rounded-[1.5rem] bg-(--band-creme) p-2 pl-4 focus-within:ring-2 focus-within:ring-ring">
            <label htmlFor="teacher-reply" className="sr-only">
              Resposta para o professor
            </label>
            <textarea
              id="teacher-reply"
              name="reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Escreva uma resposta…"
              maxLength={1000}
              rows={2}
              className="flex-1 resize-none bg-transparent py-2 text-[0.9375rem] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={send}
              disabled={!reply.trim() || sending}
              aria-label="Enviar resposta"
              className="kids-marca inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-40"
            >
              <Send className="size-5" />
            </button>
          </div>
        </div>
      </KidsBand>
    </>
  )
}
