import { Elysia } from 'elysia'
import type { GatewayStore } from '../../../domain/ports/gateway-store.port'
import type { HealthRegistry } from '../../../domain/resilience/health.port'
import { metricsTokenOk } from './metrics.routes'

export interface HealthRoutesDeps {
  health: HealthRegistry
  store: GatewayStore
  targetIds: readonly string[]
  getDraining: () => boolean
  /** Token de métricas: gateia o snapshot detalhado de upstreams no /readyz. */
  metricsToken?: string
}

async function storeReady(store: GatewayStore): Promise<boolean> {
  try {
    await store.get('__readyz__')
    return true
  } catch {
    return false
  }
}

/**
 * Liveness (`/health`, sempre 200 se o processo está de pé) e readiness
 * (`/readyz`, 503 se o store está fora ou não há upstream saudável). Em PaaS, o
 * roteamento de tráfego usa readiness; o restart usa liveness. O gateway é a
 * BORDA pública: o snapshot detalhado de upstreams (topologia/saúde interna) só
 * sai com o METRICS_TOKEN — o healthcheck anônimo recebe apenas o status.
 */
export function healthRoutes(deps: HealthRoutesDeps) {
  return new Elysia()
    .get('/health', () => ({
      status: 'ok',
      service: 'api-gateway',
      time: new Date().toISOString(),
    }))
    .get('/readyz', async ({ request }) => {
      if (deps.getDraining()) {
        return new Response(JSON.stringify({ status: 'draining' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        })
      }
      const storeOk = await storeReady(deps.store)
      const anyUpstreamHealthy =
        deps.targetIds.length === 0 || deps.targetIds.some((id) => deps.health.isHealthy(id))
      const ready = storeOk && anyUpstreamHealthy
      const detailed = metricsTokenOk(request.headers, deps.metricsToken)
      return new Response(
        JSON.stringify({
          status: ready ? 'ready' : 'degraded',
          store: storeOk,
          ...(detailed ? { upstreams: deps.health.snapshot() } : {}),
        }),
        { status: ready ? 200 : 503, headers: { 'content-type': 'application/json' } },
      )
    })
}
