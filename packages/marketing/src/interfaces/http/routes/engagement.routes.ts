import { Elysia } from 'elysia'
import type { EngagementService } from '../../../application/engagement/engagement.service'
import { assertInternalCaller, requireStaff, resolveActor } from '../auth'
export type EngagementRoutesDeps = { engagement: EngagementService; internalToken: string }
export function engagementRoutes(deps: EngagementRoutesDeps) {
  const service = deps.engagement
  return new Elysia({ prefix: '/marketing/workspace' })
    .onBeforeHandle(({ headers, set }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, true)
      set.headers['cache-control'] = 'no-store'
    })
    .get('/engagement/accounts', ({ headers }) => service.channels(resolveActor(headers)))
    .get('/projects/:projectId/pieces/:pieceId/engagement/approval', ({ headers, params, query }) =>
      service.approval(resolveActor(headers), params.projectId, params.pieceId, query.revisionId),
    )
    .get('/engagement/accounts/:accountId/health', ({ headers, params }) =>
      service.health(resolveActor(headers), params.accountId),
    )
    .get('/engagement/accounts/:accountId/members', ({ headers, params }) =>
      service.members(resolveActor(headers), params.accountId),
    )
    .get('/engagement/accounts/:accountId/staff', ({ headers, params, query }) =>
      service.staff(resolveActor(headers), params.accountId, query.q),
    )
    .post('/engagement/accounts/:accountId/configuration', ({ headers, params, body }) =>
      service.configure(resolveActor(headers), params.accountId, body),
    )
    .post('/engagement/accounts/:accountId/members', ({ headers, params, body }) =>
      service.member(resolveActor(headers), params.accountId, body),
    )
    .get('/engagement/accounts/:accountId/conversations', ({ headers, params, query }) =>
      service.list(resolveActor(headers), params.accountId, query.before),
    )
    .get('/engagement/accounts/:accountId/conversations/:id', ({ headers, params }) =>
      service.detail(resolveActor(headers), params.accountId, params.id),
    )
    .post(
      '/engagement/accounts/:accountId/conversations/:id/actions',
      ({ headers, params, body }) =>
        service.action(resolveActor(headers), params.accountId, params.id, body),
    )
    .post('/projects/:projectId/engagement/approvals', ({ headers, params, body }) =>
      service.approve(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/engagement/activations', ({ headers, params, body }) =>
      service.activate(resolveActor(headers), params.projectId, body),
    )
    .post('/projects/:projectId/engagement/activations/:id/actions', ({ headers, params, body }) =>
      service.activationAction(resolveActor(headers), params.projectId, params.id, body),
    )
    .get('/projects/:projectId/pieces/:pieceId/engagement', ({ headers, params }) =>
      service.activations(resolveActor(headers), params.projectId, params.pieceId),
    )
    .get('/projects/:projectId/pieces/:pieceId/engagement/summary', ({ headers, params, query }) =>
      service.summary(resolveActor(headers), params.projectId, params.pieceId, query),
    )
    .get(
      '/projects/:projectId/pieces/:pieceId/engagement/commercial',
      ({ headers, params, query }) =>
        service.commercialReport(resolveActor(headers), params.projectId, params.pieceId, query),
    )
}
