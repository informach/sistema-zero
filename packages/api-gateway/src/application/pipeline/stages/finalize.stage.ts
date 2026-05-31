import type { RateLimiter } from '../../rate-limit/rate-limiter'
import type { Stage } from '../stage.port'

/** Coletor de métricas (estruturalmente satisfeito pela MetricsRegistry). */
export interface MetricsRecorder {
  record(status: number, latencyMs: number): void
}

/**
 * Finalizer: injeta X-Request-Id e headers RateLimit-*, refunda o contador em
 * respostas 5xx (não penaliza o cliente por falha do upstream), registra métricas
 * e emite o access log.
 */
export function createFinalizeStage(rateLimiter: RateLimiter, metrics?: MetricsRecorder): Stage {
  return {
    name: 'finalize',
    async run(ctx) {
      ctx.responseHeaders.set('x-request-id', ctx.requestId)

      if (ctx.rateLimit) {
        ctx.responseHeaders.set('ratelimit-limit', String(ctx.rateLimit.limit))
        ctx.responseHeaders.set('ratelimit-remaining', String(ctx.rateLimit.remaining))
        ctx.responseHeaders.set(
          'ratelimit-reset',
          String(Math.max(0, Math.ceil((ctx.rateLimit.resetMs - Date.now()) / 1000))),
        )
      }

      const status = ctx.response?.status ?? 500
      if (ctx.rateLimit && status >= 500) {
        await rateLimiter.refund(ctx.rateLimit.key)
      }

      const latencyMs = Date.now() - ctx.startedAt
      metrics?.record(status, latencyMs)

      ctx.logger.info('gateway.access', {
        requestId: ctx.requestId,
        traceId: ctx.traceId,
        method: ctx.method,
        path: ctx.url.pathname,
        route: ctx.route?.route.id,
        service: ctx.route?.route.service,
        version: ctx.requestedVersion,
        principal: ctx.principal?.subject,
        target: ctx.upstreamTarget,
        attempts: ctx.attempts,
        status,
        latencyMs,
      })
      return undefined
    },
  }
}
