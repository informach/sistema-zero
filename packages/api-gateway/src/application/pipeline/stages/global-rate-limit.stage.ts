import type { RateLimiter } from '../../rate-limit/rate-limiter'
import { errorResponse } from '../responses'
import type { Stage } from '../stage.port'
import type { RateLimitMetrics } from './rate-limit.stage'

export interface GlobalRateLimitDeps {
  rateLimiter: RateLimiter
  max: number
  windowMs: number
  metrics?: RateLimitMetrics
}

/**
 * Safety-net GLOBAL por IP, sobre TODAS as rotas — defende contra um atacante que
 * espalha flood por várias rotas para furar os limites por-rota. Roda DEPOIS do auth:
 *
 *  - **Isenta clientes autenticados** (`ctx.principal`): o cliente legítimo primário
 *    (ex.: o `funnel`, um único IP de egress S2S) não pode ser estrangulado por um
 *    teto por-IP. Logo o net cobre só tráfego anônimo/público.
 *  - **Não** seta `ctx.rateLimit`: os headers `RateLimit-*` continuam refletindo o
 *    limite por-rota (mais informativo). Sem refund (teto grosseiro e alto).
 *  - **Fail-open** em erro do store (igual ao stage por-rota): libera, loga, conta.
 *
 * Habilitado pela composition-root só quando `max > 0`.
 */
export function createGlobalRateLimitStage(deps: GlobalRateLimitDeps): Stage {
  return {
    name: 'global-rate-limit',
    async run(ctx) {
      if (ctx.principal) return undefined // cliente autenticado é isento do net global
      const key = `grl:${ctx.clientIp}`

      let decision: Awaited<ReturnType<typeof deps.rateLimiter.check>>
      try {
        decision = await deps.rateLimiter.check(key, deps.max, deps.windowMs)
      } catch (error) {
        deps.metrics?.recordRateLimitFailOpen()
        ctx.logger.warn('gateway.rate_limit_unavailable', {
          requestId: ctx.requestId,
          scope: 'global',
          error: error instanceof Error ? error.message : String(error),
        })
        return undefined
      }

      if (!decision.allowed) {
        ctx.logger.warn('gateway.global_rate_limit_exceeded', {
          requestId: ctx.requestId,
          clientIp: ctx.clientIp,
          route: ctx.route?.route.id,
        })
        return errorResponse(429, 'TOO_MANY_REQUESTS', 'Limite global de requisições excedido', {
          'retry-after': String(decision.retryAfterSeconds),
        })
      }
      return undefined
    },
  }
}
