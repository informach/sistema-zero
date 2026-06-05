import { Elysia } from 'elysia'
import type { MetricsSnapshot } from '../../../infrastructure/persistence/drizzle/metrics.repository'
import { UnauthorizedError } from '../errors'
import { safeEqual } from '../safe-equal'

/**
 * `GET /metrics` — contadores de backlog/lag para monitoramento. O serviço tem
 * ingress público (o webhook da Efí chega direto), então a rota exige token
 * quando `METRICS_TOKEN` está definido (em produção o boot o EXIGE — refine no
 * env): header `x-metrics-token` ou `Authorization: Bearer <token>`.
 */
export function metricsRoutes(getMetrics: () => Promise<MetricsSnapshot>, token?: string) {
  return new Elysia().get('/metrics', ({ headers }) => {
    if (token) {
      const bearer = headers.authorization?.startsWith('Bearer ')
        ? headers.authorization.slice('Bearer '.length)
        : undefined
      const provided = headers['x-metrics-token'] ?? bearer
      if (!provided || !safeEqual(provided, token)) {
        throw new UnauthorizedError('Token de métricas inválido')
      }
    }
    return getMetrics()
  })
}
