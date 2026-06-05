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
 * (`/readyz`, 503 em drain ou sem nenhum upstream saudável). Em PaaS, o
 * roteamento de tráfego usa readiness; o restart usa liveness.
 *
 * O STORE fora NÃO derruba a prontidão: o data plane degrada em FAIL-OPEN
 * (rate limit/breaker liberam) — tirar todas as réplicas do ar por causa do
 * backend de estado transformaria uma degradação em outage total. A
 * indisponibilidade fica visível no campo `store` (status `degraded`) e na
 * métrica `gateway_rate_limit_fail_open_total` (alerte nela). No BOOT, um
 * Redis inalcançável ainda falha alto (`store.init()` no start).
 *
 * O gateway é a BORDA pública: o snapshot detalhado de upstreams (topologia/
 * saúde interna) só sai com o METRICS_TOKEN — o healthcheck anônimo recebe
 * apenas o status.
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
      const ready = anyUpstreamHealthy
      const detailed = metricsTokenOk(request.headers, deps.metricsToken)
      return new Response(
        JSON.stringify({
          status: ready && storeOk ? 'ready' : 'degraded',
          store: storeOk,
          ...(detailed ? { upstreams: deps.health.snapshot() } : {}),
        }),
        { status: ready ? 200 : 503, headers: { 'content-type': 'application/json' } },
      )
    })
}
