import { afterEach, expect, spyOn, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import type { StudioLiveProSnapshot } from '@sistemazero/core/studio/live-pro-runtime'
import { liveUpstreamPath } from '../src/lib/live-route-policy'
import { createLiveProRuntimeBuild } from '../src/routes/live-pro-runtime'
import type { GatewayResponse } from '../src/server/gateway'

const oldUrl = process.env.STUDIO_PRO_RUNTIME_URL
const oldToken = process.env.STUDIO_PRO_RUNTIME_TOKEN
const fetchDouble = (
  fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
): typeof fetch => Object.assign(fn, { preconnect: globalThis.fetch.preconnect })
afterEach(() => {
  if (oldUrl === undefined) delete process.env.STUDIO_PRO_RUNTIME_URL
  else process.env.STUDIO_PRO_RUNTIME_URL = oldUrl
  if (oldToken === undefined) delete process.env.STUDIO_PRO_RUNTIME_TOKEN
  else process.env.STUDIO_PRO_RUNTIME_TOKEN = oldToken
})
async function fixture() {
  process.env.STUDIO_PRO_RUNTIME_URL = 'https://runtime.example.test'
  process.env.STUDIO_PRO_RUNTIME_TOKEN = 'public-fixture-token'
  const id = crypto.randomUUID()
  const context = {
    kind: 'live' as const,
    workspaceId: id,
    sessionId: crypto.randomUUID(),
    blockId: crypto.randomUUID(),
    deviceId: crypto.randomUUID(),
    writerEpoch: 2,
  }
  const project = {
    id,
    formatVersion: 2,
    kind: 'pro',
    mode: 'code',
    name: 'Oficina',
    createdAt: 1,
    updatedAt: 1,
    files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    ir: null,
    blocksState: null,
    installedExtensions: [],
    proMeta: { templateId: 'vanilla-js', devScript: 'dev' },
    tree: { 'index.html': { kind: 'file', content: '<main>Fonte autorizada</main>' } },
  }
  const snapshot: StudioLiveProSnapshot = {
    context,
    actor: { userId: crypto.randomUUID(), accountId: crypto.randomUUID() },
    workspaceRevision: 3,
    project,
    projectSha256: await sha256Hex(canonicalJson(project)),
    templateId: 'vanilla-js',
    expiresAt: Date.now() + 30_000,
  }
  const body = { context, expectedWorkspaceRevision: 3 }
  const artifact = {
    id: 'a'.repeat(64),
    sha256: 'b'.repeat(64),
    url: `https://runtime.example.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
    expiresAt: Date.now() + 60_000,
  }
  const calls: unknown[] = []
  let result: GatewayResponse = { status: 200, body: snapshot }
  let access: { readonly: boolean; support?: boolean } | null = { readonly: false }
  const handler = createLiveProRuntimeBuild({
    session: async () => access,
    gatewayFetch: async (path, options) => {
      calls.push({ path, body: options.body })
      return result
    },
  })
  return {
    snapshot,
    artifact,
    body,
    calls,
    deny(status: number) {
      result = { status, body: { private: 'never-forward-this' } }
    },
    access(value: typeof access) {
      access = value
    },
    send(payload: unknown = body, headers: Record<string, string> = {}, signal?: AbortSignal) {
      return handler(
        new Request(`https://kids.test/api/live/workspaces/${id}/pro-build`, {
          method: 'POST',
          body: JSON.stringify(payload),
          signal,
          headers: { 'content-type': 'application/json', ...headers },
        }),
        { params: Promise.resolve({ workspaceId: id }) },
      )
    },
  }
}

test('live BFF compiles only the private saved snapshot and returns only a revision-bound artifact', async () => {
  const f = await fixture()
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    fetchDouble(async (url, init) => {
      expect(String(url)).toBe('https://runtime.example.test/v1/build')
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer public-fixture-token')
      const envelope = JSON.parse(String(init?.body))
      expect(envelope.files).toEqual({ 'index.html': '<main>Fonte autorizada</main>' })
      expect(envelope.executionId).toMatch(/^live-[a-f0-9]{48}$/)
      expect(envelope.executionId).not.toContain(f.snapshot.actor.userId)
      return Response.json({ ok: true, artifact: f.artifact, output: 'ok' })
    }),
  )
  try {
    const response = await f.send()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      artifact: f.artifact,
      output: 'ok',
      workspaceRevision: 3,
    })
    expect(f.calls).toEqual(
      Array.from({ length: 2 }, () => ({
        path: `/members/live/workspaces/${f.body.context.workspaceId}/pro-build-snapshot`,
        body: f.body,
      })),
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  } finally {
    fetch.mockRestore()
  }
})

test('a loss of authority after compilation does not expose the finished artifact', async () => {
  const f = await fixture()
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    fetchDouble(async () => {
      f.deny(409)
      return Response.json({ ok: true, artifact: f.artifact })
    }),
  )
  try {
    const response = await f.send()
    expect(response.status).toBe(409)
    expect(JSON.stringify(await response.json())).not.toContain(f.artifact.url)
    expect(f.calls).toHaveLength(2)
  } finally {
    fetch.mockRestore()
  }
})

test('support, malformed/oversized/forged requests, expired/tampered snapshots fail before compilation', async () => {
  const f = await fixture()
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    fetchDouble(async () => {
      throw new Error('Unexpected build')
    }),
  )
  try {
    for (const access of [null, { readonly: true }, { readonly: false, support: true }]) {
      f.access(access)
      expect([401, 403]).toContain((await f.send()).status)
    }
    f.access({ readonly: false })
    for (const field of ['project', 'templateId', 'capabilities', 'runtimeUrl'])
      expect((await f.send({ ...f.body, [field]: 'forged' })).status).toBe(400)
    expect((await f.send({ ...f.body, oversized: 'a'.repeat(4096) })).status).toBe(413)
    expect((await f.send(f.body, { 'content-encoding': 'gzip' })).status).toBe(415)
    expect(f.calls).toHaveLength(0)
    f.snapshot.project.name = 'Tampered'
    expect((await f.send()).status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    fetch.mockRestore()
  }
})

test('Members denial statuses are preserved without leaking its body; missing server config fails closed', async () => {
  const f = await fixture()
  for (const status of [401, 403, 404, 409, 429]) {
    f.deny(status)
    const response = await f.send()
    expect(response.status).toBe(status)
    expect(await response.text()).not.toContain('never-forward-this')
  }
  delete process.env.STUDIO_PRO_RUNTIME_TOKEN
  expect((await f.send()).status).toBe(503)
})

test('artifact origin and cancellation stay enforced by the existing real build helper', async () => {
  const f = await fixture()
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    fetchDouble(async () =>
      Response.json({
        ok: true,
        artifact: {
          ...f.artifact,
          url: f.artifact.url.replace('runtime.example.test', 'attacker.test'),
        },
      }),
    ),
  )
  try {
    expect((await f.send()).status).toBe(502)
    expect(f.calls).toHaveLength(1)
    const controller = new AbortController()
    controller.abort()
    expect((await f.send(f.body, {}, controller.signal)).status).toBe(504)
    expect(fetch).toHaveBeenCalledTimes(1)
  } finally {
    fetch.mockRestore()
  }
})

test('the generic live proxy never forwards the private source-snapshot endpoint', () => {
  for (const scope of ['learner', 'teacher', 'parent', 'admin'] as const)
    for (const method of ['GET', 'POST', 'PUT'])
      expect(
        liveUpstreamPath(scope, method, ['workspaces', crypto.randomUUID(), 'pro-build-snapshot']),
      ).toBeNull()
})
