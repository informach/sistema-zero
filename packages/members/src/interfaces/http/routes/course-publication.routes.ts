import {
  CoursePublicationCommandSchema,
  CoursePublicationOperationSchema,
  CoursePublicationPrepareSchema,
} from '@sistemazero/core/course/publication'
import { ForbiddenError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { CoursePublicationService } from '../../../application/course-publication/course-publication.service'
import { assertInternalCaller, requireAdmin, resolveUserId } from '../auth'

const Id = z.strictObject({ id: z.uuid() })
export interface CoursePublicationRoutesDependencies {
  service?: CoursePublicationService
  internalToken?: string
  requireAdminEnabled: boolean
}
export function coursePublicationRoutes(deps: CoursePublicationRoutesDependencies) {
  const guard = (headers: Record<string, string | undefined>, write = false) => {
    requireAdmin(headers, deps.requireAdminEnabled)
    // Publication can replace the curriculum. Staff may inspect it, administration approves it.
    if (write && !['admin', 'superadmin'].includes(headers['x-auth-user-role'] ?? ''))
      throw new ForbiddenError('Somente a administração pode publicar cursos entre destinos')
  }
  return new Elysia({ prefix: '/members/admin/course-publications' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .onAfterHandle(({ set }) => {
      set.headers['cache-control'] = 'private, no-store'
    })
    .get('/capabilities', ({ headers }) => {
      guard(headers)
      return deps.service ? deps.service.capabilities() : { copyAdult: false, promoteKids: false }
    })
    .get(
      '/',
      async ({ headers, query }) => {
        guard(headers)
        return {
          jobs: deps.service
            ? await deps.service.latest(query.sourceCourseId, query.operation)
            : [],
        }
      },
      {
        query: z.strictObject({
          sourceCourseId: z.uuid(),
          operation: CoursePublicationOperationSchema.default('copy-adult'),
        }),
      },
    )
    .get(
      '/:id',
      async ({ headers, params, set }) => {
        guard(headers)
        if (!deps.service) {
          set.status = 503
          return {
            error: {
              code: 'COURSE_PUBLICATION_UNAVAILABLE',
              message: 'Publicação de cursos indisponível',
            },
          }
        }
        return deps.service.view(params.id)
      },
      { params: Id },
    )
    .post(
      '/preview',
      async ({ headers, body, set }) => {
        guard(headers, true)
        if (!deps.service) {
          set.status = 503
          return {
            error: {
              code: 'COURSE_PUBLICATION_UNAVAILABLE',
              message: 'Publicação de cursos indisponível',
            },
          }
        }
        set.status = 201
        return deps.service.prepare({ ...body, actorId: resolveUserId(headers) })
      },
      { body: CoursePublicationPrepareSchema },
    )
    .post(
      '/:id/:command',
      async ({ headers, body, params, set }) => {
        guard(headers, true)
        if (!deps.service) {
          set.status = 503
          return {
            error: {
              code: 'COURSE_PUBLICATION_UNAVAILABLE',
              message: 'Publicação de cursos indisponível',
            },
          }
        }
        return deps.service.command(params.id, params.command, body.version, body.planHash)
      },
      {
        params: z.strictObject({ id: z.uuid(), command: z.enum(['approve', 'resume', 'cancel']) }),
        body: CoursePublicationCommandSchema,
      },
    )
}
