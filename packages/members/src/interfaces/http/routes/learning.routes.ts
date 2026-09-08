import { Elysia } from 'elysia'
import type { LearningService } from '../../../application/learning/learning.service'
import type { LearningImportService } from '../../../application/learning/learning-import.service'
import {
  assertInternalCaller,
  isPrivilegedActor,
  requireAdmin,
  resolveAccountId,
  resolveUserId,
} from '../auth'
import { IdParams } from '../dtos'
import {
  LearningAttemptBody,
  LearningBlockParams,
  LearningHelpBody,
  LearningImportApplyBody,
  LearningImportPreviewBody,
  LearningLessonParams,
  LearningNavigationBody,
  LearningProgressBody,
  LearningReportQuery,
  LearningStructureBody,
} from '../learning.dtos'

export interface LearningRoutesDeps {
  learning: LearningService
  imports: LearningImportService
  internalToken?: string
  requireAdminEnabled: boolean
}
const actor = (headers: Record<string, string | undefined>) => ({
  userId: resolveUserId(headers),
  accountId: resolveAccountId(headers),
  privileged: isPrivilegedActor(headers),
})

export function learningRoutes(deps: LearningRoutesDeps) {
  return new Elysia({ name: 'learning', prefix: '/members' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .put(
      '/lessons/:lessonId/navigation',
      ({ headers, params, body }) =>
        deps.learning.navigation(actor(headers), params.lessonId, body.sectionId),
      { params: LearningLessonParams, body: LearningNavigationBody },
    )
    .post(
      '/lessons/:lessonId/section-help',
      ({ headers, params, body }) =>
        deps.learning.help(actor(headers), params.lessonId, body.sectionId, body.body),
      { params: LearningLessonParams, body: LearningHelpBody },
    )
    .put(
      '/lessons/:lessonId/blocks/:blockId/learning-progress',
      ({ headers, params, body }) =>
        deps.learning.save(actor(headers), params.lessonId, params.blockId, body),
      { params: LearningBlockParams, body: LearningProgressBody },
    )
    .post(
      '/lessons/:lessonId/blocks/:blockId/learning-attempts',
      ({ headers, params, body }) =>
        deps.learning.attempt(actor(headers), params.lessonId, params.blockId, body),
      { params: LearningBlockParams, body: LearningAttemptBody },
    )
    .group('/admin', (app) =>
      app
        .onBeforeHandle(({ headers }) => requireAdmin(headers, deps.requireAdminEnabled))
        .get('/lessons/:id/structure', ({ params }) => deps.learning.adminStructure(params.id), {
          params: IdParams,
        })
        .post(
          '/lessons/:id/import-preview',
          ({ params, body }) => deps.imports.preview(params.id, body.document),
          { params: IdParams, body: LearningImportPreviewBody },
        )
        .post(
          '/lessons/:id/import-learning',
          ({ params, body }) =>
            deps.imports.apply(params.id, body.document, body.expectedFingerprint),
          { params: IdParams, body: LearningImportApplyBody },
        )
        .put(
          '/lessons/:id/structure',
          ({ params, body }) =>
            deps.learning.saveStructure(params.id, body.expectedRevision, body.sections),
          { params: IdParams, body: LearningStructureBody },
        )
        .get(
          '/lessons/:id/learning-report',
          ({ params, query }) => deps.learning.report(query, params.id),
          { params: IdParams, query: LearningReportQuery },
        ),
    )
}
