import { afterAll, afterEach, beforeEach, expect, it, mock, spyOn } from 'bun:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { AuthorizeAuthoringRuntimeService } from '../../members/src/application/studio/authorize-authoring-runtime.service'
import { AuthorizePythonAnalysisService } from '../../members/src/application/studio/authorize-python-analysis.service'
import { createStudioRuntimeHosts } from '../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../members/src/domain/studio/runtime-policy'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import type { SessionUser } from '../src/lib/types'
import type { CallOpts, GatewayResponse } from '../src/server/gateway'
import type { AccessVerdict } from '../src/server/session'

mock.module('server-only', () => ({}))
const originalHeaders = { ...(await import('next/headers')) }
const originalEnv = { ...(await import('../src/lib/env')) }
const originalSession = { ...(await import('../src/server/session')) }
const originalGateway = { ...(await import('../src/server/gateway')) }
const environment = {
  NODE_ENV: 'test',
  GATEWAY_URL: 'https://gateway.internal',
  STUDIO_PYTHON_LANGUAGE_URL: 'https://analysis.internal',
  STUDIO_PYTHON_LANGUAGE_TOKEN: 'private-admin-language-token-never-in-browser',
}
const user: SessionUser = {
  id: crypto.randomUUID(),
  email: 'teacher@example.test',
  firstName: 'Ana',
  lastName: 'Silva',
  role: 'staff',
  status: 'active',
}
let actor = { ...user }
let authenticated = true
let requestHeaders = new Headers()
let policy: (input: unknown, options: CallOpts) => Promise<GatewayResponse> = async () => {
  throw new Error('No policy fixture installed')
}
const policyCalls: { path: string; options: CallOpts }[] = []
mock.module('next/headers', () => ({ ...originalHeaders, headers: async () => requestHeaders }))
mock.module('../src/lib/env', () => ({ ...originalEnv, getEnv: () => environment }))
mock.module('../src/server/session', () => ({
  ...originalSession,
  getAccessToken: async () => (authenticated ? 'access' : null),
  getRefreshToken: async () => (authenticated ? 'refresh' : null),
  verifyAccessToken: async (): Promise<AccessVerdict> => ({ ok: true, user: { ...actor } }),
}))
mock.module('../src/server/gateway', () => ({
  ...originalGateway,
  gatewayFetch: async (path: string, options: CallOpts) => {
    policyCalls.push({ path, options })
    return policy(options.body, options)
  },
}))

const routesDirectory = resolve(import.meta.dirname, '../src/app/api/studio/python-language')
const openRoute = await import('../src/app/api/studio/python-language/route')
const sessionRoute = await import('../src/app/api/studio/python-language/[id]/route')
const startRoute = await import('../src/app/api/studio/python-language/[id]/start/route')
const sessionId = 'a'.repeat(32)
const params = { params: Promise.resolve({ id: sessionId }) }
const upstreamCalls: { url: string; init?: RequestInit }[] = []
let upstream: (url: string, init?: RequestInit) => Promise<Response> = async () =>
  Response.json({ ready: true })
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>

beforeEach(() => {
  actor = { ...user }
  authenticated = true
  requestHeaders = new Headers({ 'sec-fetch-site': 'same-origin', host: 'admin.test' })
  policyCalls.length = 0
  upstreamCalls.length = 0
  upstream = async () => Response.json({ ready: true })
  const fetchImplementation = Object.assign(
    async (...[url, init]: Parameters<typeof fetch>) => {
      upstreamCalls.push({ url: String(url), init })
      return upstream(String(url), init)
    },
    { preconnect: globalThis.fetch.preconnect },
  )
  fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(fetchImplementation)
})
afterEach(() => fetchSpy.mockRestore())
afterAll(() => {
  mock.module('next/headers', () => originalHeaders)
  mock.module('../src/lib/env', () => originalEnv)
  mock.module('../src/server/session', () => originalSession)
  mock.module('../src/server/gateway', () => originalGateway)
})

