import { Elysia } from 'elysia'
import type { HealthRegistry } from '../../../domain/resilience/health.port'
import type { MetricsRegistry } from '../../../infrastructure/observability/metrics-registry'

export interface MetricsRoutesDeps {
  metrics: MetricsRegistry
  health: HealthRegistry
}

/**
 * GET /metrics — sem auth (exponha apenas na rede interna). `?format=prom`
 * devolve texto Prometheus; caso contrário, JSON.
 */
export function metricsRoutes(deps: MetricsRoutesDeps) {
  return new Elysia().get('/metrics', ({ query }) => {
    if (query.format === 'prom') {
      return new Response(deps.metrics.prometheus(), {
        headers: { 'content-type': 'text/plain; version=0.0.4' },
      })
    }
    return { ...deps.metrics.snapshot(), upstreams: deps.health.snapshot() }
  })
}
