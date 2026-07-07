import { Elysia } from 'elysia'
import type { MetricsService } from '../../../application/metrics/metrics.service'
import { assertInternalCaller, requireStaff } from '../auth'
import { IdParams } from '../dtos'

export interface MetricsRoutesDeps {
  metrics: MetricsService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Métricas básicas do YouTube (F2). Dashboard completo é a F3. */
export function metricsRoutes(deps: MetricsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get('/marketing/metrics/summary', () => deps.metrics.summary())
    .get(
      '/marketing/publications/:id/metrics',
      ({ params }) => deps.metrics.publicationSnapshots(params.id),
      { params: IdParams },
    )
}
