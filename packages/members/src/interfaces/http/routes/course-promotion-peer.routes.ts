import { CoursePublicationCommandSchema } from '@sistemazero/core/course/publication'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type {
  CoursePromotionService,
  CoursePromotionSourceService,
} from '../../../application/course-publication/course-promotion.service'
import { readPublicationSource } from '../../../domain/course-publication/jobs'
import { parsePublicationSource } from '../course-publication-source.dtos'

const Id = z.strictObject({ id: z.uuid() })
const PEER_PREFIX = '/members/internal/course-promotions'
const SOURCE_PREFIX = '/members/internal/course-promotion-sources'
const prepare = z.strictObject({
  version: z.literal(1),
  // Validate the deep teaching capture once at this HTTP boundary, without asking Elysia
  // to derive a recursive Eden client type for every lesson block and 3D project in the course.
  source: z.unknown(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  targetSlug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  actorId: z.uuid(),
  requestKey: z.uuid(),
})

/** Private capability. Authentication runs before JSON parsing, including large teaching captures. */
export function coursePromotionPeerRoutes(deps: {
  service: CoursePromotionService
  token: string
  enabled: boolean
}) {
  if (deps.token.length < 32) throw new Error('Token de publicação entre ambientes inválido')
  return new Elysia({ prefix: PEER_PREFIX })
    .onRequest(({ request, set }) => {
      // onRequest precedes routing and can be inherited by the parent app. Keep this
      // capability inside its boundary, including when both routers are installed.
      if (!new URL(request.url).pathname.startsWith(`${PEER_PREFIX}/`)) return
      set.headers['cache-control'] = 'private, no-store'
      if (!safeEqual(request.headers.get('x-course-promotion-token') ?? '', deps.token)) {
        set.status = 401
        return { error: { code: 'UNAUTHORIZED', message: 'Origem da publicação não autorizada' } }
      }
    })
    .get('/capabilities', () => ({
      environment: 'production',
      result: { available: deps.enabled },
    }))
    .post(
      '/preview',
      async ({ body, set }) => {
        if (!deps.enabled) {
          set.status = 503
          return {
            error: {
              code: 'COURSE_PUBLICATION_UNAVAILABLE',
              message: 'Promoção para produção indisponível',
            },
          }
        }
        return {
          environment: 'production',
          result: await deps.service.prepare({
            ...body,
            source: readPublicationSource(parsePublicationSource(body.source)),
          }),
        }
      },
      { body: prepare },
    )
    .get(
      '/jobs',
      async ({ query }) => ({
        environment: 'production',
        result: { jobs: await deps.service.latest(query.sourceCourseId) },
      }),
      { query: z.strictObject({ sourceCourseId: z.uuid() }) },
    )
    .get(
      '/jobs/:id',
      async ({ params }) => ({
        environment: 'production',
        result: await deps.service.view(params.id),
      }),
      { params: Id },
    )
    .get(
      '/bindings/:id',
      async ({ params }) => ({
        environment: 'production',
        result: await deps.service.binding(params.id),
      }),
      { params: Id },
    )
    .post(
      '/jobs/:id/:command',
      async ({ params, body, set }) => {
        if (!deps.enabled && params.command !== 'cancel') {
          set.status = 503
          return {
            error: {
              code: 'COURSE_PUBLICATION_UNAVAILABLE',
              message: 'Promoção para produção indisponível',
            },
          }
        }
        return {
          environment: 'production',
          result: await deps.service.command(
            params.id,
            params.command,
            body.version,
            body.planHash,
          ),
        }
      },
      {
        params: z.strictObject({ id: z.uuid(), command: z.enum(['approve', 'cancel', 'resume']) }),
        body: CoursePublicationCommandSchema,
      },
    )
}
export function coursePromotionSourceRoutes(deps: {
  service: CoursePromotionSourceService
  token: string
}) {
  if (deps.token.length < 32) throw new Error('Token de leitura da origem inválido')
  return new Elysia({ prefix: SOURCE_PREFIX })
    .onRequest(({ request, set }) => {
      if (!new URL(request.url).pathname.startsWith(`${SOURCE_PREFIX}/`)) return
      set.headers['cache-control'] = 'private, no-store'
      if (!safeEqual(request.headers.get('x-course-source-token') ?? '', deps.token)) {
        set.status = 401
        return { error: { code: 'UNAUTHORIZED', message: 'Origem da leitura não autorizada' } }
      }
    })
    .get(
      '/:id',
      async ({ params }) =>
        Response.json(
          {
            environment: 'staging',
            result: await deps.service.read(params.id),
          },
          { headers: { 'cache-control': 'private, no-store' } },
        ),
      { params: Id },
    )
}