function request(body: unknown, signal?: AbortSignal) {
  return new Request('https://admin.test/api/studio/python-language', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}
function closeRequest() {
  return new Request('https://admin.test/api/studio/python-language', { method: 'DELETE' })
}
const sync = {
  version: 1,
  id: 'sync',
  kind: 'sync',
  entrypoint: 'main.py',
  baseRevision: 0,
  revision: 1,
  changes: [{ path: 'main.py', version: 1, source: 'value = 42' }],
}
async function fixture() {
  const f = await authoringFixture('python', 'pro')
  const draftRevision = crypto.randomUUID()
  const authorization = StudioPythonAnalysisAuthorizationSchema.parse({
    operation: 'analyze',
    revision: 'a'.repeat(64),
    subject: studioRuntimeSubject(f.project),
    context: {
      kind: 'authoring',
      purpose: 'authoring',
      lessonId: crypto.randomUUID(),
      draftRevision,
      blockId: null,
    },
  })
  const runtimePolicy = await createStudioRuntimePolicy(
    f.configuration,
    createStudioRuntimeHosts(f.configuration.catalog, [
      { runtime: f.project.runtime, origin: 'https://runtime.test' },
    ]),
  )
  const state = {
    allowed: true,
    draftRevision,
    mutate: (value: unknown): unknown => value,
    afterDecision: () => {},
  }
  const service = new AuthorizePythonAnalysisService({
    authoring: new AuthorizeAuthoringRuntimeService(
      { readStudioRuntimeContext: async () => ({ revision: state.draftRevision, block: null }) },
      runtimePolicy,
    ),
  })
  policy = async (input) => {
    if (!state.allowed) return { status: 403, body: { error: { code: 'ACCESS_DENIED' } } }
    const body = await service.execute(
      {
        userId: actor.id,
        accountId: actor.id,
        name: actor.firstName,
        privileged: ['superadmin', 'admin', 'staff'].includes(actor.role),
        readOnly: false,
      },
      StudioPythonAnalysisAuthorizationSchema.parse(input),
    )
    state.afterDecision()
    return { status: 200, body: state.mutate(body) }
  }
  upstream = async (url) =>
    Response.json(
      url.endsWith('/open') ? { version: 1, sessionId, projectId: f.project.id } : { ready: true },
    )
  return { ...f, state, authorization }
}

it('exposes the three same-origin Python language endpoints used by the Admin editor', () => {
  for (const path of ['route.ts', '[id]/route.ts', '[id]/start/route.ts']) {
    expect(existsSync(resolve(routesDirectory, path))).toBe(true)
  }
  expect(openRoute.runtime).toBe('nodejs')
  expect(startRoute.runtime).toBe('nodejs')
  expect(sessionRoute.runtime).toBe('nodejs')
})

it('requires active staff/admin/superadmin and same-origin on every endpoint', async () => {
  await fixture()
  const calls = () => [
    openRoute.POST(request({})),
    startRoute.POST(request({}), params),
    sessionRoute.POST(request({}), params),
    sessionRoute.DELETE(closeRequest(), params),
  ]
  authenticated = false
  for (const response of await Promise.all(calls())) expect(response.status).toBe(401)
  authenticated = true
  actor.role = 'customer'
  for (const response of await Promise.all(calls())) expect(response.status).toBe(403)
  actor.role = 'admin'
  actor.status = 'suspended'
  for (const response of await Promise.all(calls())) expect(response.status).toBe(403)
  actor.status = 'active'
  requestHeaders.set('sec-fetch-site', 'same-site')
  for (const response of await Promise.all(calls())) expect(response.status).toBe(403)
  expect(policyCalls).toHaveLength(0)
  expect(upstreamCalls).toHaveLength(0)
})

it('uses real authoring policy for all three active staff roles without exposing the token', async () => {
  const f = await fixture()
  for (const role of ['staff', 'admin', 'superadmin']) {
    actor.role = role
    const response = await openRoute.POST(request({ authorization: f.authorization }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store, no-transform')
    const text = await response.text()
    expect(text).not.toContain(environment.STUDIO_PYTHON_LANGUAGE_TOKEN)
    expect(JSON.parse(text)).toEqual({
      transportVersion: 1,
      status: 200,
      body: { version: 1, sessionId, projectId: f.project.id },
    })
    expect(policyCalls.at(-1)?.path).toBe('/members/studio/python-analysis')
    expect(policyCalls.at(-1)?.options.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(upstreamCalls.at(-1)?.init?.headers).get('authorization')).toBe(
      `Bearer ${environment.STUDIO_PYTHON_LANGUAGE_TOKEN}`,
    )
  }
})

it('rejects other contexts and injected authority before policy or language transport', async () => {
  const f = await fixture()
  const contexts = [
    { kind: 'free', projectId: f.project.id, audience: 'kids' },
    {
      kind: 'lesson',
      lessonId: crypto.randomUUID(),
      blockId: crypto.randomUUID(),
      baselineId: 'b'.repeat(64),
    },
    {
      kind: 'live',
      workspaceId: crypto.randomUUID(),
      sessionId: null,
      blockId: null,
      deviceId: crypto.randomUUID(),
      writerEpoch: 1,
      expectedWorkspaceRevision: 0,
    },
  ]
  for (const context of contexts) {
    const authorization = StudioPythonAnalysisAuthorizationSchema.parse({
      ...f.authorization,
      context,
    })
    for (const response of await Promise.all([
      openRoute.POST(request({ authorization })),
      startRoute.POST(request({ authorization }), params),
      sessionRoute.POST(request({ authorization, command: sync }), params),
      sessionRoute.POST(
        request({
          authorization,
          command: { version: 1, id: 'cancel', kind: 'cancel', requestId: 'sync' },
        }),
        params,
      ),
    ]))
      expect(response.status).toBe(403)
  }
  for (const authorization of [
    { ...f.authorization, context: { kind: 'public' } },
    { ...f.authorization, actor: { userId: actor.id } },
    { ...f.authorization, operation: 'execute' },
  ])
    expect((await openRoute.POST(request({ authorization }))).status).toBe(400)
  expect(policyCalls).toHaveLength(0)
  expect(upstreamCalls).toHaveLength(0)
})

it('reauthorizes start and queries, while denied contexts can still cancel or close their own lease', async () => {
  const f = await fixture()
  for (const response of await Promise.all([
    openRoute.POST(request({ authorization: f.authorization })),
    startRoute.POST(request({ authorization: f.authorization }), params),
    sessionRoute.POST(request({ authorization: f.authorization, command: sync }), params),
  ]))
    expect((await response.json()).status).toBe(200)
  expect(policyCalls).toHaveLength(3)
  const binding = new Headers(upstreamCalls[0]?.init?.headers).get('x-studio-python-binding')
  expect(binding).toMatch(/^[a-f0-9]{64}$/)
  for (const call of upstreamCalls)
    expect(new Headers(call.init?.headers).get('x-studio-python-binding')).toBe(binding)
  f.state.allowed = false
  expect((await startRoute.POST(request({ authorization: f.authorization }), params)).status).toBe(
    403,
  )
  expect(
    (await sessionRoute.POST(request({ authorization: f.authorization, command: sync }), params))
      .status,
  ).toBe(403)
  expect(upstreamCalls).toHaveLength(3)
  const cancelled = await sessionRoute.POST(
    request({
      authorization: f.authorization,
      command: { version: 1, id: 'cancel', kind: 'cancel', requestId: 'sync' },
    }),
    params,
  )
  expect((await cancelled.json()).status).toBe(200)
  expect((await sessionRoute.DELETE(closeRequest(), params)).status).toBe(200)
  expect(policyCalls).toHaveLength(5)
  expect(new Headers(upstreamCalls.at(-2)?.init?.headers).get('x-studio-python-operation')).toBe(
    'cancel',
  )
})

it('isolates two Admin identities even with the same project and browser-supplied session ID', async () => {
  const f = await fixture()
  await (await openRoute.POST(request({ authorization: f.authorization }))).json()
  const first = upstreamCalls[0]?.url
  const firstBinding = new Headers(upstreamCalls[0]?.init?.headers).get('x-studio-python-binding')
  actor.id = crypto.randomUUID()
  await (await openRoute.POST(request({ authorization: f.authorization }))).json()
  await sessionRoute.DELETE(closeRequest(), params)
  const second = upstreamCalls[1]?.url
  expect(second).not.toBe(first)
  expect(new Headers(upstreamCalls[1]?.init?.headers).get('x-studio-python-binding')).not.toBe(
    firstBinding,
  )
  expect(upstreamCalls[2]?.url).toBe(second?.replace(/open$/, sessionId))
  expect(upstreamCalls[2]?.url).not.toBe(first?.replace(/open$/, sessionId))
})

it('rejects expired/mismatched leases and malformed session IDs before language dispatch', async () => {
  const f = await fixture()
  for (const change of [
    { expiresAt: 1 },
    { actor: { userId: crypto.randomUUID(), accountId: actor.id } },
    { subjectSha256: 'f'.repeat(64) },
    { context: { ...f.authorization.context, draftRevision: crypto.randomUUID() } },
  ]) {
    f.state.mutate = (body) => ({ ...Object(body), ...change })
    expect((await openRoute.POST(request({ authorization: f.authorization }))).status).toBe(503)
  }
  expect(
    (
      await sessionRoute.POST(request({ authorization: f.authorization, command: sync }), {
        params: Promise.resolve({ id: '../other-owner' }),
      })
    ).status,
  ).toBe(400)
  expect(upstreamCalls).toHaveLength(0)
})

it('does not dispatch after cancellation between the fresh decision and language request', async () => {
  const f = await fixture()
  const controller = new AbortController()
  f.state.afterDecision = () => controller.abort()
  const response = await openRoute.POST(
    request({ authorization: f.authorization }, controller.signal),
  )
  expect(response.status).toBe(503)
  expect(policyCalls[0]?.options.signal?.aborted).toBe(true)
  expect(upstreamCalls).toHaveLength(0)
})

it('propagates cancellation while the Admin gateway authorization is still pending', async () => {
  const started = Promise.withResolvers<AbortSignal>()
  upstream = async (_url, init) => {
    const signal = init?.signal
    if (!signal) throw new Error('Gateway signal missing')
    started.resolve(signal)
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  }
  const controller = new AbortController()
  const result = originalGateway
    .gatewayFetch('/members/studio/python-analysis', {
      method: 'POST',
      body: {},
      signal: controller.signal,
    })
    .then(
      () => 'completed',
      (error: unknown) => error,
    )
  const signal = await started.promise
  controller.abort()
  expect(await result).toBeInstanceOf(DOMException)
  expect(signal.aborted).toBe(true)
  expect(upstreamCalls[0]?.url).toBe('https://gateway.internal/members/studio/python-analysis')
})

it('aborts language work when the response consumer closes the streamed acknowledgement', async () => {
  const f = await fixture()
  const started = Promise.withResolvers<AbortSignal>()
  upstream = async (_url, init) => {
    const signal = init?.signal
    if (!signal) throw new Error('Transport signal missing')
    started.resolve(signal)
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  }
  const response = await startRoute.POST(request({ authorization: f.authorization }), params)
  const signal = await started.promise
  const reader = response.body?.getReader()
  expect(reader).toBeDefined()
  expect((await reader?.read())?.done).toBe(false)
  await reader?.cancel()
  expect(signal.aborted).toBe(true)
})

it('preserves expired-session transport errors and refuses oversized/compressed requests', async () => {
  const f = await fixture()
  upstream = async () => Response.json({ error: 'expired' }, { status: 410 })
  const response = await startRoute.POST(request({ authorization: f.authorization }), params)
  expect(await response.json()).toMatchObject({
    status: 410,
    body: { error: { code: 'PYTHON_ANALYSIS_EXPIRED' } },
  })
  const before = policyCalls.length
  const compressed = request({ authorization: f.authorization })
  compressed.headers.set('content-encoding', 'gzip')
  expect((await openRoute.POST(compressed)).status).toBe(400)
  expect((await openRoute.POST(request({ extra: 'x'.repeat(2_001_025) }))).status).toBe(413)
  expect(policyCalls).toHaveLength(before)
})
