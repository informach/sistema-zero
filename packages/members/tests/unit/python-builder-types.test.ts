import { expect, test } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createStudioProRevision } from '@sistemazero/core/studio/pro-revision'
import { inspectStudioPythonBuilderTypes } from '@sistemazero/core/studio/python-builder-types'
import { parsePythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import { providedPythonRelease } from '../../../core/tests/fixtures/python-provided-release'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { PythonLanguageSession } from '../../../studio-language-service/runtime/pyright'
import { authoringFixture } from '../fakes/studio-authoring-policy'

function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function fixture(helperSource?: string) {
  const { project } = await authoringFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Python Pro expected')
  project.tree['src/main.py'] = {
    kind: 'file',
    content: 'from helper import n\nprint("ação", n)\n',
  }
  if (helperSource !== undefined)
    project.tree['src/helper.py'] = { kind: 'file', content: helperSource }
  return capturePythonProRevisionPayload(project)
}
const diagnostic = {
  path: 'src/main.py',
  start: 0,
  length: 4,
  code: 'test',
  source: 'Pyright',
  message: 'controlled service diagnostic',
  severity: 'warning',
}

async function service(
  input: {
    reply?: Record<string, unknown>
    openGate?: ReturnType<typeof gate>
    closeGate?: ReturnType<typeof gate>
    queryGate?: ReturnType<typeof gate>
    closeFails?: boolean
    helperSource?: string
    handle?(command: unknown): Promise<unknown>
    dispose?(): void
  } = {},
) {
  const f = await fixture(input.helperSource),
    requests: { method: string; path: string; body: unknown; headers: Headers }[] = []
  const sawOpen = gate(),
    sawQuery = gate(),
    sawClose = gate()
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(req) {
      const path = new URL(req.url).pathname,
        body: unknown = req.method === 'DELETE' ? null : await req.json()
      requests.push({ method: req.method, path, body, headers: req.headers })
      if (path.endsWith('/open')) {
        sawOpen.resolve()
        await input.openGate?.promise
        return Response.json({ version: 1, sessionId: 'c'.repeat(32), projectId: f.base.projectId })
      }
      if (req.method === 'DELETE') {
        sawClose.resolve()
        await input.closeGate?.promise
        input.dispose?.()
        return Response.json(
          { closed: !input.closeFails },
          { status: input.closeFails ? 503 : 200 },
        )
      }
      if (path.endsWith('/start')) return Response.json({ ready: true })
      if (input.handle) return Response.json(await input.handle(body))
      if (req.headers.get('x-studio-python-operation') === 'sync')
        return Response.json({ version: 1, id: 'builder_sync', kind: 'synced', revision: 1 })
      sawQuery.resolve()
      await input.queryGate?.promise
      return Response.json({
        version: 1,
        id: 'builder_types',
        kind: 'result',
        method: 'projectDiagnostics',
        revision: 1,
        path: 'src/main.py',
        documentVersion: 1,
        result: [],
        ...input.reply,
      })
    },
  })
  let checks = 0
  const cleanupErrors: Error[] = []
  const options = {
    revision: f.base,
    binaries: f.binaries,
    owner: 'a'.repeat(64),
    binding: 'b'.repeat(64),
    serviceUrl: server.url.href,
    serviceToken: 'private-test-token',
    allowLocalHttp: true,
    signal: new AbortController().signal,
    async authorize() {
      checks++
      return {}
    },
    cleanupFailed(error: Error) {
      cleanupErrors.push(error)
    },
  }
  return {
    options,
    requests,
    sawOpen,
    sawQuery,
    sawClose,
    cleanupErrors,
    checks: () => checks,
    stop: () => server.stop(true),
  }
}

test('builder types uses actual TCP protocol, complete sources and distinct CAS/execution identities', async () => {
  const f = await service({ reply: { result: [diagnostic] } })
  try {
    const output = await inspectStudioPythonBuilderTypes(f.options)
    expect(output.types.status).toBe('passed')
    expect(output.types.revision).toBe(f.options.revision.hash)
    expect(output.types.executionRevision).not.toBe(output.types.revision)
    expect(f.requests.map((r) => r.method)).toEqual(['POST', 'POST', 'POST', 'POST', 'DELETE'])
    expect(f.requests[2]?.body).toMatchObject({
      kind: 'sync',
      changes: expect.arrayContaining([
        { path: 'src/main.py', version: 1, source: 'from helper import n\nprint("ação", n)\n' },
        { path: 'src/helper.py', version: 1, source: expect.any(String) },
      ]),
    })
    expect(
      f.requests.every((r) => r.headers.get('authorization') === 'Bearer private-test-token'),
    ).toBe(true)
    expect(f.requests[2]?.headers.get('x-studio-python-binding')).toBe('b'.repeat(64))
    expect(f.checks()).toBe(6)
    expect(f.cleanupErrors).toEqual([])
  } finally {
    f.stop()
  }
})

