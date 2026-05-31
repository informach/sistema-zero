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

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000,
  ) {}

  check(key: string): RateLimitResult {
    const now = Date.now()
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
}
