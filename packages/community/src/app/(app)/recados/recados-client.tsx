'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { apiGet } from '@/lib/api'
import type { TeacherThreadContext, TeacherThreadSummaryView } from '@/lib/types'

const CONTEXT_LABEL: Record<TeacherThreadContext, string> = {
  studio_submission: 'Entrega',
  mural_publication: 'Comunidade',
  general: 'Recado',
}

export function RecadosClient({
  initialThreads,
  initialNextOffset,
}: {
  initialThreads: TeacherThreadSummaryView[]
  initialNextOffset: number | null
}) {
  const [threads, setThreads] = useState(initialThreads)
  const [nextOffset, setNextOffset] = useState(initialNextOffset)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <section className="mx-auto max-w-2xl">
      <header className="mb-6 space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Mail className="size-6" /> Recados
        </h1>
        <p className="text-sm text-muted-foreground">Conversas privadas com a equipe professora.</p>
      </header>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Ainda não há recados. Quando a equipe escrever, a conversa aparecerá aqui.
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/recados/${thread.id}`}
                className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary">
                    {CONTEXT_LABEL[thread.contextType]}
                  </span>
                  {thread.unread ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      NOVO
                    </span>
                  ) : null}
                  <time className="ml-auto text-xs text-muted-foreground">
                    {new Date(thread.lastMessageAt).toLocaleDateString('pt-BR')}
                  </time>
                </div>
                <p className="mt-1 truncate font-medium">
                  {thread.title ?? 'Conversa com a equipe'}
                </p>
                {thread.lastMessagePreview ? (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {thread.lastMessageRole === 'student' ? 'Você: ' : ''}
                    {thread.lastMessagePreview}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {nextOffset !== null ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 text-sm text-primary underline disabled:opacity-50"
        >
          {loadingMore ? 'Carregando…' : 'Carregar mais recados'}
        </button>
      ) : null}
    </section>
  )
}
