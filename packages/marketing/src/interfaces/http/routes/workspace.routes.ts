import { workspaceProtocol } from '@sistemazero/marketing-contracts'
import { Elysia } from 'elysia'
import type { WorkspaceService } from '../../../application/workspace/workspace.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'

export interface WorkspaceRoutesDeps {
  workspace: WorkspaceService
  internalToken: string
}
export function workspaceRoutes(deps: WorkspaceRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .get('/projects', ({ headers }) => deps.workspace.list(resolveActor(headers)))
    .get('/protocol', () => workspaceProtocol)
    .get('/head', async ({ headers }) => ({
      ...workspaceProtocol,
      projects: await deps.workspace.list(resolveActor(headers)),
    }))
    .post('/handoffs', ({ headers, body }) =>
      deps.workspace.createHandoff(resolveActor(headers), body),
    )
    .get('/handoffs/:id', ({ headers, params }) =>
      deps.workspace.resolveHandoff(resolveActor(headers), params.id),
    )
    .post('/projects', ({ headers, body }) => deps.workspace.create(resolveActor(headers), body))
    .get('/projects/:projectId/analytics', ({ headers, params, query }) =>
      deps.workspace.analytics(resolveActor(headers), params.projectId, query),
    )
    .get('/projects/:projectId/production', ({ headers, params, query }) =>
      deps.workspace.production(resolveActor(headers), params.projectId, query),
    )
    .post('/projects/:projectId/production-records', ({ headers, params, body }) =>
      deps.workspace.recordProduction(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/production-records/void', ({ headers, params, body }) =>
      deps.workspace.voidProduction(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/learning-pieces', ({ headers, params, body }) =>
      deps.workspace.proposePiece(resolveActor(headers), params.projectId, body),
    )
    .get('/projects/:projectId/snapshot', ({ headers, params }) =>
      deps.workspace.snapshot(resolveActor(headers), params.projectId),
    )
    .get('/projects/:projectId/snapshot-page', ({ headers, params, query }) =>
      deps.workspace.snapshotPage(resolveActor(headers), params.projectId, query),
    )
    .get('/projects/:projectId/receipts/:operationId', ({ headers, params }) =>
      deps.workspace.actionReceipt(resolveActor(headers), params.projectId, params.operationId),
    )
    .get('/projects/:projectId/changes', ({ headers, params, query }) =>
      deps.workspace.changes(resolveActor(headers), params.projectId, query.cursor ?? 0),
    )
    .get('/projects/:projectId/items/:entityId/history', ({ headers, params }) =>
      deps.workspace.history(resolveActor(headers), params.projectId, params.entityId),
    )
    .get('/projects/:projectId/items/:entityId/history-page', ({ headers, params, query }) =>
      deps.workspace.historyPage(resolveActor(headers), params.projectId, params.entityId, query),
    )
    .post('/operations', ({ headers, body }) => deps.workspace.apply(resolveActor(headers), body))
    .post('/batches', ({ headers, body }) => deps.workspace.applyBatch(resolveActor(headers), body))
    .put('/projects/:projectId/members', ({ headers, params, body }) =>
      deps.workspace.setMember(resolveActor(headers), params.projectId, body),
    )
    .get('/projects/:projectId/members', ({ headers, params }) =>
      deps.workspace.team(resolveActor(headers), params.projectId),
    )
    .get('/projects/:projectId/staff', ({ headers, params, query }) =>
      deps.workspace.searchStaff(resolveActor(headers), params.projectId, query.q),
    )
}
