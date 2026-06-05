import { envelope } from '@sistemazero/core/http'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import type { HealthRegistry } from '../../../domain/resilience/health.port'
import type { MetricsRegistry } from '../../../infrastructure/observability/metrics-registry'

export interface MetricsRoutesDeps {
  metrics: MetricsRegistry
  health: HealthRegistry
  /** Token de acesso (header `x-metrics-token` ou `Authorization: Bearer`). */
  token?: string
}

/**
 * Extrai o token de métricas da requisição (`x-metrics-token` ou Bearer) e o
 * compara em tempo constante. Sem token configurado (dev) → liberado.
 */
export function metricsTokenOk(headers: Headers, token: string | undefined): boolean {
  if (!token) return true
  const auth = headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined
  const provided = headers.get('x-metrics-token') ?? bearer
  return Boolean(provided && safeEqual(provided, token))
}

/**
 * GET /metrics — o gateway é a BORDA pública, então a rota exige token quando
 * `METRICS_TOKEN` está definido (em produção o boot o EXIGE — refine no env):
 * header `x-metrics-token` ou `Authorization: Bearer <token>`. `?format=prom`
 * devolve texto Prometheus; caso contrário, JSON.
 */
export function metricsRoutes(deps: MetricsRoutesDeps) {
  return new Elysia().get('/metrics', ({ request, query }) => {
    if (!metricsTokenOk(request.headers, deps.token)) {
      return new Response(JSON.stringify(envelope('UNAUTHORIZED', 'Token de métricas inválido')), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (query.format === 'prom') {
      return new Response(deps.metrics.prometheus(), {
        headers: { 'content-type': 'text/plain; version=0.0.4' },
      })
    }
    return { ...deps.metrics.snapshot(), upstreams: deps.health.snapshot() }
  })
}
