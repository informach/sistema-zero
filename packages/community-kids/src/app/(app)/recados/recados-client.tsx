'use client'

import { ChevronRight, Mail, Sparkles } from 'lucide-react'
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
    <div className="w-full">
      {threads.length === 0 ? (
        <KidsEmptyState
          icon={Mail}
          title="Tudo tranquilo por aqui"
          description="Continue criando e enviando seus projetos. Se o professor quiser te falar alguma coisa, o recado aparece aqui."
          action={
            <Link
              href="/criar"
              prefetch={false}
              className="sz-btn-gradient h-[3.125rem] gap-2.5 px-6 text-base"
            >
              <Sparkles className="size-[1.125rem]" aria-hidden />
              Continuar criando
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/recados/${t.id}`}
                className="kids-carta kid-pop flex items-center gap-4 rounded-[1.25rem] p-5 transition-shadow hover:ring-2 hover:ring-primary"
              >
                {/* O ladrilho âmbar é a cor da porta dos Recados na Comunidade: a
                    criança chega aqui por ela e reconhece o lugar. */}
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-[0.75rem] bg-(--tool-pensa) text-(--tool-pensa-fg)"
                >
                  <Mail className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {/* Rótulo, e não ação: tinta sobre o céu. O azul de ação dava 4,27:1 no
                        céu do Pen (4,08 no Pink); a cor de ação fica para o "NOVO". */}
                    <span className="rounded-full bg-(--band-ceu) px-2.5 py-0.5 font-bold text-foreground text-xs">
                      {CONTEXT_LABEL[t.contextType]}
                    </span>
                    {t.unread ? (
                      <span className="kids-marca rounded-full px-2.5 py-0.5 font-bold text-xs">
                        NOVO
                      </span>
                    ) : null}
                  </span>
                  <span className="sz-display mt-1.5 block truncate text-lg">
                    {t.title ?? 'Conversa com o professor'}
                  </span>
                  {t.lastMessagePreview ? (
                    <span className="mt-0.5 block truncate font-medium text-muted-foreground text-sm">
                      {t.lastMessageRole === 'student' ? 'Você: ' : ''}
                      {t.lastMessagePreview}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
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
          className="sz-btn-gradient sz-btn-contorno mt-5 disabled:opacity-50"
        >
          {loadingMore ? 'Carregando…' : 'Ver mais recados'}
        </button>
      ) : null}
    </div>
  )
}
