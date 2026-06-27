import { Elysia } from 'elysia'
import type {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from '../../../application/content-admin/content-admin.service'
import type { StudioSubmissionsAdminService } from '../../../application/studio-submissions-admin/studio-submissions-admin.service'
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
  AdminStudioSubmissionParams,
  AttachmentBody,
  BlockBody,
  CourseBody,
  CourseIdParams,
  IdParams,
  LessonBody,
  LessonIdParams,
  ListCoursesQuery,
  ModuleBody,
  ModuleIdParams,
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
  studioSubmissions: StudioSubmissionsAdminService
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
  // `null` = não informado (create → adult; update → preserva — ver CourseFields).
  audience: b.audience ?? null,
  // `null` = não informado (create → true; update → preserva). `false` é mantido.
  sequentialLock: b.sequentialLock ?? null,
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
      .onTransform(({ headers }) =>
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
            audience: query.audience,
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
      .get(
        '/courses/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.courses.get(params.id)
        },
        { params: IdParams },
      )
      .patch(
        '/courses/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.courses.update(params.id, courseFields(body))
        },
        { body: CourseBody, params: IdParams },
      )
      .delete(
        '/courses/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.courses.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Módulos ──
      .post(
        '/courses/:courseId/modules',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.modules.create(params.courseId, moduleFields(body))
        },
        { body: ModuleBody, params: CourseIdParams },
      )
      .post(
        '/courses/:courseId/modules/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.modules.reorder(params.courseId, body.orderedIds)
        },
        { body: ReorderBody, params: CourseIdParams },
      )
      .patch(
        '/modules/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.modules.update(params.id, moduleFields(body))
        },
        { body: ModuleBody, params: IdParams },
      )
      .delete(
        '/modules/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.modules.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Aulas ──
      .post(
        '/modules/:moduleId/lessons',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.lessons.create(params.moduleId, lessonFields(body))
        },
        { body: LessonBody, params: ModuleIdParams },
      )
      .post(
        '/modules/:moduleId/lessons/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.lessons.reorder(params.moduleId, body.orderedIds)
        },
        { body: ReorderBody, params: ModuleIdParams },
      )
      .get(
        '/lessons/:id/content',
        async ({ params, headers }) => {
          guard(headers)
          return deps.lessons.getContent(params.id)
        },
        { params: IdParams },
      )
      .patch(
        '/lessons/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.lessons.update(params.id, lessonFields(body))
        },
        { body: LessonBody, params: IdParams },
      )
      .delete(
        '/lessons/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.lessons.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Blocos ──
      .post(
        '/lessons/:lessonId/blocks',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.blocks.create(params.lessonId, body.content as LessonBlockContent)
        },
        { body: BlockBody, params: LessonIdParams },
      )
      .post(
        '/lessons/:lessonId/blocks/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.blocks.reorder(params.lessonId, body.orderedIds)
        },
        { body: ReorderBody, params: LessonIdParams },
      )
      .patch(
        '/blocks/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.blocks.update(params.id, body.content as LessonBlockContent)
        },
        { body: BlockBody, params: IdParams },
      )
      .delete(
        '/blocks/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.blocks.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Anexos ──
      .post(
        '/lessons/:lessonId/attachments',
        async ({ params, body, headers, set }) => {
          guard(headers)
          set.status = 201
          return deps.attachments.create(params.lessonId, attachmentFields(body))
        },
        { body: AttachmentBody, params: LessonIdParams },
      )
      .post(
        '/lessons/:lessonId/attachments/reorder',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.attachments.reorder(params.lessonId, body.orderedIds)
        },
        { body: ReorderBody, params: LessonIdParams },
      )
      .patch(
        '/attachments/:id',
        async ({ params, body, headers }) => {
          guard(headers)
          return deps.attachments.update(params.id, attachmentFields(body))
        },
        { body: AttachmentBody, params: IdParams },
      )
      .delete(
        '/attachments/:id',
        async ({ params, headers }) => {
          guard(headers)
          return deps.attachments.remove(params.id)
        },
        { params: IdParams },
      )
      // ── Entregas do Estúdio (acompanhamento do professor) ──
      // `/blocks/:id/...` reusa o param `:id` das rotas de bloco (sem reintroduzir
      // `:lessonId` aqui — colidiria com `/lessons/:id/...` no roteador). `id` = blockId.
      // Lista quem entregou + quando (nomes são hidratados no BFF do admin via auth).
      .get(
        '/blocks/:id/studio-submissions',
        async ({ params, headers }) => {
          guard(headers)
          return { submissions: await deps.studioSubmissions.list(params.id) }
        },
        { params: IdParams },
      )
      // Entrega de um aluno (projeto inteiro) — abrir no Estúdio embutido do admin.
      .get(
        '/blocks/:id/studio-submissions/:userId',
        async ({ params, headers }) => {
          guard(headers)
          return deps.studioSubmissions.getOne(params.userId, params.id)
        },
        { params: AdminStudioSubmissionParams },
      )
  )
}
