import { afterEach, expect, spyOn, test } from 'bun:test'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import { createEmptyProject } from '@sistemazero/studio/project'
import { prepareEditableStudioProject } from '../../studio/src/state/editableProjectValidation'
import { serveArtifact, sha256, storeArtifact } from '../../studio-runtime/src/artifacts'
import { memoryArtifactBucket } from '../../studio-runtime/tests/artifact-bucket'
import { createFreeProRuntime } from '../src/lib/free-pro-runtime'
import { createFreeProRuntimeBuild } from '../src/server/free-pro-toolchain'

const originalUrl = process.env.STUDIO_PRO_RUNTIME_URL
const originalToken = process.env.STUDIO_PRO_RUNTIME_TOKEN
const originalPublicUrl = process.env.APP_PUBLIC_URL
const stubs: { mockRestore(): void }[] = []
afterEach(() => {
  for (const stub of stubs) stub.mockRestore()
  stubs.length = 0
  if (originalPublicUrl === undefined) delete process.env.APP_PUBLIC_URL
  else process.env.APP_PUBLIC_URL = originalPublicUrl
  if (originalUrl === undefined) delete process.env.STUDIO_PRO_RUNTIME_URL
  else process.env.STUDIO_PRO_RUNTIME_URL = originalUrl
  if (originalToken === undefined) delete process.env.STUDIO_PRO_RUNTIME_TOKEN
  else process.env.STUDIO_PRO_RUNTIME_TOKEN = originalToken
})
function project() {
  return {
    ...createEmptyProject('free-pro-test', 'Meu jogo'),
    kind: 'pro' as const,
    mode: 'code' as const,
    proMeta: { templateId: 'vanilla-vite' as const, devScript: 'dev' },
    tree: {
      'package.json': {
        kind: 'file' as const,
        content: JSON.stringify({
          name: 'jogo',
          private: true,
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies: { three: '0.184.0' },
          devDependencies: { vite: '8.1.6', typescript: '5.9.3' },
        }),
      },
      'index.html': { kind: 'file' as const, content: '<canvas id="tela"></canvas>' },
    },
  }
}
const request = (value: unknown) =>
  new Request('https://adult.test/api/studio/pro-runtime/free-build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
function runtime() {
  process.env.APP_PUBLIC_URL = 'https://adult.test'
  process.env.STUDIO_PRO_RUNTIME_URL = 'https://runtime.test'
  process.env.STUDIO_PRO_RUNTIME_TOKEN = 'only-upstream-secret'
  const calls: { url: string; init?: RequestInit }[] = []
  const stub = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(url), init })
        return Response.json({
          ok: true,
          artifact: {
            id: 'a'.repeat(64),
            sha256: 'b'.repeat(64),
            url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
            expiresAt: Date.now() + 60000,
          },
          durationMs: 15,
        })
      },
      { preconnect: fetch.preconnect },
    ),
  )
  stubs.push(stub)
  return calls
}
test('public adapter reaches guarded real BFF build with library project and preserves source', async () => {
  const calls = runtime(),
    source = project(),
    before = JSON.stringify(source)
  const handler = createFreeProRuntimeBuild(async () => ({ id: 'owner-one' }))
  const transport = async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(String(url)).toBe('/api/studio/pro-runtime/free-build')
    return handler(new Request(`https://adult.test${String(url)}`, init))
  }
  const adapter = createFreeProRuntime(transport)
  const built = await adapter.build({ project: source, signal: new AbortController().signal })
  expect(built.artifact?.url).toBe(`https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`)
  expect(calls.length).toBe(1)
  expect(calls[0]!.url).toBe('https://runtime.test/v1/build')
  expect(new Headers(calls[0]!.init?.headers).get('Authorization')).toBe(
    'Bearer only-upstream-secret',
  )
  const body = JSON.parse(String(calls[0]!.init?.body))
  expect(body.parentOrigin).toBe('https://adult.test')
  expect(JSON.parse(body.files['package.json']).dependencies.three).toBe('0.184.0')
  expect(body.files['index.html']).toBe(source.tree['index.html'].content)
  expect(body.executionId).not.toContain('owner-one')
  expect(JSON.stringify(source)).toBe(before)
  expect(JSON.stringify(built)).not.toContain('only-upstream-secret')
})
test('public build refuses denied access, wrong operation and missing project before invoking runtime', async () => {
  const calls = runtime(),
    source = project()
  const denied = createFreeProRuntimeBuild(async () =>
    Response.json({ error: { message: 'Sem Pro' } }, { status: 403 }),
  )
  expect((await denied(request({ project: source }))).status).toBe(403)
  const allowed = createFreeProRuntimeBuild(async () => ({ id: 'owner-one' }))
  expect((await allowed(request({ project: { ...source, id: '' } }))).status).toBe(400)
  const wrong = request({ project: source })
  wrong.headers.set('X-Studio-Pro-Operation', 'prepare-dependencies')
  expect((await allowed(wrong)).status).toBe(400)
  expect(calls.length).toBe(0)
})
test('public adapter retains compiler error output and refuses an expired artifact', async () => {
  const source = project(),
    signal = new AbortController().signal
  const errorAdapter = createFreeProRuntime(async () =>
    Response.json(
      { error: { message: 'Confira o código', output: 'author TS2322' } },
      { status: 422 },
    ),
  )
  try {
    await errorAdapter.build({ project: source, signal })
    throw Error('Build deveria falhar')
  } catch (error) {
    expect(error).toMatchObject({ message: 'Confira o código', output: 'author TS2322' })
  }
  const expired = createFreeProRuntime(async () =>
    Response.json({
      artifact: {
        id: 'a'.repeat(64),
        sha256: 'b'.repeat(64),
        url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
        expiresAt: Date.now() - 1,
      },
    }),
  )
  await expect(expired.build({ project: source, signal })).rejects.toThrow()
})

