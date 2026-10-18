'use client'

import { apiGet } from '@sistemazero/member-shell/lib/api'
import { applyGamificationDelta } from '@sistemazero/member-shell/lib/gamification-delta'
import type { GamificationDelta, GamificationMeView } from '@sistemazero/member-shell/lib/types'
import { usePathname } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const Context = createContext<{
  progress: GamificationMeView | null
  unavailable: boolean
  reward: (delta: GamificationDelta | null | undefined) => void
  refresh: () => void
} | null>(null)

export function AdultGamificationProvider({
  initial,
  children,
}: {
  initial: GamificationMeView | null
  children: ReactNode
}) {
  const pathname = usePathname()
  const [progress, setProgress] = useState(initial)
  const [unavailable, setUnavailable] = useState(initial === null)
  const pending = useRef<AbortController | null>(null)
  const refresh = useCallback(() => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    apiGet<GamificationMeView>('/api/members/gamification/me', undefined, {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return
        setProgress(result)
        setUnavailable(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true)
      })
  }, [])
  const reward = useCallback(
    (delta: GamificationDelta | null | undefined) => {
      pending.current?.abort()
      if (delta) setProgress((current) => applyGamificationDelta(current, delta))
      refresh()
    },
    [refresh],
  )
  useEffect(() => () => pending.current?.abort(), [])
  const value = useMemo(
    () => ({ progress, unavailable, reward, refresh }),
    [progress, unavailable, reward, refresh],
  )
  return (
    <Context.Provider value={value}>
      <RefreshOnNavigation key={`${pathname}:${JSON.stringify(initial)}`} refresh={refresh} />
      {children}
    </Context.Provider>
  )
}

function RefreshOnNavigation({ refresh }: { refresh: () => void }) {
  useEffect(refresh, [refresh])
  return null
}

export function useAdultGamification() {
  return useContext(Context)
}
