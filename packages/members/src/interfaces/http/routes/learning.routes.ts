import { Elysia, t } from 'elysia'
import type { GalleryDeliveryService } from '../../../application/learning/gallery-delivery.service'
import type { LearningService } from '../../../application/learning/learning.service'
import type { LearningImportService } from '../../../application/learning/learning-import.service'
import type { ProfilePreferencesService } from '../../../application/profile-preferences/profile-preferences.service'
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
  SectionProjectBody,
  SectionProjectParams,
} from '../learning.dtos'
import { DraftCommandSchema, DraftPublishSchema, draftCommand } from '../lesson-draft.dtos'
import { galleryDeliveryRoutes } from './gallery-delivery.routes'

export interface LearningRoutesDeps {
  learning: LearningService
  gallery: GalleryDeliveryService
  preferences: ProfilePreferencesService
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
    .use(galleryDeliveryRoutes(deps))
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get('/preferences/kids', ({ headers }) => deps.preferences.read(resolveUserId(headers)))
    .put(
      '/preferences/kids',
      ({ headers, body }) => deps.preferences.save(actor(headers), body.theme),
      {
        body: t.Object({ theme: t.Union([t.Literal('padrao'), t.Literal('pink')]) }),
      },
    )
    .post(
      '/lessons/:lessonId/sections/:sectionId/action-check',
      ({ headers, params, body }) =>
        deps.learning.checkAction(actor(headers), params.lessonId, params.sectionId, body.revision),
      { params: SectionProjectParams, body: t.Object({ revision: t.String({ format: 'uuid' }) }) },
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
        deps.learning.help(
          actor(headers),
          params.lessonId,
          body.sectionId,
          body.body,
          body.requestId,
        ),
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
    .post(
      '/lessons/:lessonId/sections/:sectionId/project-check',
      ({ headers, params, body }) =>
        deps.learning.checkProject(
          actor(headers),
          params.lessonId,
          params.sectionId,
          body.revision,
          body.project,
        ),
      { params: SectionProjectParams, body: SectionProjectBody },
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
          '/lessons/:id/learning-evidence',
          ({ params, query }) => deps.learning.evidencePage(query, params.id, query.beforeId),
          {
            params: IdParams,
            query: t.Object({
              ...LearningReportQuery.properties,
              beforeId: t.Optional(t.String({ format: 'uuid' })),
            }),
          },
        )
        .get(
          '/lessons/:id/learning-evidence/:evidenceId',
          ({ params, query }) => deps.learning.evidence(query, params.id, params.evidenceId),
          {
            params: t.Object({
              id: t.String({ format: 'uuid' }),
              evidenceId: t.String({ format: 'uuid' }),
            }),
            query: LearningReportQuery,
          },
        )
        .get(
          '/lessons/:id/learning-report',
          ({ params, query }) => deps.learning.report(query, params.id),
          { params: IdParams, query: LearningReportQuery },
        ),
    )
}
