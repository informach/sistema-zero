import { Elysia } from 'elysia'
import type { ExecutionService } from '../../../application/workspace/execution.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export interface ExecutionRoutesDeps {
  execution: ExecutionService
  internalToken: string
}
export function executionRoutes(deps: ExecutionRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .post('/context', ({ headers, body }) => deps.execution.context(resolveActor(headers), body))
    .post('/projects/:projectId/runs/:id/apply', ({ headers, params, body }) =>
      deps.execution.apply(resolveActor(headers), params.projectId, params.id, body),
    )
    .post('/projects/:projectId/runs/:id/undo', ({ headers, params }) =>
      deps.execution.undo(resolveActor(headers), params.projectId, params.id),
    )
    .post('/runs', ({ headers, body }) => deps.execution.create(resolveActor(headers), body))
    .get('/projects/:projectId/runs', ({ headers, params, query }) =>
      deps.execution.list(resolveActor(headers), params.projectId, query),
    )
    .get('/projects/:projectId/runs/:id', ({ headers, params }) =>
      deps.execution.get(resolveActor(headers), params.projectId, params.id),
    )
    .post('/projects/:projectId/runs/:id/claim', ({ headers, params, body }) =>
      deps.execution.claim(resolveActor(headers), params.projectId, params.id, body),
    )
    .post('/projects/:projectId/runs/:id/heartbeat', ({ headers, params, body }) =>
      deps.execution.heartbeat(resolveActor(headers), params.projectId, params.id, body),
    )
    .post('/projects/:projectId/runs/:id/finish', ({ headers, params, body }) =>
      deps.execution.finish(resolveActor(headers), params.projectId, params.id, body),
    )
    .post('/projects/:projectId/runs/:id/cancel', ({ headers, params, body }) =>
      deps.execution.cancel(resolveActor(headers), params.projectId, params.id, body),
    )
}