test('opening an existing public document preserves its files while hosted compilation keeps its quotas', async () => {
  const calls = runtime()
  const source = {
    ...project(),
    tree: {
      ...project().tree,
      'large.js': {
        kind: 'file' as const,
        content: '// retained source\n' + ' '.repeat(STUDIO_PRO_BUILD_LIMITS.maxFileChars),
      },
    },
  }
  const before = JSON.stringify(source)
  const handler = createFreeProRuntimeBuild(async () => ({ id: 'owner-one' }))
  const adapter = createFreeProRuntime(async (url, init) =>
    handler(new Request('https://adult.test' + String(url), init)),
  )
  const opened = await prepareEditableStudioProject(source, { proBuildLimits: adapter.limits })
  expect(opened?.tree).toEqual(source.tree)
  await expect(adapter.build({ project: source })).rejects.toThrow()
  expect(calls.length).toBe(0)
  expect(JSON.stringify(source)).toBe(before)
})

test('public build behind a proxy binds the artifact to configured app origin, ignoring caller origins', async () => {
  const calls = runtime()
  process.env.APP_PUBLIC_URL = 'https://adult.test/some/path'
  const handler = createFreeProRuntimeBuild(async () => ({ id: 'owner-one' }))
  const response = await handler(
    new Request('https://[::]:3007/api/studio/pro-runtime/free-build', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://caller.invalid',
        'X-Forwarded-Host': 'caller.invalid',
      },
      body: JSON.stringify({ project: project(), parentOrigin: 'https://caller.invalid' }),
    }),
  )
  expect(response.status).toBe(200)
  expect(calls.length).toBe(1)
  expect(JSON.parse(String(calls[0]!.init?.body)).parentOrigin).toBe('https://adult.test')
  const { bucket } = memoryArtifactBucket()
  const bytes = new TextEncoder().encode('<canvas></canvas>')
  const artifact = await storeArtifact({
    bucket,
    origin: 'https://runtime.test',
    parentOrigin: JSON.parse(String(calls[0]!.init?.body)).parentOrigin,
    manifest: {
      version: 1,
      files: [{ path: 'index.html', bytes: bytes.length, sha256: await sha256(bytes) }],
    },
    read: async () => bytes,
  })
  const served = await serveArtifact(new Request(artifact.url), bucket)
  const policy = served.headers.get('content-security-policy')
  expect(served.status).toBe(200)
  expect(policy).toContain('frame-ancestors https://adult.test;')
  expect(policy).toContain('sandbox allow-scripts allow-pointer-lock;')
  expect(policy).not.toContain('allow-same-origin')
  expect(policy).not.toContain('[::]')
})

test('public build refuses missing or invalid configured origins before invoking the compiler', async () => {
  const calls = runtime()
  const handler = createFreeProRuntimeBuild(async () => ({ id: 'owner-one' }))
  for (const value of [undefined, 'not-a-url', 'data:text/html,no-parent']) {
    if (value === undefined) delete process.env.APP_PUBLIC_URL
    else process.env.APP_PUBLIC_URL = value
    const result = await handler(request({ project: project() }))
    expect(result.status).toBe(503)
  }
  expect(calls.length).toBe(0)
})
