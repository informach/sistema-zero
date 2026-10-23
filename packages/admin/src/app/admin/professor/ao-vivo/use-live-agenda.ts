'use client'

import type { LiveCatalogView } from '@sistemazero/core/live'
import { liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { useCallback, useEffect, useRef, useState } from 'react'
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

interface AgendaReadScope {
  controller: AbortController
  nextCursor: string | null
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
  const scope = useRef<AgendaReadScope | null>(null)
  const pagination = useRef<AbortController | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: "Tentar de novo" invalida a agenda.
  useEffect(() => {
    const controller = new AbortController()
    const owner: AgendaReadScope = { controller, nextCursor: null }
    scope.current = owner
    pagination.current?.abort()
    pagination.current = null
    setLoadingMore(false)
    setError(null)
    liveRequest<LiveCatalogView>('/api/live/catalog?limit=50', undefined, 'GET', controller.signal)
      .then((next) => {
        if (controller.signal.aborted || scope.current !== owner) return
        owner.nextCursor = next.nextCursor ?? null
        setData((previous) =>
          controller.signal.aborted || scope.current !== owner ? previous : next,
        )
        setNow(Date.now())
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Não conseguimos abrir a agenda.')
      })
    return () => {
      controller.abort()
      if (scope.current === owner) {
        scope.current = null
        pagination.current?.abort()
        pagination.current = null
      }
    }
  }, [reload])
  // Um encontro passa de "Próximos" para "Hoje" (e de "Hoje" para "Encerrados") sem recarregar.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const loadMore = useCallback(async () => {
    const owner = scope.current
    const cursor = owner?.nextCursor
    // O cursor pertence à leitura vigente, inclusive antes de o React pintar o resultado.
    if (!owner || owner.controller.signal.aborted || !cursor || pagination.current) return
    const controller = new AbortController()
    pagination.current = controller
    const cancel = () => controller.abort()
    owner.controller.signal.addEventListener('abort', cancel, { once: true })
    const current = () => scope.current === owner && !owner.controller.signal.aborted
    setLoadingMore(true)
    try {
      const next = await liveRequest<LiveCatalogView>(
        `/api/live/catalog?limit=50&cursor=${encodeURIComponent(cursor)}`,
        undefined,
        'GET',
        controller.signal,
      )
      if (!current() || controller.signal.aborted) return
      owner.nextCursor = next.nextCursor ?? null
      setData((previous) =>
        current() && previous?.nextCursor === cursor
          ? {
              ...next,
              programs: merge(previous.programs, next.programs),
              cohorts: merge(previous.cohorts, next.cohorts),
              sessions: merge(previous.sessions, next.sessions),
              enrollments: merge(previous.enrollments, next.enrollments),
            }
          : previous,
      )
    } catch (cause) {
      if (current() && !controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : 'Não conseguimos carregar mais encontros.',
        )
    } finally {
      owner.controller.signal.removeEventListener('abort', cancel)
      if (pagination.current === controller) {
        pagination.current = null
        if (current()) setLoadingMore(false)
      }
    }
  }, [])
  const retry = useCallback(() => {
    scope.current?.controller.abort()
    setReload((value) => value + 1)
  }, [])
  const groups = data ? groupLiveAgenda(data.sessions, data.cohorts, now) : null
  return { data, groups, error, loadingMore, retry, loadMore }
}
