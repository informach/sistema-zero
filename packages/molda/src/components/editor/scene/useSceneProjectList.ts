import { useCallback, useEffect, useRef, useState } from 'react'
import type { createScenePersistence } from '../../../state/scenePersistence'

export type SceneProjectLibrary = Pick<
  ReturnType<typeof createScenePersistence>,
  'listSummaries' | 'subscribe'
>
type Listing = Awaited<ReturnType<SceneProjectLibrary['listSummaries']>>

/** List metadata only. Late reads cannot install another namespace's list. */
export function useSceneProjectList(persistence: SceneProjectLibrary) {
  const [state, setState] = useState<{
    owner: SceneProjectLibrary
    listing: Listing | null
    error: boolean
  }>({
    owner: persistence,
    listing: null,
    error: false,
  })
  const request = useRef<() => Promise<void>>(() => Promise.resolve())
  const refresh = useCallback(() => request.current(), [])
  useEffect(() => {
    const abort = new AbortController()
    let active = true,
      wanted = false
    let inflight: Promise<void> | null = null
    let unsubscribe: (() => void) | null = null
    const load = (): Promise<void> => {
      if (!active) return Promise.resolve()
      wanted = true
      if (inflight) return inflight
      const run: Promise<void> = Promise.resolve()
        .then(async () => {
          while (active && wanted) {
            wanted = false
            try {
              const listing = await persistence.listSummaries()
              if (active) setState({ owner: persistence, listing, error: false })
            } catch {
              if (active)
                setState((previous) => ({
                  owner: persistence,
                  listing: previous.owner === persistence ? previous.listing : null,
                  error: true,
                }))
            }
          }
        })
        .finally(() => {
          if (inflight === run) inflight = null
          if (active && wanted) return load()
        })
      inflight = run
      return run
    }
    request.current = load
    void persistence
      .subscribe(() => {
        void load()
      }, abort.signal)
      .then(
        (connection) => {
          if (!active) {
            connection.unsubscribe()
            return
          }
          unsubscribe = connection.unsubscribe
          void load()
        },
        () => {
          if (active) void load()
        },
      )
    return () => {
      active = false
      request.current = () => Promise.resolve()
      unsubscribe?.()
      abort.abort()
    }
  }, [persistence])
  return {
    listing: state.owner === persistence ? state.listing : null,
    error: state.owner === persistence && state.error,
    refresh,
  }
}
