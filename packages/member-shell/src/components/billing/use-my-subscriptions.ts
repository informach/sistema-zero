'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '../../lib/api'
import type { MySubscriptionView } from '../../lib/subscription-card'

/** A failed/stale read must not silently mean "no subscription" or keep old financial actions. */
export function useMySubscriptions() {
  const [subscriptions, setSubscriptions] = useState<MySubscriptionView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const refresh = useCallback(async () => {
    if (!mounted.current) return
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setLoading(true)
    setError(false)
    try {
      const data = await apiGet<{ items: MySubscriptionView[] }>(
        '/api/payments/my/subscriptions',
        undefined,
        { signal: controller.signal },
      )
      if (!Array.isArray(data?.items)) throw new Error('Invalid subscription list')
      if (!controller.signal.aborted) setSubscriptions(data.items)
    } catch {
      if (!controller.signal.aborted) {
        setSubscriptions([])
        setError(true)
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => {
      mounted.current = false
      active.current?.abort()
    }
  }, [refresh])
  return { subscriptions, loading, error, refresh }
}
