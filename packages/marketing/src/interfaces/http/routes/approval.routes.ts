import { Elysia } from 'elysia'
import type { ApprovalService } from '../../../application/workspace/approval.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export interface ApprovalRoutesDeps {
  approval: ApprovalService
  internalToken: string
}
export function approvalRoutes(deps: ApprovalRoutesDeps) {
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
    })
    .get(
      '/projects/:projectId/representations/:representationId/approval-preview',
      ({ headers, params }) =>
        deps.approval.preview(resolveActor(headers), params.projectId, params.representationId),
    )
    .get(
      '/projects/:projectId/representations/:representationId/editions',
      ({ headers, params, query }) =>
        deps.approval.list(
          resolveActor(headers),
          params.projectId,
          params.representationId,
          query.before,
        ),
    )
    .post('/projects/:projectId/editions', ({ headers, params, body }) =>
      deps.approval.approve(resolveActor(headers), params.projectId, body),
    )
    .get('/projects/:projectId/editions/:editionId', ({ headers, params }) =>
      deps.approval.get(resolveActor(headers), params.projectId, params.editionId),
    )
    .get('/projects/:projectId/editions/:editionId/files/:componentId', ({ headers, params }) =>
      deps.approval.download(
        resolveActor(headers),
        params.projectId,
        params.editionId,
        params.componentId,
      ),
    )
}
