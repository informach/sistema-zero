import { Elysia, t } from 'elysia'
import type { TeacherBroadcastsService } from '../../../application/teacher-threads/teacher-broadcasts.service'
import { requireAdmin, resolveStudentName, resolveUserId } from '../auth'

const id = t.String({ format: 'uuid' })
const audience = t.Union([
  t.Object({ kind: t.Literal('student'), profileId: id }, { additionalProperties: false }),
  t.Object({ kind: t.Literal('course'), courseId: id }, { additionalProperties: false }),
  t.Object({ kind: t.Literal('kids') }, { additionalProperties: false }),
])

export function teacherBroadcastRoutes(service: TeacherBroadcastsService, enabled: boolean) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => requireAdmin(headers, enabled))
    .get(
      '/teacher-threads/recipients',
      ({ query }) => service.search(query.q ?? '', query.offset ?? 0),
      {
        query: t.Object({
          q: t.Optional(t.String({ maxLength: 200 })),
          offset: t.Optional(t.Numeric({ minimum: 0 })),
        }),
      },
    )
    .get('/teacher-threads/broadcasts', () => service.list())
    .post(
      '/teacher-threads/broadcasts',
      ({ body, headers }) =>
        service.prepare({
          ...body,
          authorId: resolveUserId(headers),
          authorName: resolveStudentName(headers) ?? 'Professor',
        }),
      {
        body: t.Object(
          {
            id,
            audience,
            title: t.String({ minLength: 1, maxLength: 160 }),
            body: t.String({ minLength: 1, maxLength: 8000 }),
          },
          { additionalProperties: false },
        ),
      },
    )
    .get(
      '/teacher-threads/broadcasts/:id',
      ({ params, query }) => service.detail(params.id, query.offset ?? 0),
      {
        params: t.Object({ id }),
        query: t.Object({ offset: t.Optional(t.Numeric({ minimum: 0 })) }),
      },
    )
    .post(
      '/teacher-threads/broadcasts/:id/confirm',
      ({ params, headers }) => service.confirm(params.id, resolveUserId(headers)),
      { params: t.Object({ id }) },
    )
    .post('/teacher-threads/broadcasts/:id/retry', ({ params }) => service.retry(params.id), {
      params: t.Object({ id }),
    })
}
