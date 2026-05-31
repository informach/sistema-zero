import type { RateLimiter } from '../../rate-limit/rate-limiter'
import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

export interface RateLimitDeps {
  rateLimiter: RateLimiter
  defaultMax: number
  defaultWindowMs: number
}

/**
 * Rate limit por identidade (principal → fallback IP), com regra por rota e
 * default global. 429 + Retry-After quando excede. O contador é refundado em 5xx
 * pelo finalize stage (não conta falhas do upstream contra o cliente).
 */
export function createRateLimitStage(deps: RateLimitDeps): Stage {
  return {
    name: 'rate-limit',
    async run(ctx) {
      if (!ctx.route) return undefined
      const rule = ctx.route.route.rateLimit
      const max = rule?.max ?? deps.defaultMax
      const windowMs = rule?.windowMs ?? deps.defaultWindowMs
      const by = rule?.by ?? 'principal'
      const identity = by === 'ip' ? ctx.clientIp : (ctx.principal?.subject ?? ctx.clientIp)
      const key = `rl:${ctx.route.route.id}:${identity}`

      const decision = await deps.rateLimiter.check(key, max, windowMs)
      ctx.rateLimit = {
        key,
        limit: decision.limit,
        remaining: decision.remaining,
        resetMs: decision.resetMs,
        retryAfterSeconds: decision.retryAfterSeconds,
      }
      if (!decision.allowed) {
        return errorResponse(429, 'TOO_MANY_REQUESTS', 'Limite de requisições excedido', {
          'retry-after': String(decision.retryAfterSeconds),
        })
      }
      return undefined
    },
  }
}
