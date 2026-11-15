'use client'

import { TeacherLessonLink } from '@sistemazero/member-shell/components/teacher-lesson-link'
import { renderMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { KidsLessonCopy } from '@/components/kids/kids-lesson-copy'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { TeacherThreadView } from '@/lib/types'
import { ParentShell } from '../../../_components/parent-shell'
import { PRIMARY_ACTION } from '../../../_components/parent-ui'
import { PARENT_COURSES_HREF } from '../../../parent-routes'

function when(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

/**
 * A conversa de uma dúvida dos cursos para pais: as mensagens (a da equipe em markdown, a do
 * responsável em texto simples), o caminho de volta à parte da aula e a resposta. Ler marca a
 * conversa como lida, como nos Recados.
 */
export function ParentDoubtThread({
  parentName,
  threadId,
}: {
  parentName?: string
  threadId: string
}) {
  const [thread, setThread] = useState<TeacherThreadView | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    apiGet<TeacherThreadView>(`/api/members/teacher-threads/${encodeURIComponent(threadId)}`)
      .then((loaded) => {
        if (!alive) return
        setThread(loaded)
        setState('ready')
        apiSend(`/api/members/teacher-threads/${encodeURIComponent(threadId)}/read`, 'POST').catch(
          () => {},
        )
      })
      .catch((e: ApiError) => {
        if (alive) setState(e?.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      alive = false
    }
  }, [threadId])

  async function send() {
    const body = reply.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const updated = await apiSend<TeacherThreadView>(
        `/api/members/teacher-threads/${encodeURIComponent(threadId)}/messages`,
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

  return (
    <ParentShell active="ajuda" parentName={parentName}>
      <Link
        href="/pais/ajuda#duvidas"
        className="-mb-4 inline-flex min-h-11 items-center gap-2 self-start font-bold text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Suas dúvidas
      </Link>
      {state === 'loading' ? (
        <p role="status" className="text-muted-foreground">
          Abrindo a conversa…
        </p>
      ) : state === 'notfound' ? (
        <section className="kids-carta flex flex-col gap-3 p-6">
          <h1 className="sz-display text-2xl">Conversa não encontrada</h1>
          <p className="text-muted-foreground text-sm">
            Ela pode ter sido apagada. As suas dúvidas continuam em Ajuda.
          </p>
        </section>
      ) : state === 'error' || !thread ? (
        <section className="kids-carta flex flex-col gap-3 p-6">
          <h1 className="sz-display text-2xl">Não consegui abrir a conversa</h1>
          <p className="text-muted-foreground text-sm">Atualize a página e tente de novo.</p>
        </section>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="sz-display text-[2rem] leading-tight">
              {thread.title ?? 'Dúvida na aula'}
            </h1>
            <KidsLessonCopy>
              <TeacherLessonLink thread={thread} courseBasePath={PARENT_COURSES_HREF} />
            </KidsLessonCopy>
          </header>
          <ol className="flex flex-col gap-3">
            {thread.messages.map((message) => {
              const team = message.authorRole !== 'student'
              return (
                <li
                  key={message.id}
                  className={`kids-carta flex max-w-3xl flex-col gap-2 p-5 ${team ? '' : 'self-end bg-(--band-ceu)'}`}
                >
                  <span className="text-muted-foreground text-xs">
                    <strong className="text-foreground">
                      {team ? (message.authorName ?? 'Nossa equipe') : 'Você'}
                    </strong>{' '}
                    · {when(message.createdAt)}
                  </span>
                  {team ? (
                    <div className="text-sm leading-relaxed">{renderMarkdown(message.body)}</div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                  )}
                </li>
              )
            })}
          </ol>
          <form
            className="kids-carta flex flex-col gap-3 p-5"
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <label htmlFor="doubt-reply" className="font-bold">
              Responder à nossa equipe
            </label>
            <textarea
              id="doubt-reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={4}
              maxLength={4000}
              className="w-full rounded-2xl border-2 border-(--linha-carta) bg-card p-3 text-sm"
            />
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className={`${PRIMARY_ACTION} self-start disabled:opacity-60`}
            >
              <Send className="size-4" aria-hidden="true" /> {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        </>
      )}
    </ParentShell>
  )
}
