import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { MetricsSnapshot } from '../../../infrastructure/persistence/drizzle/metrics.repository'
import { safeEqual } from '../auth'

/**
 * `GET /metrics` — contadores de backlog/lag para monitoramento (alerte na
 * IDADE do backlog, não só na contagem — pega worker/poller morto). Exige token
 * quando `METRICS_TOKEN` está definido (em produção o boot o EXIGE — refine no
 * env): header `x-metrics-token` ou `Authorization: Bearer <token>`. Espelha o payments.
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
