export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

/**
 * Rate limiter de janela fixa, em memória, por chave (ex.: consumerId).
 *
 * É **por instância** (coarse) — suficiente como proteção de backpressure. Para
 * um limite global preciso entre réplicas, troque por um backend compartilhado
 * (ex.: Redis) mantendo esta interface.
 */
export class InMemoryRateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>()
  private nextSweepAt = 0

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
  ) {}

  check(key: string): RateLimitResult {
    const now = Date.now()
    this.sweep(now)
    const current = this.windows.get(key)

    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true }
    }

    if (current.count >= this.limit) {
      return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) }
    }

    current.count++
    return { allowed: true }
  }

  /**
   * Expurgo preguiçoso: no máximo uma varredura O(n) por janela, removendo
   * entradas já expiradas. Sem isso o `Map` só cresce — chaves vistas uma vez
   * (ex.: muitos consumidores, ou uma futura chave por IP) ficariam retidas
   * para sempre.
   */
  private sweep(now: number): void {
    if (now < this.nextSweepAt) return
    this.nextSweepAt = now + this.windowMs
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key)
    }
  }
}
