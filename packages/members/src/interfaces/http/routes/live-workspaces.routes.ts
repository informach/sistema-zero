import { ValidationError } from '@sistemazero/core/errors'
import { Elysia, t } from 'elysia'
import type { LiveWorkspaceService } from '../../../application/live/live-workspace.service'
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
    .get(
      '/sessions/:id/demonstration',
      ({ request, headers, params }) => workspace(request).demonstration(actor(headers), params.id),
      { params: Params },
    )
    .get('/workspaces', ({ request, headers }) => workspace(request).listOwned(actor(headers)))
    .post(
      '/sessions/:id/workspace',
      ({ request, headers, params, body }) =>
        workspace(request).open(
          actor(headers),
          params.id,
          body.learnerId ?? resolveUserId(headers),
        ),
      { params: Params, body: t.Object({ learnerId: t.Optional(uuid()) }) },
    )
    .get(
      '/workspaces/:id',
      ({ request, headers, params, query }) =>
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
      { params: Params, body: t.Intersect([Commit, t.Object({ requestId: uuid() })]) },
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
    .get('/templates', ({ request, headers }) => workspace(request).listTemplates(actor(headers)))
    .post(
      '/templates',
      ({ request, headers, body }) =>
        workspace(request).createTemplate(actor(headers), body.project),
      { body: t.Object({ project: t.Record(t.String(), t.Unknown()) }) },
    )
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
