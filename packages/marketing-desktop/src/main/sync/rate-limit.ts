import { setTimeout as delay } from 'node:timers/promises'
import { type SyncTransport, SyncTransportError } from './sync-engine'

/** Only explicit 429 responses are retried; an uncertain commit is left for receipt recovery. */
export function rateLimitedTransport(
  transport: SyncTransport,
  signal: AbortSignal,
  onWait: (milliseconds: number) => void = () => {},
  wait: (milliseconds: number, signal: AbortSignal) => Promise<unknown> = (milliseconds, signal) =>
    delay(milliseconds, undefined, { signal }),
): SyncTransport {
  return {
    async request(path, method, body) {
      let retries = 0,
        waited = 0
      for (;;) {
        signal.throwIfAborted()
        try {
          return await transport.request(path, method, body)
        } catch (error) {
          signal.throwIfAborted()
          if (
            !(error instanceof SyncTransportError) ||
            error.status !== 429 ||
            error.retryAfterMs === undefined ||
            !Number.isSafeInteger(error.retryAfterMs) ||
            error.retryAfterMs < 0 ||
            error.retryAfterMs > 120000 ||
            retries === 3 ||
            waited + error.retryAfterMs > 180000
          )
            throw error
          retries++
          waited += error.retryAfterMs
          onWait(error.retryAfterMs)
          await wait(error.retryAfterMs, signal)
        }
      }
    },
  }
}
