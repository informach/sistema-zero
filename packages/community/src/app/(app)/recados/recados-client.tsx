'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import { plainPreview } from '@/lib/plain-preview'
import type { TeacherThreadContext, TeacherThreadSummaryView } from '@/lib/types'

export const CONTEXT_LABEL: Record<TeacherThreadContext, string> = {
  lesson_section: 'Dúvida na aula',
  studio_submission: 'Entrega',
  mural_publication: 'Comunidade',
  general: 'Recado',
}

const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const SHORT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * "hoje", "ontem" ou a data, no dia civil de São Paulo: o mesmo resultado no servidor e no
 * navegador (sem fuso fixo, a virada do dia mudava o texto entre os dois e quebrava a hidratação).
 */
export function threadDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const key = DAY.format(date)
  if (key === DAY.format(now)) return 'hoje'
  if (key === DAY.format(new Date(now.getTime() - 86_400_000))) return 'ontem'
  return SHORT.format(date)
}

/**
 * A lista de conversas com a equipe, a mesma em `/recados` e em `/recados/<id>` (direção de arte de
 * 18/10/2026): o contexto, o selo Novo, a data, o título e a última fala. Com uma conversa aberta,
 * ela fica marcada e perde o Novo (a página dela já marcou como lida).
 */
export function RecadosList({
  initialThreads,
  initialNextOffset,
  selectedId = null,
  loadFailed = false,
}: {
  initialThreads: TeacherThreadSummaryView[]
  initialNextOffset: number | null
  selectedId?: string | null
  loadFailed?: boolean
}) {
  const [threads, setThreads] = useState(initialThreads)
  const [nextOffset, setNextOffset] = useState(initialNextOffset)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(
    loadFailed
      ? 'Não foi possível carregar os recados. Atualize a página para tentar de novo.'
      : null,
  )

  const loadMore = async () => {
    if (nextOffset === null || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await apiGet<{ threads: TeacherThreadSummaryView[]; nextOffset: number | null }>(
        `/api/members/teacher-threads?offset=${nextOffset}`,
      )
      setThreads((current) => [
        ...current,
        ...page.threads.filter((item) => !current.some((thread) => thread.id === item.id)),
      ])
      setNextOffset(page.nextOffset)
    } catch {
      setError('Não foi possível carregar mais recados. Tente novamente.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section aria-label="Conversas" className="flex min-w-0 flex-col gap-2.5">
      {threads.length === 0 && !loadFailed ? (
        <div className="sz-card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Mail className="size-8 text-muted-foreground" aria-hidden />
          <p className="m-0 font-bold">Ainda não há recados.</p>
          <p className="m-0 text-[0.9rem] text-muted-foreground">
            Quando a equipe escrever, ou quando você pedir ajuda numa aula, a conversa aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {threads.map((thread) => {
            const selected = thread.id === selectedId
            const unread = thread.unread && !selected
            return (
              <li key={thread.id}>
                <Link
                  href={`/recados/${thread.id}`}
                  prefetch={false}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'sz-card-sm flex flex-col gap-1.5 p-4 text-foreground no-underline transition-colors hover:bg-background',
                    selected && 'shadow-[0_0_0_3px_var(--primary)]',
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-(--acao-texto) text-[0.85rem]">
                      {CONTEXT_LABEL[thread.contextType]}
                    </span>
                    {unread ? <span className="sz-chip sz-chip-novo">Novo</span> : null}
                    <time
                      dateTime={thread.lastMessageAt}
                      className="ml-auto text-[0.85rem] text-muted-foreground"
                    >
                      {threadDay(thread.lastMessageAt)}
                    </time>
                  </span>
                  <strong className="truncate">{thread.title ?? 'Conversa com a equipe'}</strong>
                  {thread.lastMessagePreview ? (
                    <span className="truncate text-[0.85rem] text-muted-foreground">
                      {thread.lastMessageRole === 'student'
                        ? `Você: ${thread.lastMessagePreview}`
                        : `${thread.lastMessageRole === 'teacher' ? 'Equipe: ' : ''}${plainPreview(thread.lastMessagePreview)}`}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {error ? (
        <p role="alert" className="m-0 text-[0.9rem] text-destructive">
          {error}
        </p>
      ) : null}
      {nextOffset !== null ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="sz-btn-quiet sz-btn-sm self-center"
        >
          {loadingMore ? 'Carregando…' : 'Carregar mais recados'}
        </button>
      ) : null}
    </section>
  )
}
