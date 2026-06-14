import { Elysia } from 'elysia'
import type { ReportService } from '../../../application/moderation/report.service'
import { assertInternalCaller, resolveActor } from '../auth'
import { IdParams, ReportBody } from '../dtos'

export interface ReportRoutesDeps {
  report: ReportService
  internalToken?: string
}

/** Denúncia de conteúdo pelo aluno. */
export function reportRoutes(deps: ReportRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post(
      '/hub/threads/:id/report',
      ({ headers, params, body }) =>
        deps.report.report(resolveActor(headers), 'thread', params.id, body.reason),
      { params: IdParams, body: ReportBody },
    )
    .post(
      '/hub/comments/:id/report',
      ({ headers, params, body }) =>
        deps.report.report(resolveActor(headers), 'comment', params.id, body.reason),
      { params: IdParams, body: ReportBody },
    )
}
