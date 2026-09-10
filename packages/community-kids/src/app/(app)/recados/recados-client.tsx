'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { apiGet } from '@/lib/api'
import type { TeacherThreadContext, TeacherThreadSummaryView } from '@/lib/types'

const CONTEXT_LABEL: Record<TeacherThreadContext, string> = {
  lesson_section: 'Dúvida na aula',
  studio_submission: 'Sua entrega',
  mural_publication: 'Seu jogo no Mural',
  general: 'Recado',
}

/**
 * Lista das conversas com o professor (mais recente primeiro; "NOVO" no não-lido).
 * O cabeçalho da página mora na `page.tsx`, junto com as faixas — aqui fica só a
 * lista, que é a parte que precisa de estado.
 */
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
    <div className="mx-auto w-full max-w-2xl">
      {threads.length === 0 ? (
        <div className="kids-unit-verde">
          <KidsEmptyState
            icon={Mail}
            title="Tudo tranquilo por aqui"
            description="Continue criando e enviando seus projetos. Se o professor quiser te falar alguma coisa, o recado aparece aqui."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/recados/${t.id}`}
                className="kids-carta kid-pop block p-4 transition-colors hover:border-(--porta-recados)"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-(--porta-recados-texto) text-xs uppercase tracking-wide">
                    {CONTEXT_LABEL[t.contextType]}
                  </span>
                  {t.unread ? (
                    <span className="kids-marca rounded-full px-2 py-0.5 font-bold text-[10px]">
                      NOVO
                    </span>
                  ) : null}
                </div>
                <p className="sz-display mt-1 truncate text-base">
                  {t.title ?? 'Conversa com o professor'}
                </p>
                {t.lastMessagePreview ? (
                  <p className="mt-0.5 truncate font-semibold text-muted-foreground text-sm">
                    {t.lastMessageRole === 'student' ? 'Você: ' : ''}
                    {t.lastMessagePreview}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-3 font-semibold text-destructive text-sm">{error}</p> : null}
      {nextOffset !== null ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 rounded-full border-(--linha-carta) border-2 bg-card px-4 py-2 font-bold text-sm hover:border-primary disabled:opacity-50"
        >
          {loadingMore ? 'Carregando…' : 'Ver mais recados'}
        </button>
      ) : null}
    </div>
  )
}
