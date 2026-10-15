import { PRO_STORAGE_LIMITS } from '@sistemazero/core/studio/pro-limits'
import {
  applyProStorageOperation,
  isProStorageHello,
  PRO_STORAGE_SOURCE,
  parseProStorageRequest,
} from '@sistemazero/core/studio/pro-storage'

export interface ProStorageBackend {
  load(): Promise<Record<string, string>>
  write(data: Record<string, string>): Promise<void>
}

/** One channel/document. No wildcard-origin response and no access to host localStorage. */
export function connectProStorage(
  event: MessageEvent,
  options: {
    source: Window | null
    origin: string
    token: string
    revision: number
    backend: ProStorageBackend
  },
): (() => void) | null {
  if (
    !options.source ||
    event.source !== options.source ||
    event.origin !== options.origin ||
    !isProStorageHello(event.data, options.token, options.revision) ||
    event.ports.length !== 1
  )
    return null
  const port = event.ports[0]!
  let closed = false,
    pending = 0,
    lastId = 0
  let data: Record<string, string> = Object.create(null)
  const reply = (message: Record<string, unknown>) => {
    if (!closed) port.postMessage({ source: PRO_STORAGE_SOURCE, token: options.token, ...message })
  }
  let queue = options.backend
    .load()
    .then((snapshot) => {
      data = snapshot
      reply({ ready: true })
    })
    .catch(() => {
      closed = true
      port.close()
    })
  port.onmessage = (event) => {
    const request = parseProStorageRequest(event.data, options.token)
    if (!request || request.id <= lastId) return
    lastId = request.id
    if (pending >= PRO_STORAGE_LIMITS.maxPending) {
      reply({ id: request.id, ok: false })
      return
    }
    pending++
    queue = queue
      .then(async () => {
        if (closed) return
        const next = applyProStorageOperation(data, request)
        if (next.changed) await options.backend.write(next.data)
        if (closed) return
        data = next.data
        reply({ id: request.id, ok: true, value: next.value })
      })
      .catch(() => reply({ id: request.id, ok: false }))
      .finally(() => {
        pending--
      })
  }
  port.start()
  return () => {
    closed = true
    port.onmessage = null
    port.close()
  }
}
