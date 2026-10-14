import { Elysia, t } from 'elysia'
import {
  assertInternalCaller,
  assertNoLiveSupportWrite,
  isPrivilegedActor,
  resolveAccountId,
  resolveStudentName,
  resolveUserId,
} from '../../interfaces/http/auth'
import type { CloudflareSfuMediaProvider } from './cloudflare-sfu.provider'
import { LiveMediaError } from './media-registry'

const uuid = () => t.String({ format: 'uuid' })
const kind = t.Union([
  t.Literal('microphone'),
  t.Literal('camera'),
  t.Literal('screen'),
  t.Literal('demo'),
])
const description = t.Object({
  type: t.Union([t.Literal('offer'), t.Literal('answer')]),
  sdp: t.String({ minLength: 1, maxLength: 256_000 }),
})
const params = t.Object({ occurrenceId: uuid() })
const base = { deviceId: uuid(), connectionId: uuid() }

/** BFF/Gateway authenticated routes, not a generic SFU API proxy. */
export function liveMediaRoutes(deps: {
  media: CloudflareSfuMediaProvider
  internalToken?: string
}) {
  function context(
    headers: Record<string, string | undefined>,
    occurrenceId: string,
    deviceId: string,
  ) {
    return {
      occurrenceId,
      deviceId,
      actor: {
        id: resolveUserId(headers),
        accountId: resolveAccountId(headers),
        name: resolveStudentName(headers),
        staff: isPrivilegedActor(headers),
      },
    }
  }
  return new Elysia({ prefix: '/members/live/occurrences/:occurrenceId/media' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .onBeforeHandle(({ headers, request }) => assertNoLiveSupportWrite(headers, request.method))
    .onError(({ error, set }) => {
      if (error instanceof LiveMediaError) {
        set.status = error.status
        return { code: error.code, message: error.message }
      }
    })
    .post(
      '/join',
      ({ headers, params, body }) =>
        deps.media.join(context(headers, params.occurrenceId, body.deviceId), body.attemptId),
      { params, body: t.Object({ deviceId: uuid(), attemptId: uuid() }) },
    )
    .get(
      '/publications',
      async ({ headers, params, query }) => ({
        publications: await deps.media.publications(
          context(headers, params.occurrenceId, query.deviceId),
        ),
      }),
      { params, query: t.Object({ deviceId: uuid() }) },
    )
    .post(
      '/publish',
      ({ headers, params, body }) =>
        deps.media.publish(context(headers, params.occurrenceId, body.deviceId), body),
      {
        params,
        body: t.Object({
          ...base,
          operationId: uuid(),
          kind,
          mid: t.String({ minLength: 1, maxLength: 32, pattern: '^[a-zA-Z0-9_-]+$' }),
          sessionDescription: description,
        }),
      },
    )
    .post(
      '/subscribe',
      ({ headers, params, body }) =>
        deps.media.subscribe(context(headers, params.occurrenceId, body.deviceId), body),
      {
        params,
        body: t.Object({
          ...base,
          operationId: uuid(),
          publicationId: uuid(),
          quality: t.Union([t.Literal('thumbnail'), t.Literal('full')]),
        }),
      },
    )
    .post(
      '/complete',
      async ({ headers, params, body }) => {
        await deps.media.complete(context(headers, params.occurrenceId, body.deviceId), body)
        return { ok: true }
      },
      {
        params,
        body: t.Object({
          ...base,
          operationId: uuid(),
          sessionDescription: t.Optional(description),
        }),
      },
    )
    .post(
      '/heartbeat',
      async ({ headers, params, body }) => {
        await deps.media.heartbeat(
          context(headers, params.occurrenceId, body.deviceId),
          body.connectionId,
        )
        return { ok: true }
      },
      { params, body: t.Object(base) },
    )
    .post(
      '/unpublish',
      async ({ headers, params, body }) => {
        await deps.media.unpublish(
          context(headers, params.occurrenceId, body.deviceId),
          body.connectionId,
          body.kind,
        )
        return { ok: true }
      },
      { params, body: t.Object({ ...base, kind }) },
    )
    .post(
      '/unsubscribe',
      async ({ headers, params, body }) => {
        await deps.media.unsubscribe(
          context(headers, params.occurrenceId, body.deviceId),
          body.connectionId,
          body.publicationId,
        )
        return { ok: true }
      },
      { params, body: t.Object({ ...base, publicationId: uuid() }) },
    )
    .post(
      '/close',
      async ({ headers, params, body }) => {
        await deps.media.close(
          context(headers, params.occurrenceId, body.deviceId),
          body.connectionId,
        )
        return { ok: true }
      },
      { params, body: t.Object(base) },
    )
}
