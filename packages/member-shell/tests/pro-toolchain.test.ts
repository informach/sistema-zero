import { afterEach, expect, spyOn, test } from 'bun:test'
import { createEmptyProject } from '@sistemazero/studio/project'
import { prepareRuntimeDependencyLock } from '../../studio-runtime/src/dependency-lock'
import { createProToolchainPreparer } from '../src/lib/pro-toolchain'
import { createLessonProRuntimeBuild } from '../src/routes/lesson-pro-runtime'
import { createFreeProToolchainPreparation } from '../src/server/free-pro-toolchain'
import { prepareStudioProToolchain, proRuntimeOperation } from '../src/server/studio-pro-runtime'

const oldUrl = process.env.STUDIO_PRO_RUNTIME_URL,
  oldToken = process.env.STUDIO_PRO_RUNTIME_TOKEN
const fetches: { mockRestore(): void }[] = []
afterEach(() => {
  for (const fetch of fetches) fetch.mockRestore()
  fetches.length = 0
  if (oldUrl === undefined) delete process.env.STUDIO_PRO_RUNTIME_URL
  else process.env.STUDIO_PRO_RUNTIME_URL = oldUrl
  if (oldToken === undefined) delete process.env.STUDIO_PRO_RUNTIME_TOKEN
  else process.env.STUDIO_PRO_RUNTIME_TOKEN = oldToken
})
function project() {
  return {
    ...createEmptyProject('legacy-test', 'Antigo'),
    kind: 'pro' as const,
    mode: 'code' as const,
    proMeta: { templateId: 'vanilla-vite' as const, devScript: 'dev' },
    tree: {
      'package.json': {
        kind: 'file' as const,
        content: JSON.stringify({
          name: 'jogo',
          private: true,
          scripts: { dev: 'vite' },
          devDependencies: { vite: '8.0.16', typescript: '5.9.3' },
        }),
      },
      'package-lock.json': { kind: 'file' as const, content: '{}' },
      'index.html': { kind: 'file' as const, content: '<main>Jogo</main>' },
    },
  }
}
function request(body: unknown, operation: string = 'prepare-dependencies') {
  return new Request('https://kids.test/api/studio/pro-runtime/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Studio-Pro-Operation': operation },
    body: JSON.stringify(body),
  })
}
function canonicalFetch() {
  process.env.STUDIO_PRO_RUNTIME_URL = 'https://runtime.test'
  process.env.STUDIO_PRO_RUNTIME_TOKEN = 'private-runtime-token'
  const stub = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        expect(String(url)).toBe('https://runtime.test/v1/dependencies')
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer private-runtime-token')
        const body = JSON.parse(String(init?.body))
        expect(JSON.parse(body.packageJson).devDependencies.vite).toBe('8.1.6')
        expect(body.files).toBeUndefined()
        return Response.json({ packageLock: prepareRuntimeDependencyLock(body.packageJson) })
      },
      { preconnect: fetch.preconnect },
    ),
  )
  fetches.push(stub)
  return stub
}
test('closed operation discriminator and server-side derivation retain canonical preparation', async () => {
  const stub = canonicalFetch(),
    original = project(),
    before = JSON.stringify(original)
  expect(proRuntimeOperation(new Request('https://kids.test'))).toBe('build')
  expect(() => proRuntimeOperation(request({}, 'install'))).toThrow()
  const result = await prepareStudioProToolchain({
    project: original,
    executionId: 'lesson-1234567890abcdef',
    runtimeUrl: 'https://runtime.test',
    runtimeToken: 'private-runtime-token',
  })
  expect(JSON.parse(result.packageLock).packages['node_modules/vite'].version).toBe('8.1.6')
  expect(JSON.stringify(original)).toBe(before)
  expect(stub).toHaveBeenCalledTimes(1)
  const invalid = project()
  invalid.tree['package.json'].content = JSON.stringify({
    devDependencies: { vite: '8.0.16' },
    dependencies: { unknown: '1.0.0' },
  })
  await expect(
    prepareStudioProToolchain({
      project: invalid,
      executionId: 'lesson-1234567890abcdef',
      runtimeUrl: 'https://runtime.test',
      runtimeToken: 'private-runtime-token',
    }),
  ).rejects.toThrow()
  expect(stub).toHaveBeenCalledTimes(2)
})
test('Full preparation requires its existing page guard and never builds or forwards secrets', async () => {
  const stub = canonicalFetch()
  const denied = createFreeProToolchainPreparation(async () =>
    Response.json({ error: { message: 'Sem Pro' } }, { status: 403 }),
  )
  expect((await denied(request({ project: project() }))).status).toBe(403)
  expect(stub).not.toHaveBeenCalled()
  const allowed = createFreeProToolchainPreparation(async () => ({ id: 'perfil-123' }))
  expect((await allowed(request({ project: project() }, 'install'))).status).toBe(400)
  const res = await allowed(request({ project: project() }))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(Object.keys(body)).toEqual(['packageLock'])
  expect(JSON.stringify(body)).not.toContain('private-runtime-token')
  expect(stub).toHaveBeenCalledTimes(1)
})
test('lessons prepare only after enrollment, block and editable Pro baseline checks', async () => {
  const stub = canonicalFetch()
  const initial = project()
  let admitted = true,
    readOnly = false
  type Dependencies = Parameters<typeof createLessonProRuntimeBuild>[0]
  const deps = {
    audience: 'kids',
    getSession: async () => ({ id: 'aluno', activeProfile: { accountId: 'conta' } }),
    getLesson: async () =>
      admitted
        ? { status: 200, body: { blocks: [{ id: 'bloco', kind: 'studio' }] } }
        : { status: 403, body: null },
    openLessonStudio: async () => ({
      status: 200,
      body: {
        bound: true,
        readOnly,
        lessonId: 'aula',
        blockId: 'bloco',
        configuration: { initialProject: initial },
      },
    }),
  } as unknown as Dependencies
  const handler = createLessonProRuntimeBuild(deps),
    body = { courseSlug: 'curso', lessonId: 'aula', blockId: 'bloco', project: initial }
  admitted = false
  expect((await handler(request(body))).status).toBe(403)
  admitted = true
  readOnly = true
  expect((await handler(request(body))).status).toBe(403)
  expect(stub).not.toHaveBeenCalled()
  readOnly = false
  const res = await handler(request(body))
  expect(res.status).toBe(200)
  expect(Object.keys(await res.json())).toEqual(['packageLock'])
  expect(stub).toHaveBeenCalledTimes(1)
})
test('client preparation uses the existing context and closed header, with no AI or replacement manifest', async () => {
  const captured: { headers?: Headers; body?: Record<string, unknown> } = {}
  const fn = Object.assign(
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured.headers = new Headers(init?.headers)
      captured.body = JSON.parse(String(init?.body))
      return Response.json({ packageLock: 'canonical-lock' })
    },
    { preconnect: fetch.preconnect },
  )
  const prepare = createProToolchainPreparer('/api/studio/pro-runtime/build', fn, {
    courseSlug: 'curso',
    lessonId: 'aula',
    blockId: 'bloco',
  })
  expect(
    await prepare({
      project: project(),
      packageJson: 'not-sent',
      signal: new AbortController().signal,
    }),
  ).toBe('canonical-lock')
  expect(captured.headers?.get('X-Studio-Pro-Operation')).toBe('prepare-dependencies')
  expect(captured.body).toMatchObject({ courseSlug: 'curso', lessonId: 'aula', blockId: 'bloco' })
  expect(captured.body?.packageJson).toBeUndefined()
})

