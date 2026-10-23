import { timingSafeEqual } from 'node:crypto'
import { Elysia, t } from 'elysia'
import {
  assertInternalCaller,
  assertNoLiveSupportWrite,
  isPrivilegedActor,
  resolveAccountId,
  resolveStudentName,
  resolveUserId,
} from '../../interfaces/http/auth'
import { LiveMediaError } from './media-registry'
import type { OwnRecordingProvider } from './own-recording.provider'

const uuid = () => t.String({ format: 'uuid' })

export function liveRecordingRoutes(deps: {
  recording: Pick<OwnRecordingProvider, 'command' | 'acceptEvent'>
  token: string
  internalToken?: string
}) {
  const internal = new Elysia({ prefix: '/members/internal/live/recording' })
    .onBeforeHandle(({ headers, set }) => {
      const supplied = Buffer.from(headers.authorization ?? '')
      const expected = Buffer.from(`Bearer ${deps.token}`)
      if (
        deps.token.length < 32 ||
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      ) {
        set.status = 401
        return { message: 'Não autorizado.' }
      }
    })
    .post(
      '/events',
      async ({ body }) => {
        await deps.recording.acceptEvent(body)
        return { ok: true }
      },
      {
        body: t.Object({
          jobId: uuid(),
          occurrenceId: uuid(),
          generation: t.Integer({ minimum: 1 }),
          eventSequence: t.Integer({ minimum: 1 }),
          state: t.Union([
            t.Literal('starting'),
            t.Literal('recording'),
            t.Literal('paused'),
            t.Literal('processing'),
            t.Literal('review'),
            t.Literal('failed'),
          ]),
          manifestKey: t.String({ maxLength: 512 }),
          replayKey: t.Union([t.String({ maxLength: 512 }), t.Null()]),
          error: t.Union([t.String({ maxLength: 500 }), t.Null()]),
          captureStopped: t.Boolean(),
        }),
      },
    )
  const admin = new Elysia({ prefix: '/members/admin/live/sessions/:id/recording' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .onBeforeHandle(({ headers, request }) => assertNoLiveSupportWrite(headers, request.method))
    .post(
      '/:action',
      async ({ params, headers }) => {
        await deps.recording.command(
          {
            id: resolveUserId(headers),
            accountId: resolveAccountId(headers),
            name: resolveStudentName(headers),
            staff: isPrivilegedActor(headers),
          },
          params.id,
          params.action,
        )
        return { ok: true }
      },
      {
        params: t.Object({
          id: uuid(),
          action: t.Union([t.Literal('pause'), t.Literal('resume'), t.Literal('stop')]),
        }),
      },
    )
  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof LiveMediaError) {
        set.status = error.status
        return { code: error.code, message: error.message }
      }
    })
    .use(internal)
    .use(admin)
}
