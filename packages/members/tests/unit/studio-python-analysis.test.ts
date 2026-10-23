import { expect, test } from 'bun:test'
import { StudioLiveRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import { Elysia } from 'elysia'
import { AuthorizePythonAnalysisService } from '../../src/application/studio/authorize-python-analysis.service'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { studioPythonAnalysisRoutes } from '../../src/interfaces/http/routes/studio-python-analysis.routes'
import { silentLogger } from '../fakes/in-memory'
import { studioLiveRuntimeFixture } from '../fakes/studio-live-runtime'

async function fixture() {
  const f = await studioLiveRuntimeFixture('pro')
  const service = new AuthorizePythonAnalysisService({ live: f.service })
  const app = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(studioPythonAnalysisRoutes({ service, internalToken: 'local-analysis-internal' }))
  const { expectedWorkspaceRevision, context, ...candidate } = f.request
  const authorization = {
    ...candidate,
    operation: 'analyze',
    context: { ...context, expectedWorkspaceRevision },
  }
  const request = (body: unknown = authorization, headers: Record<string, string> = {}) =>
    app.handle(
      new Request('http://localhost/members/studio/python-analysis', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': 'local-analysis-internal',
          'x-auth-user-id': f.child.id,
          'x-auth-account-id': f.child.accountId,
          'x-auth-user-name': f.child.name,
          ...headers,
        },
        body: JSON.stringify(body),
      }),
    )
  return { ...f, runtimeRequest: f.request, service, authorization, request }
}

test('analysis HTTP keeps the real live writer/observer policy, revision and source unchanged', async () => {
  const f = await fixture()
  const before = structuredClone(f.records.records.get(f.claimed.id))
  const response = await f.request()
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  const decision = StudioLiveRuntimeDecisionSchema.parse(await response.json())
  expect(decision.operation).toBe('analyze')
  expect(decision.actor).toEqual({ userId: f.child.id, accountId: f.child.accountId })
  expect(decision.workspaceRevision).toBe(0)
  expect(decision.context).toEqual(f.runtimeRequest.context)
  const observed = await f.request(
    { ...f.authorization, context: { ...f.authorization.context, deviceId: crypto.randomUUID() } },
    {
      'x-auth-user-id': f.teacher.id,
      'x-auth-account-id': f.teacher.accountId,
      'x-auth-user-role': 'staff',
      'x-auth-user-status': 'active',
    },
  )
  expect(observed.status).toBe(200)
  // An observer never edits or executes; Zappy stays available only when the release declares it.
  expect(StudioLiveRuntimeDecisionSchema.parse(await observed.json()).capabilities).toEqual([
    'assist',
  ])
  expect(f.records.records.get(f.claimed.id)).toEqual(before)
  expect(f.records.revisions.size).toBe(0)
})

test('analysis HTTP rejects untrusted transport, support, foreign context, execution and stale revision', async () => {
  const f = await fixture()
  expect((await f.request(undefined, { 'x-internal-token': 'spoofed' })).status).toBe(401)
  expect((await f.request(undefined, { 'x-auth-user-id': crypto.randomUUID() })).status).toBe(404)
  expect(
    (await f.request(undefined, { 'x-auth-impersonator-id': crypto.randomUUID() })).status,
  ).toBe(403)
  for (const body of [
    { ...f.authorization, operation: 'execute' },
    { ...f.authorization, capabilities: ['edit'] },
    { ...f.authorization, context: { ...f.authorization.context, expectedWorkspaceRevision: 7 } },
    { ...f.authorization, context: { ...f.authorization.context, writerEpoch: 0 } },
  ])
    expect((await f.request(body)).status).toBeGreaterThanOrEqual(400)
  expect(
    (
      await f.request({
        ...f.authorization,
        context: { kind: 'free', audience: 'kids', projectId: f.runtimeRequest.subject.id },
      })
    ).status,
  ).toBe(403)
  f.advance(35_000)
  const afterLease = await f.request()
  expect(afterLease.status).toBe(200)
  expect(StudioLiveRuntimeDecisionSchema.parse(await afterLease.json()).capabilities).toEqual([
    'assist',
  ])
})
