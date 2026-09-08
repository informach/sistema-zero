import { Elysia, t } from 'elysia'
import type { PracticeService } from '../../../application/practice/practice.service'
import { assertInternalCaller, isPrivilegedActor, resolveAccountId, resolveUserId } from '../auth'

export interface PracticeRoutesDeps {
  practice: PracticeService
  internalToken?: string
}
const Id = t.String({ format: 'uuid' })
const Slug = t.String({ minLength: 1, maxLength: 200 })
const Params = t.Object({ id: Id })

export function practiceRoutes(deps: PracticeRoutesDeps) {
  return new Elysia({ prefix: '/members/practice' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get(
      '/topics',
      async ({ headers, query }) => ({
        topics: await deps.practice.topics(
          resolveUserId(headers),
          resolveAccountId(headers),
          query.courseSlug,
          isPrivilegedActor(headers),
        ),
      }),
      { query: t.Object({ courseSlug: Slug }) },
    )
    .get('/sessions', async ({ headers }) => ({
      sessions: await deps.practice.history(resolveUserId(headers), resolveAccountId(headers)),
    }))
    .post(
      '/sessions',
      async ({ headers, body }) => ({
        session: await deps.practice.start(
          resolveUserId(headers),
          resolveAccountId(headers),
          body,
          isPrivilegedActor(headers),
        ),
      }),
      {
        body: t.Object(
          { id: Id, courseSlug: Slug, lessonId: Id, blockId: Id },
          { additionalProperties: false },
        ),
      },
    )
    .get(
      '/sessions/:id',
      async ({ headers, params }) => ({
        session: await deps.practice.get(
          resolveUserId(headers),
          resolveAccountId(headers),
          params.id,
        ),
      }),
      { params: Params },
    )
    .post(
      '/sessions/:id/answers',
      async ({ headers, params, body }) => ({
        session: await deps.practice.complete(
          resolveUserId(headers),
          resolveAccountId(headers),
          params.id,
          body.answers,
        ),
      }),
      {
        params: Params,
        body: t.Object(
          {
            answers: t.Record(
              t.String({ minLength: 1, maxLength: 100 }),
              t.Array(t.String({ minLength: 1, maxLength: 100 }), { minItems: 1, maxItems: 50 }),
            ),
          },
          { additionalProperties: false },
        ),
      },
    )
}
