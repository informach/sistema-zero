import { ForbiddenError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { LiveService } from '../../../application/live/live.service'
import type { LiveActor } from '../../../domain/ports/live-repository.port'
import {
  assertInternalCaller,
  assertNoLiveSupportWrite,
  isPrivilegedActor,
  requireAdmin,
  resolveAccountId,
  resolveStudentName,
  resolveUserId,
} from '../auth'

const ADMIN_ROLES = new Set(['superadmin', 'admin'])
export interface LiveRoutesDeps {
  live: LiveService
  internalToken?: string
  requireAdminEnabled: boolean
}
const uuid = () => t.String({ format: 'uuid' })
const integer = (minimum: number, maximum: number) => t.Number({ minimum, maximum, multipleOf: 1 })
const idParams = t.Object({ id: uuid() })
const audience = t.Union([t.Literal('adult'), t.Literal('kids')])
const catalogQuery = t.Object({
  cursor: t.Optional(uuid()),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50, multipleOf: 1 })),
  /** The course platform (Kids × adults). Admin filters its management by it. */
  audience: t.Optional(audience),
})
const teacherIds = t.Array(uuid(), { minItems: 1, maxItems: 4, uniqueItems: true })
const teacherNames = t.Record(
  t.String({ minLength: 1, maxLength: 64 }),
  t.String({ minLength: 1, maxLength: 80 }),
  {
    maxProperties: 4,
  },
)
const status = t.Union([
  t.Literal('draft'),
  t.Literal('open'),
  t.Literal('closed'),
  t.Literal('archived'),
])
const speakingMode = t.Union([t.Literal('open'), t.Literal('turns'), t.Literal('listen')])
const control = t.Union([
  /** The teacher opens a part of the published lesson and makes it current (only while live). */
  t.Object({ kind: t.Literal('open-section'), sectionId: uuid() }),
  t.Object({
    kind: t.Union([
      t.Literal('start'),
      t.Literal('end'),
      t.Literal('open-lobby'),
      t.Literal('cancel'),
    ]),
  }),
  t.Object({ kind: t.Literal('admit-all') }),
  t.Object({
    kind: t.Literal('lower-hands'),
    learnerId: t.Union([uuid(), t.Null()]),
    before: t.Optional(t.String({ format: 'date-time' })),
  }),
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
    admin: isPrivilegedActor(headers) && ADMIN_ROLES.has(headers['x-auth-user-role'] ?? ''),
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
  const support = ({
    headers,
    request,
  }: {
    headers: Record<string, string | undefined>
    request: Request
  }) => assertNoLiveSupportWrite(headers, request.method)
  const student = new Elysia({ prefix: '/members/live' })
    .onTransform(guard)
    .onBeforeHandle(support)
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
      ({ headers, params }) => deps.live.room(resolveLiveActor(headers), params.id),
      {
        params: idParams,
        // `planRevision` was the old script cache key: still accepted from older rooms, ignored.
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
        deps.live.heartbeat(
          resolveLiveActor(headers),
          params.id,
          body.deviceId,
          body.activity && { ...body.activity, stepId: body.activity.stepId ?? null },
        ),
      {
        params: idParams,
        body: t.Object({
          deviceId: uuid(),
          activity: t.Optional(
            t.Object({
              /** Old script steps: only `null` is valid now (kept for older rooms). */
              stepId: t.Optional(t.Union([uuid(), t.Null()])),
              saveState: t.Union([
                t.Literal('not-open'),
                t.Literal('saving'),
                t.Literal('saved'),
                t.Literal('offline'),
              ]),
              /** The part of the published lesson the child is in. */
              sectionId: t.Optional(t.Union([uuid(), t.Null()])),
              /** Parts she completed (the lesson progress), for the teacher's cards. */
              completedSectionIds: t.Optional(t.Array(uuid(), { maxItems: 60, uniqueItems: true })),
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
        // The version is checked only for state transitions (start/end/open-lobby/cancel).
        body: t.Object({
          expectedVersion: t.Optional(integer(1, Number.MAX_SAFE_INTEGER)),
          command: control,
        }),
      },
    )
    .get(
      '/sessions/:id/recording',
      ({ headers, params, query }) =>
        deps.live.recording(resolveLiveActor(headers), params.id, query.occurrenceId),
      { params: idParams, query: t.Object({ occurrenceId: t.Optional(uuid()) }) },
    )

  const parents = new Elysia({ prefix: '/members/parents/live' })
    .onTransform(guard)
    .onBeforeHandle(support)
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
      assertNoLiveSupportWrite(headers, request.method)
      if (
        request.method !== 'GET' &&
        !/^\/members\/admin\/live\/(sessions\/[\da-f-]+\/(recording\/publish|occurrences)|occurrences\/[\da-f-]+\/recording\/vimeo)$/.test(
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
      '/courses/:courseId/cohorts',
      ({ headers, params, body, set }) => {
        set.status = 201
        return deps.live.createCohort(resolveLiveActor(headers), params.courseId, body)
      },
      {
        params: t.Object({ courseId: uuid() }),
        body: t.Object({
          title: t.String({ minLength: 1, maxLength: 160 }),
          timeZone: t.String({ minLength: 1, maxLength: 100 }),
          capacity: integer(1, 8),
          accessDays: integer(1, 366),
          teacherIds,
          teacherNames: t.Optional(teacherNames),
          // One interval per PUBLISHED lesson of the course, in the course order.
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
        deps.live.updateCohort(resolveLiveActor(headers), params.id, body),
      {
        params: idParams,
        body: t.Object({
          status: t.Optional(status),
          teacherIds: t.Optional(teacherIds),
          teacherNames: t.Optional(teacherNames),
        }),
      },
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
    .get(
      '/occurrences/:id/recording/source',
      ({ headers, params }) => deps.live.recordingSource(resolveLiveActor(headers), params.id),
      { params: idParams },
    )
    .get(
      '/occurrences/:id/recording/vimeo',
      ({ headers, params }) => deps.live.recordingVimeo(resolveLiveActor(headers), params.id),
      { params: idParams },
    )
    .put(
      '/occurrences/:id/recording/vimeo',
      ({ headers, params, body }) =>
        deps.live.setRecordingVimeo(resolveLiveActor(headers), params.id, body),
      {
        params: idParams,
        body: t.Object({
          videoId: t.String({ pattern: '^[0-9]{1,20}$' }),
          embedUrl: t.String({ minLength: 1, maxLength: 300 }),
          status: t.Union([t.Literal('processing'), t.Literal('ready'), t.Literal('failed')]),
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
