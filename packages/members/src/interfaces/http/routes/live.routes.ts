import { ForbiddenError } from '@sistemazero/core/http'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import { Elysia, t } from 'elysia'
import type { LiveService } from '../../../application/live/live.service'
import type { LiveActor } from '../../../domain/ports/live-repository.port'
import {
  assertInternalCaller,
  isPrivilegedActor,
  requireAdmin,
  resolveAccountId,
  resolveStudentName,
  resolveUserId,
} from '../auth'

export interface LiveRoutesDeps {
  live: LiveService
  internalToken?: string
  requireAdminEnabled: boolean
}
const uuid = () => t.String({ format: 'uuid' })
const integer = (minimum: number, maximum: number) => t.Number({ minimum, maximum, multipleOf: 1 })
const idParams = t.Object({ id: uuid() })
const catalogQuery = t.Object({
  cursor: t.Optional(uuid()),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50, multipleOf: 1 })),
})
const lesson = t.Object({
  title: t.String({ minLength: 1, maxLength: 160 }),
  instructions: t.String({ minLength: 1, maxLength: 24_000 }),
  starterProjectId: t.Union([uuid(), t.Null()]),
  continueProjectFrom: t.Optional(t.Union([integer(0, 23), t.Null()])),
  materials: t.Array(
    t.Object({
      id: uuid(),
      title: t.String({ minLength: 1, maxLength: 160 }),
      storageKey: t.String({ minLength: 1, maxLength: 1000 }),
      fileName: t.String({ minLength: 1, maxLength: 200 }),
    }),
    { maxItems: 30 },
  ),
  steps: t.Optional(
    t.Array(
      t.Object({
        id: uuid(),
        title: t.String({ minLength: 1, maxLength: 160 }),
        instructions: t.String({ maxLength: 10_000 }),
        blocks: t.Array(
          t.Object({
            id: uuid(),
            revision: uuid(),
            content: t.Unsafe<InteractiveBlock>(t.Unknown()),
          }),
          { maxItems: 12 },
        ),
      }),
      { maxItems: 24 },
    ),
  ),
})
const programFields = {
  title: t.String({ minLength: 1, maxLength: 160 }),
  description: t.String({ minLength: 1, maxLength: 4000 }),
  lessons: t.Array(lesson, { minItems: 1, maxItems: 24 }),
}
const status = t.Union([
  t.Literal('draft'),
  t.Literal('open'),
  t.Literal('closed'),
  t.Literal('archived'),
])
const speakingMode = t.Union([t.Literal('open'), t.Literal('turns'), t.Literal('listen')])
const control = t.Union([
  t.Object({ kind: t.Literal('suggest-step'), stepId: t.Union([uuid(), t.Null()]) }),
  t.Object({ kind: t.Union([t.Literal('start'), t.Literal('end'), t.Literal('open-lobby')]) }),
  t.Object({ kind: t.Literal('speaking-mode'), mode: speakingMode }),
  t.Object({ kind: t.Literal('chat'), enabled: t.Boolean() }),
  t.Object({
    kind: t.Literal('guide'),
    target: t.Union([
      t.Literal('studio-run'),
      t.Literal('studio-stop'),
      t.Literal('studio-blocks'),
      t.Literal('studio-code'),
      t.Literal('studio-save'),
      t.Literal('room-hand'),
      t.Literal('room-help'),
    ]),
    learnerId: t.Union([uuid(), t.Null()]),
  }),
  t.Object({
    kind: t.Union([
      t.Literal('admit'),
      t.Literal('remove'),
      t.Literal('grant-turn'),
      t.Literal('revoke-turn'),
    ]),
    learnerId: uuid(),
  }),
  t.Object({
    kind: t.Union([
      t.Literal('mute'),
      t.Literal('lower-hands'),
      t.Literal('lock-microphone'),
      t.Literal('unlock-microphone'),
      t.Literal('lock-camera'),
      t.Literal('unlock-camera'),
    ]),
    learnerId: t.Union([uuid(), t.Null()]),
  }),
  t.Object({
    kind: t.Union([t.Literal('remove-message'), t.Literal('pin-message')]),
    messageId: uuid(),
  }),
])

export function resolveLiveActor(headers: Record<string, string | undefined>): LiveActor {
  return {
    id: resolveUserId(headers),
    accountId: resolveAccountId(headers),
    name: resolveStudentName(headers),
    staff: isPrivilegedActor(headers),
  }
}

