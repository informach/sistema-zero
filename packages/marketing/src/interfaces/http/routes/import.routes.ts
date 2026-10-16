import { Elysia } from 'elysia'
import type { ImportService } from '../../../application/workspace/import.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export interface ImportRoutesDeps {
  imports: ImportService
  internalToken: string
}
export function importRoutes(deps: ImportRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .get('/projects/:projectId/imports', ({ headers, params, query }) =>
      deps.imports.list(resolveActor(headers), params.projectId, query.before),
    )
    .post('/projects/:projectId/imports', ({ headers, params, body }) =>
      deps.imports.start(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/imports/:runId/load-source', ({ headers, params, body }) =>
      deps.imports.loadSource(resolveActor(headers), params.projectId, params.runId, body),
    )
    .get('/projects/:projectId/imports/:runId', ({ headers, params, query }) =>
      deps.imports.page(resolveActor(headers), params.projectId, params.runId, query.cursor),
    )
    .post('/projects/:projectId/imports/:runId/chunk', ({ headers, params, body }) =>
      deps.imports.chunk(resolveActor(headers), params.projectId, params.runId, body),
    )
    .post('/projects/:projectId/imports/:runId/finish', ({ headers, params }) =>
      deps.imports.finish(resolveActor(headers), params.projectId, params.runId),
    )
    .post('/projects/:projectId/imports/:runId/retire', ({ headers, params }) =>
      deps.imports.retire(resolveActor(headers), params.projectId, params.runId),
    )
}