test('Full cancellation closes the real partial request reader after reading starts', async () => {
  const abort = new AbortController()
  let readingStarted!: () => void
  const started = new Promise<void>((resolve) => {
    readingStarted = resolve
  })
  let closeStream!: () => void
  let pulls = 0
  let cancellations = 0
  const stream = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        closeStream = () => controller.close()
      },
      pull(controller) {
        pulls++
        if (pulls === 1) controller.enqueue(new TextEncoder().encode('{"project":'))
        else {
          readingStarted()
          return new Promise<void>(() => {})
        }
      },
      cancel() {
        cancellations++
      },
    },
    { highWaterMark: 0 },
  )
  const input = new Request('https://kids.test/api/studio/pro-runtime/dependencies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Studio-Pro-Operation': 'prepare-dependencies',
    },
    body: stream,
    signal: abort.signal,
  })
  const handler = createFreeProToolchainPreparation(async () => ({ id: 'perfil-123' }))
  const pending = handler(input)
  try {
    await started
    expect(input.body?.locked).toBe(true)
    abort.abort(new DOMException('Aluno saiu do editor', 'AbortError'))
    expect((await pending).status).toBe(504)
    expect(cancellations).toBe(1)
  } finally {
    // Release the old implementation's pending read in the RED control, too.
    if (cancellations === 0) closeStream()
  }
})
