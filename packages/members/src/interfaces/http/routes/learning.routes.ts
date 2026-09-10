import { Elysia } from 'elysia'
import type { LearningService } from '../../../application/learning/learning.service'
import type { LearningImportService } from '../../../application/learning/learning-import.service'
import type { LessonDraftRepository } from '../../../domain/ports/lesson-draft-repository.port'
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
} from '../learning.dtos'
import { DraftCommandSchema, DraftPublishSchema, draftCommand } from '../lesson-draft.dtos'

export interface LearningRoutesDeps {
  learning: LearningService
  imports: LearningImportService
  drafts: LessonDraftRepository
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
        .get('/lessons/:id/draft', ({ params }) => deps.drafts.read(params.id), {
          params: IdParams,
        })
        .patch(
          '/lessons/:id/draft',
          async ({ params, headers, body }) => {
            const draft = await deps.drafts.change(
              params.id,
              resolveUserId(headers),
              draftCommand(body),
            )
            return { revision: draft.revision, updatedAt: draft.updatedAt }
          },
          { params: IdParams, body: DraftCommandSchema },
        )
        .post(
          '/lessons/:id/draft/validate',
          ({ params, body }) =>
            deps.drafts.validate(params.id, body.expectedRevision, body.readyVideoIds),
          { params: IdParams, body: DraftPublishSchema },
        )
        .post(
          '/lessons/:id/draft/publish',
          ({ params, headers, body }) =>
            deps.drafts.publish(
              params.id,
              resolveUserId(headers),
              body.expectedRevision,
              body.operationId,
              body.readyVideoIds,
            ),
          { params: IdParams, body: DraftPublishSchema },
        )
        .post(
          '/lessons/:id/draft/unpublish',
          ({ params, headers, body }) =>
            deps.drafts.unpublish(
              params.id,
              resolveUserId(headers),
              body.expectedRevision,
              body.operationId,
            ),
          { params: IdParams, body: DraftPublishSchema },
        )
        .get('/lessons/:id/structure', ({ params }) => deps.learning.adminStructure(params.id), {
          params: IdParams,
        })
        .post(
          '/lessons/:id/import-preview',
          async ({ params, body }) => {
            const { document: _document, ...preview } = await deps.imports.preview(
              params.id,
              body.document,
            )
            return preview
          },
          { params: IdParams, body: LearningImportPreviewBody },
        )
        .post(
          '/lessons/:id/import-learning',
          ({ params, headers, body }) =>
            deps.imports.apply(
              params.id,
              body.document,
              body.expectedFingerprint,
              resolveUserId(headers),
              body.operationId,
            ),
          { params: IdParams, body: LearningImportApplyBody },
        )
        .get(
          '/lessons/:id/learning-report',
          ({ params, query }) => deps.learning.report(query, params.id),
          { params: IdParams, query: LearningReportQuery },
        ),
    )
}
