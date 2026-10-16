import { Elysia } from 'elysia'
import type { MonitoringService } from '../../../application/intelligence/monitoring.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export type MonitoringRoutesDeps = { monitoring: MonitoringService; internalToken: string }
export function monitoringRoutes(deps: MonitoringRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace/projects/:projectId/monitors' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .get('/overview', ({ headers, params }) =>
      deps.monitoring.overview(resolveActor(headers), params.projectId),
    )
    .get('/:watchlistId', ({ headers, params, query }) =>
      deps.monitoring.status(
        resolveActor(headers),
        params.projectId,
        params.watchlistId,
        query.before,
      ),
    )
    .post('/:watchlistId/configure', ({ headers, params, body }) =>
      deps.monitoring.configure(resolveActor(headers), params.projectId, params.watchlistId, body),
    )
    .post('/:watchlistId/observations', ({ headers, params, body }) =>
      deps.monitoring.observe(resolveActor(headers), params.projectId, params.watchlistId, body),
    )
}
