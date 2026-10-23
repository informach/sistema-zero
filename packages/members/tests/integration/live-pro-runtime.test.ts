import { expect, test } from 'bun:test'
import { StudioLiveProSnapshotSchema } from '@sistemazero/core/studio/live-pro-runtime'
import { liveRuntimeHttpFixture } from '../fakes/live-runtime-http'
import { studioLiveRuntimeFixture } from '../fakes/studio-live-runtime'

test('the saved Pro snapshot route enforces internal caller, actor, support and exact path/context', async () => {
  const f = await studioLiveRuntimeFixture('pro', 'javascript')
  const app = liveRuntimeHttpFixture(f.workspace, f.service, 'public-fixture-internal-token')
  const body = { context: f.request.context, expectedWorkspaceRevision: 0 }
  const send = (payload: unknown = body, headers: Record<string, string> = {}) =>
    app.handle(
      new Request(`http://localhost/members/live/workspaces/${f.claimed.id}/pro-build-snapshot`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
          'x-internal-token': 'public-fixture-internal-token',
          'x-auth-user-id': f.child.id,
          'x-auth-account-id': f.child.accountId,
          'x-auth-user-role': 'member',
          'x-auth-user-status': 'active',
          ...headers,
        },
      }),
    )
  const before = structuredClone(f.records.records.get(f.claimed.id))
  if (!before) throw new Error('The fixture must contain its saved workspace')
  const result = await send()
  expect(result.status).toBe(200)
  expect(result.headers.get('cache-control')).toBe('private, no-store')
  expect(StudioLiveProSnapshotSchema.parse(await result.json()).project).toEqual(before.project)
  expect((await send(body, { 'x-internal-token': '' })).status).toBe(401)
  expect((await send(body, { 'x-auth-account-id': crypto.randomUUID() })).status).toBe(404)
  expect((await send(body, { 'x-auth-impersonator-id': crypto.randomUUID() })).status).toBe(403)
  expect((await send({ ...body, expectedWorkspaceRevision: 99 })).status).toBe(409)
  expect(
    (await send({ ...body, context: { ...body.context, workspaceId: crypto.randomUUID() } }))
      .status,
  ).toBe(400)
  expect((await send({ ...body, project: f.claimed.project })).status).toBe(400)
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
  expect(f.records.revisions.size).toBe(0)
})
