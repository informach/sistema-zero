import type { RateLimiter } from '../../rate-limit/rate-limiter'
import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'

/** Sinal alertável de fail-open (estruturalmente satisfeito pela MetricsRegistry). */
export interface RateLimitMetrics {
  recordRateLimitFailOpen(): void
}

export interface RateLimitDeps {
  rateLimiter: RateLimiter
  defaultMax: number
  defaultWindowMs: number
  metrics?: RateLimitMetrics
}

function jsonFieldValue(rawBody: string | undefined, field: string | undefined): string | null {
  if (!rawBody || !field) return null
  try {
    let value: unknown = JSON.parse(rawBody)
    for (const segment of field.split('.')) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null
      value = Reflect.get(value, segment)
    }
    return typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null
  } catch {
    return null
  }
}

/**
 * Rate limit por IP, principal ou campo de corpo autenticado por HMAC, com regra
 * por rota e default global. 429 + Retry-After quando excede. O contador é
 * refundado em 5xx pelo finalize stage (não conta falhas do upstream).
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
      const principalIdentity = ctx.principal?.subject ?? ctx.clientIp
      const actorIdentity = by === 'json-field' ? jsonFieldValue(ctx.rawBody, rule?.field) : null
      const identity =
        by === 'ip'
          ? ctx.clientIp
          : actorIdentity
            ? `${principalIdentity}:${JSON.stringify(actorIdentity)}`
            : principalIdentity
      const key = `rl:${ctx.route.route.id}:${identity}`

      let decision: Awaited<ReturnType<typeof deps.rateLimiter.check>>
      try {
        decision = await deps.rateLimiter.check(key, max, windowMs)
      } catch (error) {
        // Store indisponível (ex.: Redis fora): FAIL-OPEN. Um soluço de infra não
        // pode derrubar toda a API com 500 — libera, registra e conta para alerta.
        deps.metrics?.recordRateLimitFailOpen()
        ctx.logger.warn('gateway.rate_limit_unavailable', {
          requestId: ctx.requestId,
          route: ctx.route.route.id,
          error: error instanceof Error ? error.message : String(error),
        })
        return undefined
      }
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
