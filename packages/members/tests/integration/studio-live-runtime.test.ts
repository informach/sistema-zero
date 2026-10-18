import { expect, test } from 'bun:test'
import { StudioLiveRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import { Elysia } from 'elysia'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { liveWorkspaceRoutes } from '../../src/interfaces/http/routes/live-workspaces.routes'
import { silentLogger } from '../fakes/in-memory'
import { studioLiveRuntimeFixture } from '../fakes/studio-live-runtime'

async function setup() {
  const f = await studioLiveRuntimeFixture('pro')
  const app = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(
      liveWorkspaceRoutes({
        workspace: f.workspace,
        runtime: f.service,
        internalToken: 'local-live-runtime-test',
        requireAdminEnabled: true,
      }),
    )
  const send = (body: unknown = f.request, headers: Record<string, string> = {}, suffix = '') =>
    app.handle(
      new Request(`http://localhost/members/live/workspaces/${f.claimed.id}/runtime${suffix}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': 'local-live-runtime-test',
          'x-auth-user-id': f.child.id,
          'x-auth-account-id': f.child.accountId,
          'x-auth-user-role': 'member',
          'x-auth-user-status': 'active',
          ...headers,
        },
        body: JSON.stringify(body),
      }),
    )
  return { ...f, send, app }
}

test('live runtime HTTP uses fresh room authority and never changes the workspace on refusal', async () => {
  const f = await setup()
  const response = await f.send()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(StudioLiveRuntimeDecisionSchema.parse(await response.json()).actor.userId).toBe(f.child.id)
  const before = structuredClone(f.records.records.get(f.claimed.id))
  expect((await f.send(f.request, { 'x-internal-token': '' })).status).toBe(401)
  expect((await f.send(f.request, { 'x-auth-account-id': crypto.randomUUID() })).status).toBe(404)
  expect((await f.send({ ...f.request, expectedWorkspaceRevision: 8 })).status).toBe(409)
  expect((await f.send({ ...f.request, capabilities: ['execute'] })).status).toBe(400)
  expect(
    (
      await f.send({
        ...f.request,
        context: { ...f.request.context, workspaceId: crypto.randomUUID() },
      })
    ).status,
  ).toBe(400)
  expect((await f.send(f.request, {}, `?sessionId=${crypto.randomUUID()}`)).status).toBe(400)
  const support = await f.send(f.request, { 'x-auth-impersonator-id': crypto.randomUUID() })
  expect(support.status).toBe(403)
  expect(support.headers.get('cache-control')).toBe('private, no-store')
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
  const aggregate = f.rooms.cohorts.get(f.cohort.id)
  if (!aggregate?.grants[0]) throw new Error('Expected grant')
  aggregate.grants[0].revokedAt = new Date().toISOString()
  expect((await f.send()).status).toBe(403)
})

test('HTTP assistance after autosave accepts a complete checkpoint and requires a valid request identity', async () => {
  const f = await setup()
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'start' })
  await f.live.join(f.teacher, f.session.id, { deviceId: crypto.randomUUID(), takeover: false })
  await f.live.join(f.child, f.session.id, {
    deviceId: f.request.context.deviceId,
    takeover: false,
  })
  await f.live.control(f.teacher, f.session.id, undefined, { kind: 'admit', learnerId: f.child.id })
  const pending = await f.workspace
    .forSession(f.session.id)
    .requestAssistance(f.teacher, f.claimed.id)
  if (!pending.assistance) throw new Error('Expected assistance')
  const checkpoint = {
    project: f.claimed.project,
    deviceId: f.request.context.deviceId,
    writerEpoch: f.claimed.writerEpoch,
    expectedRevision: f.claimed.revision,
    mutationId: crypto.randomUUID(),
  }
  const send = (action: 'accept' | 'commits', body: unknown) =>
    f.app.handle(
      new Request(
        `http://localhost/members/live/workspaces/${f.claimed.id}/${action}?sessionId=${f.session.id}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': 'local-live-runtime-test',
            'x-auth-user-id': f.child.id,
            'x-auth-account-id': f.child.accountId,
            'x-auth-user-role': 'member',
            'x-auth-user-status': 'active',
          },
          body: JSON.stringify(body),
        },
      ),
    )
  const saved = await send('commits', checkpoint)
  expect(saved.status).toBe(200)
  const savedView = await saved.json()
  if (
    !savedView ||
    typeof savedView !== 'object' ||
    !('revision' in savedView) ||
    typeof savedView.revision !== 'number'
  )
    throw new Error('Invalid saved revision')
  const revision = savedView.revision
  const accept = (body: unknown) => send('accept', body)
  checkpoint.expectedRevision = revision
  checkpoint.mutationId = crypto.randomUUID()
  const before = structuredClone(f.records.records.get(f.claimed.id))
  expect((await accept(checkpoint)).status).toBe(400)
  expect((await accept({ ...checkpoint, requestId: 'invalid' })).status).toBe(400)
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
  const accepted = await accept({ ...checkpoint, requestId: pending.assistance.id })
  expect(accepted.status).toBe(200)
  expect(await accepted.json()).toMatchObject({
    writerId: f.teacher.id,
    assistance: { status: 'active' },
  })
})

test('a revoked live poll returns its authorization denial through the HTTP boundary', async () => {
  const f = await setup()
  const aggregate = f.rooms.cohorts.get(f.cohort.id)
  if (!aggregate?.grants[0]) throw new Error('Expected grant')
  aggregate.grants[0].revokedAt = '2026-11-07T17:00:00Z'
  const result = await f.app
    .handle(
      new Request(
        `http://localhost/members/live/workspaces/${f.claimed.id}?revision=0&sessionId=${f.session.id}`,
        {
          headers: {
            'x-internal-token': 'local-live-runtime-test',
            'x-auth-user-id': f.child.id,
            'x-auth-account-id': f.child.accountId,
            'x-auth-user-role': 'member',
            'x-auth-user-status': 'active',
          },
        },
      ),
    )
    .then(
      (response) => response,
      (error: unknown) => error,
    )
  expect(result).toBeInstanceOf(Response)
  if (!(result instanceof Response)) throw result
  expect(result.status).toBe(403)
  expect(await result.json()).toMatchObject({ error: { code: 'LIVE_ACCESS_DENIED' } })
})
