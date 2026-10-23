'use client'

import type { LiveCatalogView } from '@sistemazero/core/live'
import { liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { useCallback, useEffect, useState } from 'react'
import { type AgendaGroups, groupLiveAgenda } from '@/lib/live-agenda'

const merge = <T extends { id: string }>(previous: T[], next: T[]) => [
  ...new Map([...previous, ...next].map((item) => [item.id, item])).values(),
]

export interface LiveAgendaState {
  data: LiveCatalogView | null
  groups: AgendaGroups | null
  error: string | null
  loadingMore: boolean
  retry: () => void
  loadMore: () => Promise<void>
}

/**
 * A agenda de quem conduz, lida UMA vez por tela: a página Encontros e o bloco "Encontros de
 * hoje" da Home usam esta mesma leitura (`/api/live/catalog`) e o mesmo agrupamento, para as
 * duas nunca discordarem sobre o que é "hoje".
 */
export function useLiveAgenda(): LiveAgendaState {
  const [data, setData] = useState<LiveCatalogView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reload, setReload] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  // biome-ignore lint/correctness/useExhaustiveDependencies: "Tentar de novo" invalida a agenda.
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    liveRequest<LiveCatalogView>('/api/live/catalog?limit=50', undefined, 'GET', controller.signal)
      .then((next) => {
        setData(next)
        setNow(Date.now())
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Não conseguimos abrir a agenda.')
      })
    return () => controller.abort()
  }, [reload])
  // Um encontro passa de "Próximos" para "Hoje" (e de "Hoje" para "Encerrados") sem recarregar.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const next = await liveRequest<LiveCatalogView>(
        `/api/live/catalog?limit=50&cursor=${encodeURIComponent(data.nextCursor)}`,
      )
      setData((previous) =>
        previous
          ? {
              ...next,
              programs: merge(previous.programs, next.programs),
              cohorts: merge(previous.cohorts, next.cohorts),
              sessions: merge(previous.sessions, next.sessions),
              enrollments: merge(previous.enrollments, next.enrollments),
            }
          : next,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não conseguimos carregar mais encontros.')
    } finally {
      setLoadingMore(false)
    }
  }, [data?.nextCursor, loadingMore])
  const retry = useCallback(() => setReload((value) => value + 1), [])
  const groups = data ? groupLiveAgenda(data.sessions, data.cohorts, now) : null
  return { data, groups, error, loadingMore, retry, loadMore }
}
