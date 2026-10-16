import { Elysia } from 'elysia'
import type { WorkspaceAssetsService } from '../../../application/workspace/workspace-assets.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export interface WorkspaceAssetsRoutesDeps {
  assets: WorkspaceAssetsService
  internalToken: string
}
export function workspaceAssetsRoutes(deps: WorkspaceAssetsRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .post('/assets', ({ headers, body }) => deps.assets.start(resolveActor(headers), body))
    .get('/projects/:projectId/assets', ({ headers, params, query }) =>
      deps.assets.list(resolveActor(headers), params.projectId, query),
    )
    .post('/projects/:projectId/assets/confirmed', ({ headers, params, body }) =>
      deps.assets.confirmed(resolveActor(headers), params.projectId, body),
    )
    .get('/projects/:projectId/assets/:id', ({ headers, params }) =>
      deps.assets.get(resolveActor(headers), params.projectId, params.id),
    )
    .get('/projects/:projectId/assets/:id/download', ({ headers, params }) =>
      deps.assets.download(resolveActor(headers), params.projectId, params.id),
    )
    .get('/projects/:projectId/assets/:id/export', ({ headers, params }) =>
      deps.assets.download(resolveActor(headers), params.projectId, params.id, true),
    )
    .post('/projects/:projectId/assets/:id/part', ({ headers, params, body }) =>
      deps.assets.part(resolveActor(headers), params.projectId, params.id, body),
    )
    .post('/projects/:projectId/assets/:id/complete', ({ headers, params }) =>
      deps.assets.complete(resolveActor(headers), params.projectId, params.id),
    )
    .post('/projects/:projectId/assets/:id/retry', ({ headers, params }) =>
      deps.assets.retry(resolveActor(headers), params.projectId, params.id),
    )
}
