/** Status de upstream que justificam retry (apenas para métodos idempotentes). */
export const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([502, 503, 504])

/**
 * Backoff exponencial com FULL jitter (`random()*exp`, faixa `[0, exp]`): decorrela
 * tentativas de clientes concorrentes contra um upstream em recuperação (evita o
 * thundering-herd sincronizado de um piso fixo). Ver AWS "Exponential Backoff and Jitter".
 */
export function backoffDelayMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt)
  return Math.floor(Math.random() * exp)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => {
    const t = setTimeout(r, ms)
    t.unref?.()
  })
}
