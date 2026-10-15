import { proStorageBinding } from '@sistemazero/core/studio/pro-storage'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { connectProStorage, type ProStorageBackend } from './proStorageHost'

/** Explicit backend: candidate callers cannot accidentally acquire the project's durable storage. */
export function useProStorageBridge(input: {
  frame: RefObject<HTMLIFrameElement | null>
  backend: ProStorageBackend | null
  identity: string
  revision: number
  origin: string | null
  onConnected?: () => void
}): string {
  const { frame, backend, identity, origin, revision } = input
  const connected = useRef(input.onConnected)
  connected.current = input.onConnected
  // The numeric revision is a bridge binding, not the source or compiled-artifact digest.
  // biome-ignore lint/correctness/useExhaustiveDependencies: capture revision only for a new document identity
  const session = useMemo(
    () => ({ token: crypto.randomUUID().replaceAll('-', ''), revision }),
    [identity, backend],
  )
  useEffect(() => {
    if (!backend || !origin) return
    let disconnect: (() => void) | null = null
    const receive = (event: MessageEvent) => {
      const next = connectProStorage(event, {
        source: frame.current?.contentWindow ?? null,
        origin,
        ...session,
        backend,
      })
      if (next) {
        disconnect?.()
        disconnect = next
        connected.current?.()
      }
    }
    window.addEventListener('message', receive)
    return () => {
      window.removeEventListener('message', receive)
      disconnect?.()
    }
  }, [backend, origin, session, frame])
  return proStorageBinding(session.token, session.revision)
}

/** Bounded by the same protocol limits as persisted storage; lifetime belongs to one preview. */
export function createEphemeralProStorage(): ProStorageBackend & {
  clear(): void
  dispose(): void
} {
  let data: Record<string, string> = Object.create(null)
  let disposed = false
  return {
    async load() {
      if (disposed) throw new Error('Experiência encerrada.')
      return Object.assign(Object.create(null), data)
    },
    async write(next) {
      if (disposed) throw new Error('Experiência encerrada.')
      data = Object.assign(Object.create(null), next)
    },
    clear() {
      data = Object.create(null)
    },
    dispose() {
      disposed = true
      data = Object.create(null)
    },
  }
}
