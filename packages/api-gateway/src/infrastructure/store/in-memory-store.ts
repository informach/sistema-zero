import type {
  BreakerCounters,
  GatewayStore,
  RateLimitHit,
  SlidingWindowHit,
} from '../../domain/ports/gateway-store.port'

interface FixedWindow {
  start: number
  count: number
}
interface BreakerWindow {
  start: number
  total: number
  fail: number
}
interface SlidingState {
  start: number
  curr: number
  prev: number
  win: number
}
interface CacheEntry {
  value: unknown
  expiresAt: number
}

/**
 * GatewayStore em memória (dev/single-replica). Rate limit por janela deslizante,
 * contador de janela fixa (breaker) e cache com TTL. Para escala/multi-réplica,
 * use o adapter Redis (mesma porta).
 */
export function createInMemoryStore(): GatewayStore {
  const windows = new Map<string, FixedWindow>()
  const breakers = new Map<string, BreakerWindow>()
  const sliding = new Map<string, SlidingState>()
  const cache = new Map<string, CacheEntry>()
  let sweepTimer: ReturnType<typeof setInterval> | undefined

  const sweep = () => {
    const now = Date.now()
    for (const [k, e] of cache) if (e.expiresAt <= now) cache.delete(k)
    for (const [k, w] of windows) if (w.start + 3_600_000 <= now) windows.delete(k)
    for (const [k, b] of breakers) if (b.start + 3_600_000 <= now) breakers.delete(k)
    for (const [k, s] of sliding) if (s.start + 3_600_000 <= now) sliding.delete(k)
  }

  return {
    async init() {
      sweepTimer = setInterval(sweep, 60_000)
      sweepTimer.unref?.()
    },

    async slidingWindow(key, windowMs, now): Promise<SlidingWindowHit> {
      const t = now ?? Date.now()
      let s = sliding.get(key)
      if (!s) {
        s = { start: t, curr: 0, prev: 0, win: windowMs }
        sliding.set(key, s)
      }
      s.win = windowMs
      const elapsed = t - s.start
      if (elapsed >= windowMs) {
        const passed = Math.floor(elapsed / windowMs)
        if (passed === 1) {
          s.prev = s.curr
          s.curr = 0
          s.start += windowMs
        } else {
          s.prev = 0
          s.curr = 0
          s.start = t
        }
      }
      const e2 = t - s.start
      const weight = Math.max(0, (windowMs - e2) / windowMs)
      s.curr += 1
      return { count: s.prev * weight + s.curr, resetMs: s.start + windowMs }
    },

    async slidingWindowRefund(key, windowResetMs) {
      const s = sliding.get(key)
      if (!s || s.curr <= 0) return
      // Só debita se a janela ainda for a mesma do hit original (resetMs confere).
      if (windowResetMs !== undefined && s.start + s.win !== windowResetMs) return
      s.curr -= 1
    },

    async increment(key, windowMs, now): Promise<RateLimitHit> {
      const t = now ?? Date.now()
      let w = windows.get(key)
      if (!w || w.start + windowMs <= t) {
        w = { start: t, count: 0 }
        windows.set(key, w)
      }
      w.count++
      return { count: w.count, nextReset: w.start + windowMs, start: w.start }
    },

    async recordOutcome(key, ok, windowMs, now): Promise<BreakerCounters> {
      const t = now ?? Date.now()
      let b = breakers.get(key)
      if (!b || b.start + windowMs <= t) {
        b = { start: t, total: 0, fail: 0 }
        breakers.set(key, b)
      }
      b.total++
      if (!ok) b.fail++
      return { total: b.total, fail: b.fail }
    },

    async reset(key) {
      if (key) {
        windows.delete(key)
        breakers.delete(key)
        sliding.delete(key)
        cache.delete(key)
      } else {
        windows.clear()
        breakers.clear()
        sliding.clear()
        cache.clear()
      }
    },
    async get<T>(key: string): Promise<T | null> {
      const e = cache.get(key)
      if (!e) return null
      if (e.expiresAt <= Date.now()) {
        cache.delete(key)
        return null
      }
      return e.value as T
    },
    async set<T>(key: string, value: T, ttlMs: number) {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
    async del(key) {
      cache.delete(key)
    },
    async kill() {
      if (sweepTimer) clearInterval(sweepTimer)
      windows.clear()
      breakers.clear()
      sliding.clear()
      cache.clear()
    },
  }
}
