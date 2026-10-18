import { ValidationError } from '@sistemazero/core/errors'
import { StudioLiveRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { Elysia, t } from 'elysia'
import type { LiveWorkspaceService } from '../../../application/live/live-workspace.service'
import type { AuthorizeLiveRuntimeService } from '../../../application/studio/authorize-live-runtime.service'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import {
  assertInternalCaller,
  assertNoLiveSupportWrite,
  isPrivilegedActor,
  requireAdmin,
  resolveAccountId,
  resolveStudentName,
  resolveUserId,
} from '../auth'

const uuid = () => t.String({ format: 'uuid' })
const Params = t.Object({ id: uuid() })
const Device = t.Object({ deviceId: uuid() })
const Commit = t.Object({
  deviceId: uuid(),
  expectedRevision: t.Integer({ minimum: 0 }),
  writerEpoch: t.Integer({ minimum: 0 }),
  mutationId: uuid(),
  project: t.Record(t.String(), t.Unknown()),
})
const actor = (headers: Record<string, string | undefined>) => ({
  id: resolveUserId(headers),
  accountId: resolveAccountId(headers),
  name: resolveStudentName(headers),
  staff: isPrivilegedActor(headers),
})

export function liveWorkspaceRoutes(deps: {
  workspace: LiveWorkspaceService
  runtime?: AuthorizeLiveRuntimeService
  internalToken?: string
  requireAdminEnabled: boolean
}) {
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
  const workspace = (request: Request) => {
    const id = new URL(request.url).searchParams.get('sessionId')
    if (id && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))
      throw new ValidationError('Encontro inválido.')
    return deps.workspace.forSession(id ?? undefined)
  }
  const support = ({
    headers,
    request,
  }: {
    headers: Record<string, string | undefined>
    request: Request
  }) => assertNoLiveSupportWrite(headers, request.method)
  const student = new Elysia({ prefix: '/members/live' })
    .onBeforeHandle(guard)
    .onBeforeHandle(support)
    .post(
      '/workspaces/:id/runtime',
      ({ params, body, headers, request }) => {
        const sessionId = new URL(request.url).searchParams.get('sessionId')
        if (
          params.id !== body.context.workspaceId ||
          (sessionId !== null && sessionId !== body.context.sessionId)
        )
          throw new ValidationError('O contexto da execução não corresponde ao projeto aberto.')
        if (!deps.runtime)
          throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
        return deps.runtime.execute(actor(headers), body)
      },
      { params: Params, body: StudioLiveRuntimeRequestSchema },
    )
    // Without `blockId`: the child's own projects (library). With `sessionId` + `blockId`: open
    // or create the project of that Studio block of the encounter's PUBLISHED lesson (a teacher
    // of the cohort passes the child's `learnerId`).
    .get(
      '/workspaces',
      ({ request, headers, query }) => {
        if (!query.blockId) return workspace(request).listOwned(actor(headers))
        if (!query.sessionId) throw new ValidationError('Informe o encontro do projeto.')
        return workspace(request).openForBlock(
          actor(headers),
          query.sessionId,
          query.blockId,
          query.learnerId ?? resolveUserId(headers),
        )
      },
      {
        query: t.Object({
          sessionId: t.Optional(uuid()),
          blockId: t.Optional(uuid()),
          learnerId: t.Optional(uuid()),
        }),
      },
    )
    .get(
      '/workspaces/:id',
      async ({ request, headers, params, query }) =>
        query.revision === undefined
          ? workspace(request).get(actor(headers), params.id)
          : workspace(request).poll(actor(headers), params.id, query.revision),
      {
        params: Params,
        query: t.Object({
          sessionId: t.Optional(uuid()),
          revision: t.Optional(t.Numeric({ minimum: 0, multipleOf: 1 })),
        }),
      },
    )
    .post(
      '/workspaces/:id/claim',
      ({ request, headers, params, body }) =>
        workspace(request).claim(actor(headers), params.id, body.deviceId, body.takeover),
      { params: Params, body: t.Object({ deviceId: uuid(), takeover: t.Boolean() }) },
    )
    .post(
      '/workspaces/:id/renew',
      ({ request, headers, params, body }) =>
        workspace(request).renew(actor(headers), params.id, body.deviceId, body.writerEpoch),
      {
        params: Params,
        body: t.Object({ deviceId: uuid(), writerEpoch: t.Integer({ minimum: 0 }) }),
      },
    )
    .post(
      '/workspaces/:id/commits',
      ({ request, headers, params, body }) =>
        workspace(request).commit(actor(headers), params.id, body),
      { params: Params, body: Commit },
    )
    .post(
      '/workspaces/:id/accept',
      ({ request, headers, params, body }) =>
        workspace(request).acceptAssistance(actor(headers), params.id, body.requestId, body),
      // An intersection reuses Commit's closed object after /commits is compiled,
      // so it rejects requestId. Accept has one complete, independent object schema.
      { params: Params, body: t.Object({ ...Commit.properties, requestId: uuid() }) },
    )
    .post(
      '/workspaces/:id/revoke',
      ({ request, headers, params, body }) =>
        workspace(request).revoke(actor(headers), params.id, body.deviceId),
      { params: Params, body: Device },
    )
    .post(
      '/workspaces/:id/acknowledge',
      ({ request, headers, params, body }) =>
        workspace(request).acknowledgeReturn(
          actor(headers),
          params.id,
          body.revision,
          body.deviceId,
        ),
      { params: Params, body: t.Object({ deviceId: uuid(), revision: t.Integer({ minimum: 0 }) }) },
    )
  const admin = new Elysia({ prefix: '/members/admin/live' })
    .onBeforeHandle(guard)
    .onBeforeHandle(({ headers }) => requireAdmin(headers, deps.requireAdminEnabled))
    .onBeforeHandle(support)
    .post(
      '/workspaces/:id/assistance',
      ({ request, headers, params }) =>
        workspace(request).requestAssistance(actor(headers), params.id),
      { params: Params },
    )
    .post(
      '/workspaces/:id/cancel-assistance',
      ({ request, headers, params, body }) =>
        workspace(request).cancelAssistance(actor(headers), params.id, body.requestId),
      { params: Params, body: t.Object({ requestId: uuid() }) },
    )
    .post(
      '/workspaces/:id/attach',
      ({ request, headers, params, body }) =>
        workspace(request).attachTeacher(actor(headers), params.id, body.deviceId),
      { params: Params, body: Device },
    )
    .post(
      '/workspaces/:id/cursor',
      ({ request, headers, params, body }) =>
        workspace(request).cursor(actor(headers), params.id, body),
      {
        params: Params,
        body: t.Object({
          deviceId: uuid(),
          writerEpoch: t.Integer({ minimum: 0 }),
          x: t.Number({ minimum: 0, maximum: 1 }),
          y: t.Number({ minimum: 0, maximum: 1 }),
          revision: t.Optional(t.Integer({ minimum: 0 })),
          target: t.Optional(
            t.Union([
              t.Null(),
              t.Object({
                kind: t.Union([t.Literal('control'), t.Literal('block')]),
                id: t.String({ minLength: 1, maxLength: 128 }),
              }),
              t.Object(
                {
                  kind: t.Literal('code'),
                  id: t.String({ minLength: 1, maxLength: 512 }),
                  start: t.Integer({ minimum: 0 }),
                  end: t.Integer({ minimum: 0 }),
                  modelVersion: t.Integer({ minimum: 1 }),
                  sourceSha256: t.String({ pattern: '^[a-f0-9]{64}$' }),
                },
                { additionalProperties: false },
              ),
            ]),
          ),
        }),
      },
    )
    .post(
      '/workspaces/:id/return',
      ({ request, headers, params, body }) =>
        workspace(request).returnAuthorship(actor(headers), params.id, body),
      { params: Params, body: Commit },
    )
  return new Elysia({ name: 'live-workspaces' }).use(student).use(admin)
}
