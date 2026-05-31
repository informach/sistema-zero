/** Status de upstream que justificam retry (apenas para métodos idempotentes). */
export const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([502, 503, 504])

/** Backoff exponencial com jitter (full jitter na metade superior). */
export function backoffDelayMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt)
  return Math.floor(exp / 2 + Math.random() * (exp / 2))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => {
    const t = setTimeout(r, ms)
    t.unref?.()
  })
}
