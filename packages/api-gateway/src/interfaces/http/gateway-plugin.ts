import { cors } from '@elysiajs/cors'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import { createContext, resolveClientIp } from '../../application/pipeline/context'
import type { Pipeline } from '../../application/pipeline/pipeline'
import type { GatewayStore } from '../../domain/ports/gateway-store.port'
import type { HealthRegistry } from '../../domain/resilience/health.port'
import { buildCorsPluginOptions } from '../../infrastructure/config/cors.config'
import type { Env } from '../../infrastructure/config/env'
import type { CorsConfig } from '../../infrastructure/config/gateway-config.schema'
import type { MetricsRegistry } from '../../infrastructure/observability/metrics-registry'
import { buildGatewayErrorResponse } from './error-handler'
import { healthRoutes } from './routes/health.routes'
import { metricsRoutes } from './routes/metrics.routes'

export interface GatewayAppDeps {
  env: Env
  logger: Logger
  pipeline: Pipeline
  corsConfig?: CorsConfig
  health: HealthRegistry
  store: GatewayStore
  metrics: MetricsRegistry
  targetIds: readonly string[]
  getDraining: () => boolean
  /** Maior timeout de upstream da config (ms) — dimensiona o idleTimeout do servidor. */
  maxUpstreamTimeoutMs: number
}

/**
 * `idleTimeout` do Bun.serve (em SEGUNDOS) derivado do maior timeout de upstream.
 * O Bun fecha conexões após `idleTimeout` SEM bytes trafegados — INCLUSIVE
 * requisições em voo cujo upstream ainda não respondeu (TTFB lento). O default
 * (10s) resetaria a conexão do cliente em qualquer rota mais lenta que 10s
 * (ex.: `payments-create` a 35s, Efí fria) — anulando os `timeoutMs` da config.
 * Folga de 10s sobre o maior timeout; cap no máximo do Bun (255s). Nunca 0
 * (desabilitaria a colheita de conexões keep-alive ociosas na borda pública).
 */
export function idleTimeoutSecondsFor(maxUpstreamTimeoutMs: number): number {
  const base =
    Number.isFinite(maxUpstreamTimeoutMs) && maxUpstreamTimeoutMs > 0
      ? maxUpstreamTimeoutMs
      : 15_000
  return Math.min(255, Math.ceil(base / 1000) + 10)
}

/**
 * App Elysia do gateway: preserva o corpo (não consome → streaming), trata erros
 * inesperados, aplica CORS (preflight), expõe health/metrics e roteia TODO o resto
 * pelo pipeline (Chain of Responsibility) via catch-all `.all('/*')`.
 */
export function createGatewayApp(deps: GatewayAppDeps) {
  return (
    // `maxRequestBodySize` enforça o teto do corpo no nível do Bun.serve (413
    // automático), de forma robusta — sem pipar o stream de entrada (frágil no Bun).
    // `idleTimeout` DEVE cobrir o upstream mais lento (ver idleTimeoutSecondsFor).
    new Elysia({
      serve: {
        maxRequestBodySize: deps.env.MAX_REQUEST_BODY_BYTES,
        idleTimeout: idleTimeoutSecondsFor(deps.maxUpstreamTimeoutMs),
      },
    })
      // Retornar o corpo (stream) faz o Elysia pular o parser default e NÃO consumir
      // o stream → o proxy encaminha o corpo intacto. '' quando não há corpo.
      .onParse({ as: 'global' }, ({ request }) => request.body ?? '')
      .onError({ as: 'global' }, ({ code, error, set }) => {
        const { status, body } = buildGatewayErrorResponse({ code, error, logger: deps.logger })
        set.status = status
        return body
      })
      .use(cors(buildCorsPluginOptions(deps.corsConfig)))
      .use(
        healthRoutes({
          health: deps.health,
          store: deps.store,
          targetIds: deps.targetIds,
          getDraining: deps.getDraining,
          metricsToken: deps.env.METRICS_TOKEN,
        }),
      )
      .use(
        metricsRoutes({
          metrics: deps.metrics,
          health: deps.health,
          token: deps.env.METRICS_TOKEN,
        }),
      )
      .all('/*', ({ request, server }) => {
        const socketIp = server?.requestIP(request)?.address ?? ''
        const clientIp = resolveClientIp(
          socketIp,
          request.headers,
          deps.env.TRUST_PROXY,
          deps.env.TRUSTED_PROXY_HOPS,
        )
        const ctx = createContext({ request, clientIp, logger: deps.logger })
        return deps.pipeline.run(ctx)
      })
  )
}