export function liveRoutes(deps: LiveRoutesDeps) {
  const guard = ({
    headers,
    set,
  }: {
    headers: Record<string, string | undefined>
    set: { headers: Record<string, string | number> }
  }) => {
    assertInternalCaller(headers['x-internal-token'], deps.internalToken)
    set.headers['cache-control'] = 'private, no-store'
  }
  const student = new Elysia({ prefix: '/members/live' })
    .onTransform(guard)
    .get(
      '/sessions/:id/replay-progress',
      ({ headers, params, query }) =>
        deps.live.replayPosition(resolveLiveActor(headers), params.id, query.version),
      { params: idParams, query: t.Object({ version: t.Numeric({ minimum: 1, multipleOf: 1 }) }) },
    )
    .put(
      '/sessions/:id/replay-progress',
      ({ headers, params, body }) =>
        deps.live.saveReplayPosition(
          resolveLiveActor(headers),
          params.id,
          body.version,
          body.positionSeconds,
        ),
      {
        params: idParams,
        body: t.Object({
          version: integer(1, Number.MAX_SAFE_INTEGER),
          positionSeconds: t.Number({ minimum: 0, maximum: 14_400 }),
        }),
      },
    )
    .get(
      '/catalog',
      ({ headers, query }) => deps.live.catalog(resolveLiveActor(headers), 'learner', query),
      { query: catalogQuery },
    )
    .get(
      '/sessions/:id',
      ({ headers, params, query }) =>
        deps.live.room(resolveLiveActor(headers), params.id, query.planRevision),
      {
        params: idParams,
        query: t.Object({ planRevision: t.Optional(t.String({ pattern: '^[a-f0-9]{64}$' })) }),
      },
    )
    .post(
      '/sessions/:id/join',
      ({ headers, params, body }) => deps.live.join(resolveLiveActor(headers), params.id, body),
      { params: idParams, body: t.Object({ deviceId: uuid(), takeover: t.Boolean() }) },
    )
    .post(
      '/sessions/:id/heartbeat',
      ({ headers, params, body }) =>
        deps.live.heartbeat(resolveLiveActor(headers), params.id, body.deviceId, body.activity),
      {
        params: idParams,
        body: t.Object({
          deviceId: uuid(),
          activity: t.Optional(
            t.Object({
              stepId: t.Union([uuid(), t.Null()]),
              saveState: t.Union([
                t.Literal('not-open'),
                t.Literal('saving'),
                t.Literal('saved'),
                t.Literal('offline'),
              ]),
            }),
          ),
        }),
      },
    )
    .post(
      '/sessions/:id/requests',
      ({ headers, params, body }) =>
        deps.live.request(
          resolveLiveActor(headers),
          params.id,
          body.deviceId,
          body.kind,
          body.raised,
        ),
      {
        params: idParams,
        body: t.Object({
          deviceId: uuid(),
          kind: t.Union([t.Literal('hand'), t.Literal('help')]),
          raised: t.Boolean(),
        }),
      },
    )
    .post(
      '/sessions/:id/chat',
      ({ headers, params, body }) =>
        deps.live.chat(resolveLiveActor(headers), params.id, body.deviceId, body.text),
      {
        params: idParams,
        body: t.Object({ deviceId: uuid(), text: t.String({ minLength: 1, maxLength: 500 }) }),
      },
    )
    .post(
      '/sessions/:id/control',
      ({ headers, params, body }) =>
        deps.live.control(resolveLiveActor(headers), params.id, body.expectedVersion, body.command),
      {
        params: idParams,
        body: t.Object({ expectedVersion: integer(1, Number.MAX_SAFE_INTEGER), command: control }),
      },
    )
    .get(
      '/sessions/:id/materials/:materialId/download',
      ({ headers, params }) =>
        deps.live.material(resolveLiveActor(headers), params.id, params.materialId),
      { params: t.Object({ id: uuid(), materialId: uuid() }) },
    )
    .get(
      '/sessions/:id/recording',
      ({ headers, params, query }) =>
        deps.live.recording(resolveLiveActor(headers), params.id, query.occurrenceId),
      { params: idParams, query: t.Object({ occurrenceId: t.Optional(uuid()) }) },
    )

  const parents = new Elysia({ prefix: '/members/parents/live' })
    .onTransform(guard)
    .get(
      '/enrollments',
      ({ headers, query }) => deps.live.catalog(resolveLiveActor(headers), 'parents', query),
      { query: catalogQuery },
    )
    .post(
      '/enrollments/:id/assign',
      ({ headers, params, body }) =>
        deps.live.assignLearner(resolveLiveActor(headers), params.id, body.learnerId),
      { params: idParams, body: t.Object({ learnerId: uuid() }) },
    )

  const admin = new Elysia({ prefix: '/members/admin/live' })
    .onTransform(guard)
    .onBeforeHandle(({ headers, request }) => {
      requireAdmin(headers, deps.requireAdminEnabled)
      if (
        request.method !== 'GET' &&
        !/^\/members\/admin\/live\/sessions\/[\da-f-]+\/(recording\/publish|occurrences)$/.test(
          new URL(request.url).pathname,
        ) &&
        !['superadmin', 'admin'].includes(headers['x-auth-user-role'] ?? '')
      )
        throw new ForbiddenError('Configuração disponível apenas para administradores.')
    })
    .get(
      '/catalog',
      ({ headers, query }) => deps.live.catalog(resolveLiveActor(headers), 'admin', query),
      { query: catalogQuery },
    )
    .post(
      '/programs',
      ({ headers, body, set }) => {
        set.status = 201
        return deps.live.createProgram(resolveLiveActor(headers), body)
      },
      { body: t.Object(programFields) },
    )
    .patch(
      '/programs/:id',
      ({ headers, params, body }) =>
        deps.live.updateProgram(resolveLiveActor(headers), params.id, body),
      {
        params: idParams,
        body: t.Object({
          title: t.Optional(programFields.title),
          description: t.Optional(programFields.description),
          lessons: t.Optional(programFields.lessons),
          expectedRevision: integer(1, Number.MAX_SAFE_INTEGER),
          status: t.Optional(
            t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived')]),
          ),
        }),
      },
    )
    .post(
      '/programs/:id/cohorts',
      ({ headers, params, body, set }) => {
        set.status = 201
        return deps.live.createCohort(resolveLiveActor(headers), params.id, body)
      },
      {
        params: idParams,
        body: t.Object({
          title: t.String({ minLength: 1, maxLength: 160 }),
          timeZone: t.String({ minLength: 1, maxLength: 100 }),
          capacity: integer(1, 8),
          accessDays: integer(1, 366),
          teacherIds: t.Array(uuid(), { minItems: 1, maxItems: 4 }),
          schedule: t.Array(
            t.Object({
              startsAt: t.String({ format: 'date-time' }),
              endsAt: t.String({ format: 'date-time' }),
            }),
            { minItems: 1, maxItems: 24 },
          ),
        }),
      },
    )
    .patch(
      '/cohorts/:id',
      ({ headers, params, body }) =>
        deps.live.updateCohort(resolveLiveActor(headers), params.id, body.status),
      { params: idParams, body: t.Object({ status }) },
    )
    .get(
      '/cohorts/:id/enrollments',
      ({ headers, params }) => deps.live.enrollments(resolveLiveActor(headers), params.id),
      { params: idParams },
    )
    .post(
      '/cohorts/:id/enrollments',
      ({ headers, params, body, set }) => {
        set.status = 201
        return deps.live.enroll(resolveLiveActor(headers), params.id, body)
      },
      {
        params: idParams,
        body: t.Object({
          accountId: uuid(),
          learnerId: t.Union([uuid(), t.Null()]),
          learnerName: t.String({ minLength: 1, maxLength: 100 }),
        }),
      },
    )
    .post(
      '/enrollments/:id/revoke',
      ({ headers, params }) => deps.live.revoke(resolveLiveActor(headers), params.id),
      { params: idParams },
    )
    .post(
      '/enrollments/:id/assign',
      ({ headers, params, body }) =>
        deps.live.assignLearner(resolveLiveActor(headers), params.id, body.learnerId),
      { params: idParams, body: t.Object({ learnerId: uuid() }) },
    )
    .post(
      '/sessions/:id/recording/publish',
      ({ headers, params, body }) =>
        deps.live.publishRecording(
          resolveLiveActor(headers),
          params.id,
          body.expectedVersion,
          body.published,
          body.occurrenceId,
        ),
      {
        params: idParams,
        body: t.Object({
          expectedVersion: integer(0, Number.MAX_SAFE_INTEGER),
          published: t.Boolean(),
          occurrenceId: t.Optional(uuid()),
        }),
      },
    )
    .post(
      '/sessions/:id/occurrences',
      ({ headers, params, body }) =>
        deps.live.replaceOccurrence(resolveLiveActor(headers), params.id, body),
      {
        params: idParams,
        body: t.Object({
          expectedVersion: integer(1, Number.MAX_SAFE_INTEGER),
          startsAt: t.String({ format: 'date-time' }),
          endsAt: t.String({ format: 'date-time' }),
          extendAccessUntil: t.Optional(t.String({ format: 'date-time' })),
        }),
      },
    )

  return new Elysia().use(student).use(parents).use(admin)
}