test('provided-module authorization reaches Open without accepting an unknown policy result', async () => {
  const f = await service()
  try {
    const runtimeRelease = await providedPythonRelease()
    const configuration = f.options.revision.configuration
    if (configuration.programmingLanguage !== 'python') throw new Error('Expected Python')
    const revision = await createStudioProRevision({
      ...f.options.revision,
      configuration: {
        ...configuration,
        runtime: {
          profileId: runtimeRelease.profileId,
          releaseId: runtimeRelease.releaseId,
          manifestSha256: runtimeRelease.manifestSha256,
        },
        python: {
          ...configuration.python,
          dependencyLock: {
            ...configuration.python.dependencyLock,
            runtimeManifestSha256: runtimeRelease.manifestSha256,
          },
        },
      },
    })
    const output = await inspectStudioPythonBuilderTypes({
      ...f.options,
      revision,
      authorize: async () => ({ runtimeRelease }),
    })
    expect(output.types.status).toBe('passed')
    expect(f.requests[0]?.body).toMatchObject({ runtimeRelease })
  } finally {
    f.stop()
  }
})

test('unknown policy result is refused before any reservation', async () => {
  const f = await service()
  try {
    await expect(
      inspectStudioPythonBuilderTypes({
        ...f.options,
        authorize: async () => JSON.parse('null'),
      }),
    ).rejects.toThrow()
    expect(f.requests).toEqual([])
  } finally {
    f.stop()
  }
})

test.each([
  [[], 'passed'],
  [[{ ...diagnostic, severity: 'error' }], 'failed'],
  [Array.from({ length: 100 }, () => diagnostic), 'incomplete'],
  [Array.from({ length: 100 }, () => ({ ...diagnostic, severity: 'error' })), 'failed'],
] as const)('bounded diagnostics do not silently certify a truncated project (%#)', async (items, expected) => {
  const f = await service({ reply: { result: items } })
  try {
    expect((await inspectStudioPythonBuilderTypes(f.options)).types.status).toBe(expected)
  } finally {
    f.stop()
  }
})

test.each([
  { id: 'wrong' },
  { revision: 2 },
  { documentVersion: 2 },
  { path: 'another.py' },
  { result: [{ ...diagnostic, path: '../secret.py' }] },
  { result: [{ ...diagnostic, start: 10000 }] },
  { result: Array.from({ length: 101 }, () => diagnostic) },
])('invalid diagnostics identity or scope never approves and closes its session (%#)', async (reply) => {
  const f = await service({ reply })
  try {
    const error = await inspectStudioPythonBuilderTypes(f.options).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    expect(f.requests.at(-1)?.method).toBe('DELETE')
  } finally {
    f.stop()
  }
})

test('withdrawal during reservation retires a late session without starting Python', async () => {
  const openGate = gate(),
    f = await service({ openGate }),
    controller = new AbortController()
  try {
    const pending = inspectStudioPythonBuilderTypes({
      ...f.options,
      signal: controller.signal,
    }).then(
      () => null,
      (error: Error) => error,
    )
    await f.sawOpen.promise
    controller.abort(new DOMException('owner retired', 'AbortError'))
    expect((await pending)?.name).toBe('AbortError')
    openGate.resolve()
    await f.sawClose.promise
    expect(f.requests.map((r) => r.method)).toEqual(['POST', 'DELETE'])
  } finally {
    openGate.resolve()
    f.stop()
  }
})

test('withdrawal during query blocks approval and cleans up independently of caller signal', async () => {
  const queryGate = gate(),
    f = await service({ queryGate }),
    controller = new AbortController()
  try {
    const pending = inspectStudioPythonBuilderTypes({
      ...f.options,
      signal: controller.signal,
    }).then(
      () => null,
      (error: Error) => error,
    )
    await f.sawQuery.promise
    controller.abort(new DOMException('owner retired', 'AbortError'))
    expect((await pending)?.name).toBe('AbortError')
    expect(f.requests.at(-1)?.method).toBe('DELETE')
  } finally {
    queryGate.resolve()
    f.stop()
  }
})

test('withdrawal while cleanup is pending cannot return a successful report', async () => {
  const closeGate = gate(),
    f = await service({ closeGate }),
    controller = new AbortController()
  try {
    const pending = inspectStudioPythonBuilderTypes({
      ...f.options,
      signal: controller.signal,
    }).then(
      () => null,
      (error: Error) => error,
    )
    await f.sawClose.promise
    controller.abort(new DOMException('owner retired', 'AbortError'))
    closeGate.resolve()
    expect((await pending)?.name).toBe('AbortError')
  } finally {
    closeGate.resolve()
    f.stop()
  }
})

