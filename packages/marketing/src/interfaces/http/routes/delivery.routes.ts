import { Elysia } from 'elysia'
import type { DeliveryService } from '../../../application/workspace/delivery.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export interface DeliveryRoutesDeps {
  deliveries: DeliveryService
  internalToken: string
}
export function deliveryRoutes(deps: DeliveryRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .get('/projects/:projectId/delivery-options', ({ headers, params }) =>
      deps.deliveries.options(resolveActor(headers), params.projectId),
    )
    .get('/projects/:projectId/deliveries/:id/metrics', ({ headers, params }) =>
      deps.deliveries.metrics(resolveActor(headers), params.projectId, params.id),
    )
    .post('/projects/:projectId/deliveries/:id/analysis', ({ headers, params, body }) =>
      deps.deliveries.analyze(resolveActor(headers), params.projectId, params.id, body),
    )
    .get(
      '/projects/:projectId/representations/:representationId/deliveries',
      ({ headers, params, query }) =>
        deps.deliveries.list(
          resolveActor(headers),
          params.projectId,
          params.representationId,
          query.before,
        ),
    )
    .post('/projects/:projectId/deliveries', ({ headers, params, body }) =>
      deps.deliveries.create(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/deliveries/:id/actions', ({ headers, params, body }) =>
      deps.deliveries.act(resolveActor(headers), params.projectId, params.id, body),
    )
}
