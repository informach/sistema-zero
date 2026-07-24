'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { apiGet } from '@/lib/api'
import type { TeacherThreadContext, TeacherThreadSummaryView } from '@/lib/types'

const CONTEXT_LABEL: Record<TeacherThreadContext, string> = {
  studio_submission: 'Sua entrega',
  mural_publication: 'Seu jogo no Mural',
  general: 'Recado',
}

/** Lista das conversas com o professor (mais recente primeiro; "NOVO" no não-lido). */
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
      setError('Não consegui carregar mais recados. Tente de novo.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-1 font-bold text-2xl [font-family:var(--font-display)]">
        Recados do professor
      </h1>
      <p className="mb-6 text-muted-foreground text-sm">
        De vez em quando o professor deixa um recado pra você aqui. 💬
      </p>

      {threads.length === 0 ? (
        <div className="rounded-2xl border-2 border-border border-dashed bg-card p-8 text-center">
          <Mail className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="font-bold">Tudo tranquilo por aqui 🎈</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Continue criando e enviando seus projetos! Se o professor quiser te falar alguma coisa,
            o recado aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/recados/${t.id}`}
                className="block rounded-2xl border-2 border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-primary text-xs uppercase tracking-wide">
                    {CONTEXT_LABEL[t.contextType]}
                  </span>
                  {t.unread ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-[10px] text-primary-foreground">
                      NOVO
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate font-bold [font-family:var(--font-display)]">
                  {t.title ?? 'Conversa com o professor'}
                </p>
                {t.lastMessagePreview ? (
                  <p className="mt-0.5 truncate text-muted-foreground text-sm">
                    {t.lastMessageRole === 'student' ? 'Você: ' : ''}
                    {t.lastMessagePreview}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-3 text-destructive text-sm">{error}</p> : null}
      {nextOffset !== null ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 rounded-full border-2 border-border px-4 py-2 font-bold text-sm hover:border-primary disabled:opacity-50"
        >
          {loadingMore ? 'Carregando…' : 'Ver mais recados'}
        </button>
      ) : null}
    </div>
  )
}