test('cleanup refusal never returns passing evidence', async () => {
  const f = await service({ closeFails: true })
  try {
    const error = await inspectStudioPythonBuilderTypes(f.options).then(
      () => null,
      (reason) => reason,
    )
    expect(error).toMatchObject({ code: 'cleanup-pending' })
  } finally {
    f.stop()
  }
})

test('fresh authorization refusal prevents the next operation and still releases its session', async () => {
  const f = await service()
  let count = 0
  try {
    const error = await inspectStudioPythonBuilderTypes({
      ...f.options,
      async authorize() {
        if (++count === 3) throw new Error('revoked')
        return {}
      },
    }).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error?.message).toBe('revoked')
    expect(f.requests.map((r) => r.path.split('/').at(-1))).toEqual([
      'open',
      'start',
      'c'.repeat(32),
    ])
    expect(f.requests.at(-1)?.method).toBe('DELETE')
  } finally {
    f.stop()
  }
})

test('loopback requires explicit development authorization before making any request', async () => {
  const f = await service()
  try {
    const error = await inspectStudioPythonBuilderTypes({
      ...f.options,
      allowLocalHttp: false,
    }).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    expect(f.requests).toEqual([])
  } finally {
    f.stop()
  }
})

test('response rejected from its declared length still retires the owned stream and session', async () => {
  const f = await service()
  let cancelled = 0
  try {
    const error = await inspectStudioPythonBuilderTypes({
      ...f.options,
      async fetchImpl(url, init) {
        if (String(url).endsWith('/start'))
          return new Response(
            new ReadableStream({
              cancel() {
                cancelled++
              },
            }),
            { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } },
          )
        return fetch(url, init)
      },
    }).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    expect(cancelled).toBe(1)
    expect(f.requests.at(-1)?.method).toBe('DELETE')
  } finally {
    f.stop()
  }
})

test('analysis quota refuses the entire workspace before reserving, without deleting files', async () => {
  const f = await service()
  const files = { ...f.options.revision.files }
  for (let index = 0; index < 51; index++) files[`src/extra${index}.py`] = 'n = 1\n'
  const revision = await createStudioProRevision({ ...f.options.revision, files })
  try {
    const error = await inspectStudioPythonBuilderTypes({ ...f.options, revision }).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    expect(Object.keys(revision.files).length).toBeGreaterThan(51)
    expect(f.requests).toEqual([])
  } finally {
    f.stop()
  }
})

test.each([
  'venv/typed.py',
  'src/venv/typed.py',
  'site-packages/typed.pyi',
])('excluded analysis source %s cannot produce a partial workspace approval', async (path) => {
  const f = await service()
  const revision = await createStudioProRevision({
    ...f.options.revision,
    directories: [
      ...new Set([
        ...f.options.revision.directories,
        ...path
          .split('/')
          .slice(0, -1)
          .map((_part, index, parts) => parts.slice(0, index + 1).join('/')),
      ]),
    ],
    files: { ...f.options.revision.files, [path]: 'n: int = "wrong type"\n' },
  })
  try {
    const error = await inspectStudioPythonBuilderTypes({ ...f.options, revision }).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toMatchObject({ code: 'unavailable' })
    expect(f.requests).toEqual([])
    expect(revision.files[path]).toBe('n: int = "wrong type"\n')
  } finally {
    f.stop()
  }
})

test.each([
  ['n: int = 1\n', 'passed'],
  ['n: int = "wrong type"\n', 'failed'],
] as const)(
  'builder types reads real Pyright diagnostics over TCP (%s)',
  async (helperSource, expected) => {
    const root = resolve(
      import.meta.dirname,
      '../../../../.cache/studio-language-tests',
      crypto.randomUUID(),
    )
    await mkdir(root, { recursive: true })
    const nodePath = Bun.which('node')
    if (!nodePath) throw new Error('Node is required for the real Pyright test')
    const session = new PythonLanguageSession({
      root,
      nodePath,
      serverPath: createRequire(
        new URL('../../../studio-language-service/runtime/package.json', import.meta.url),
      ).resolve('pyright/langserver.index.js'),
    })
    const f = await service({
      helperSource,
      handle: (raw) => session.handle(parsePythonLanguageCommand(raw), AbortSignal.timeout(15000)),
      dispose: () => session.dispose(),
    })
    try {
      const output = await inspectStudioPythonBuilderTypes(f.options)
      expect(output.types.status).toBe(expected)
      expect(output.types.diagnostics.every((item) => item.source === 'Pyright')).toBe(true)
      if (expected === 'failed')
        expect(
          output.types.diagnostics.some(
            (item) => item.path === 'src/helper.py' && item.severity === 'error',
          ),
        ).toBe(true)
      expect(f.requests.at(-1)?.method).toBe('DELETE')
      expect(f.checks()).toBe(6)
    } finally {
      session.dispose()
      f.stop()
    }
  },
  25000,
)
