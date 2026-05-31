import type { GatewayStore } from '../../domain/ports/gateway-store.port'

export interface RateDecision {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetMs: number
}

export interface RateLimiter {
  check(key: string, max: number, windowMs: number): Promise<RateDecision>
  refund(key: string): Promise<void>
}

/**
 * Rate limiter por **janela deslizante** sobre o GatewayStore (in-memory ou Redis
 * conforme o store). A contagem ponderada elimina o burst de 2× da virada da
 * janela do fixed-window.
 */
export function createRateLimiter(store: GatewayStore): RateLimiter {
  return {
    async check(key, max, windowMs): Promise<RateDecision> {
      const { count, resetMs } = await store.slidingWindow(key, windowMs)
      const allowed = count <= max
      const remaining = Math.max(0, Math.floor(max - count))
      const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((resetMs - Date.now()) / 1000))
      return { allowed, limit: max, remaining, retryAfterSeconds, resetMs }
    },
    async refund(key) {
      await store.slidingWindowRefund(key)
    },
  }
}
