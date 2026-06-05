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
    new Elysia({ serve: { maxRequestBodySize: deps.env.MAX_REQUEST_BODY_BYTES } })
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
