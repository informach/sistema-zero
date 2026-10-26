'use client'

import { type ComponentType, useCallback, useEffect, useRef } from 'react'
import { apiGet, apiSend } from '@/lib/api'
import { communityQuery } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import { usePlatform } from './platform-provider'

/** Changing community retires the entire page's drafts, selections and pagination. */
export function communityPage<Props extends object>(
  Page: ComponentType<Props & { audience: Platform }>,
) {
  return function CommunityPage(props: Props) {
    const audience = usePlatform()
    return <Page key={audience} {...props} audience={audience} />
  }
}

/** Every request belongs to the mounted community page, never to the mutable cookie. */
export function useCommunityRequests(audience: Platform | 'unassigned') {
  const owner = useRef<{ controller: AbortController; audience: Platform | 'unassigned' } | null>(
    null,
  )
  useEffect(() => {
    const controller = new AbortController()
    owner.current = { controller, audience }
    return () => {
      controller.abort()
      owner.current = null
    }
  }, [audience])

  const get = useCallback(
    <T,>(path: string) => {
      const controller = owner.current?.audience === audience ? owner.current.controller : null
      if (!controller) return Promise.reject<T>(new DOMException('Page closed', 'AbortError'))
      return apiGet<T>(communityQuery(path, audience), { signal: controller.signal }).then(
        (result) => {
          controller.signal.throwIfAborted()
          return result
        },
      )
    },
    [audience],
  )
  const send = useCallback(
    <T,>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) => {
      const controller = owner.current?.audience === audience ? owner.current.controller : null
      if (!controller) return Promise.reject<T>(new DOMException('Page closed', 'AbortError'))
      return apiSend<T>(communityQuery(path, audience), method, body, {
        signal: controller.signal,
      }).then((result) => {
        controller.signal.throwIfAborted()
        return result
      })
    },
    [audience],
  )
  return { get, send }
}
