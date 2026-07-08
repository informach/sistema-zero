import { Elysia } from 'elysia'
import type { MetricsService } from '../../../application/metrics/metrics.service'
import type { Network } from '../../../domain/publication/publication'
import { assertInternalCaller, requireStaff } from '../auth'
import { BestTimesQuery, FollowersSeriesQuery, IdParams } from '../dtos'

export interface MetricsRoutesDeps {
  metrics: MetricsService
  internalToken?: string
  requireStaffEnabled: boolean
}

/** Dashboard de métricas (F3): summary por conta/rede + série de seguidores. */
export function metricsRoutes(deps: MetricsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get('/marketing/metrics/summary', () => deps.metrics.summary())
    .get(
      '/marketing/metrics/followers-series',
      ({ query }) =>
        deps.metrics.followersSeries({
          network: query.network as Network | undefined,
          days: query.days ?? 30,
        }),
      { query: FollowersSeriesQuery },
    )
    .get(
      '/marketing/metrics/best-times',
      ({ query }) =>
        deps.metrics.bestTimes({
          network: query.network as Network | undefined,
          days: query.days ?? 180,
        }),
      { query: BestTimesQuery },
    )
    .get(
      '/marketing/publications/:id/metrics',
      ({ params }) => deps.metrics.publicationSnapshots(params.id),
      { params: IdParams },
    )
}
