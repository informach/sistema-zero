import { Elysia } from 'elysia'
import type {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from '../../../application/content-admin/content-admin.service'
import type { CourseStatus } from '../../../domain/course/course'
import type { LessonBlockContent } from '../../../domain/course/lesson-block'
import type {
  AttachmentFields,
  CourseFields,
  LessonFields,
  ModuleFields,
} from '../../../domain/ports/content-admin-repository.port'
import { assertInternalCaller, requireAdmin } from '../auth'
import {
  AttachmentBody,
  BlockBody,
  CourseBody,
  LessonBody,
  ListCoursesQuery,
  ModuleBody,
  ReorderBody,
} from '../dtos'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface ContentRoutesDeps {
  requireAdminEnabled: boolean
  /** Token interno do gateway (defesa em profundidade). Vazio em dev → checagem desligada. */
  internalToken?: string
  courses: CourseAdminService
  modules: ModuleAdminService
  lessons: LessonAdminService
  blocks: BlockAdminService
  attachments: AttachmentAdminService
}

type CourseInput = typeof CourseBody.static
type ModuleInput = typeof ModuleBody.static
type LessonInput = typeof LessonBody.static
type AttachmentInput = typeof AttachmentBody.static

const courseFields = (b: CourseInput): CourseFields => ({
  slug: b.slug,
  title: b.title,
  subtitle: b.subtitle ?? null,
  description: b.description ?? null,
  coverImageUrl: b.coverImageUrl ?? null,
  salesPageUrl: b.salesPageUrl?.trim() ? b.salesPageUrl.trim() : null,
  status: b.status as CourseStatus,
})
const moduleFields = (b: ModuleInput): ModuleFields => ({
  title: b.title,
  summary: b.summary ?? null,
})
const lessonFields = (b: LessonInput): LessonFields => ({
  slug: b.slug,
  title: b.title,
  estimatedMinutes: b.estimatedMinutes ?? null,
  isPublished: b.isPublished ?? false,
})
const attachmentFields = (b: AttachmentInput): AttachmentFields => ({
  label: b.label,
  url: b.url,
  fileType: b.fileType ?? null,
  sizeBytes: b.sizeBytes ?? null,
})

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  return Math.min(Math.max(1, limit), MAX_LIMIT)
}

/**
 * Rotas ADMIN de AUTORIA de conteúdo (cursos → módulos → aulas → blocos/anexos).
 * Mesmo gating do resto do admin (`requireAdmin` + `x-internal-token`; RBAC real
 * no gateway). Prefixo `/members/admin` (coexiste com `admin.routes` de gestão de
 * acesso — paths distintos).
 */
export function contentRoutes(deps: ContentRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>) =>
    requireAdmin(headers, deps.requireAdminEnabled)

  return (
    new Elysia({ prefix: '/members/admin' })
      .onBeforeHandle(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      // ── Cursos ──
      .get(
        '/courses',
        async ({ query, headers }) => {
          guard(headers)
          return deps.courses.list({
            q: query.q,
            status: query.status as CourseStatus | undefined,
            limit: clampLimit(query.limit),
            offset: query.offset ?? 0,
          })
        },
        { query: ListCoursesQuery },
      )
      .post(
        '/courses',
        async ({ body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.courses.create(courseFields(body))
        },
        { body: CourseBody },
      )
      .get('/courses/:id', async ({ params, headers }) => {
        guard(headers)
        return deps.courses.get(params.id)
      })
      .patch(
        '/courses/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.courses.update(params.id, courseFields(body))
        },
        { body: CourseBody },
      )
      .delete('/courses/:id', async ({ params, headers }) => {
        guard(headers)
        return deps.courses.remove(params.id)
      })
      // ── Módulos ──
      .post(
        '/courses/:courseId/modules',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.modules.create(params.courseId, moduleFields(body))
        },
        { body: ModuleBody },
      )
      .post(
        '/courses/:courseId/modules/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.modules.reorder(params.courseId, body.orderedIds)
        },
        { body: ReorderBody },
      )
      .patch(
        '/modules/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.modules.update(params.id, moduleFields(body))
        },
        { body: ModuleBody },
      )
      .delete('/modules/:id', async ({ params, headers }) => {
        guard(headers)
        return deps.modules.remove(params.id)
      })
      // ── Aulas ──
      .post(
        '/modules/:moduleId/lessons',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.lessons.create(params.moduleId, lessonFields(body))
        },
        { body: LessonBody },
      )
      .post(
        '/modules/:moduleId/lessons/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.lessons.reorder(params.moduleId, body.orderedIds)
        },
        { body: ReorderBody },
      )
      .get('/lessons/:id/content', async ({ params, headers }) => {
        guard(headers)
        return deps.lessons.getContent(params.id)
      })
      .patch(
        '/lessons/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.lessons.update(params.id, lessonFields(body))
        },
        { body: LessonBody },
      )
      .delete('/lessons/:id', async ({ params, headers }) => {
        guard(headers)
        return deps.lessons.remove(params.id)
      })
      // ── Blocos ──
      .post(
        '/lessons/:lessonId/blocks',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.blocks.create(params.lessonId, body.content as LessonBlockContent)
        },
        { body: BlockBody },
      )
      .post(
        '/lessons/:lessonId/blocks/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.blocks.reorder(params.lessonId, body.orderedIds)
        },
        { body: ReorderBody },
      )
      .patch(
        '/blocks/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.blocks.update(params.id, body.content as LessonBlockContent)
        },
        { body: BlockBody },
      )
      .delete('/blocks/:id', async ({ params, headers }) => {
        guard(headers)
        return deps.blocks.remove(params.id)
      })
      // ── Anexos ──
      .post(
        '/lessons/:lessonId/attachments',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.attachments.create(params.lessonId, attachmentFields(body))
        },
        { body: AttachmentBody },
      )
      .post(
        '/lessons/:lessonId/attachments/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.attachments.reorder(params.lessonId, body.orderedIds)
        },
        { body: ReorderBody },
      )
      .patch(
        '/attachments/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.attachments.update(params.id, attachmentFields(body))
        },
        { body: AttachmentBody },
      )
      .delete('/attachments/:id', async ({ params, headers }) => {
        guard(headers)
        return deps.attachments.remove(params.id)
      })
  )
}
