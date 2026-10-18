import { afterEach, expect, mock, test } from 'bun:test'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonInspectionReportSchema } from '@sistemazero/core/studio/python-inspection'
import {
  StudioPythonPlaytestRecipeSchema,
  StudioPythonPlaytestReportSchema,
} from '@sistemazero/core/studio/python-playtest'
import { StudioPythonPreviewReferenceSchema } from '@sistemazero/core/studio/python-preview'
import { StudioPythonInputReferenceSchema } from '@sistemazero/core/studio/python-validation-input'
import { createPythonDistributionRegistry } from '../../../studio-runtime/src/python-distributions'
import { createPythonInputStore } from '../../../studio-runtime/src/python-inputs'
import type { PythonInspectionSandbox } from '../../../studio-runtime/src/python-inspection'
import { servePythonPreview } from '../../../studio-runtime/src/python-previews'
import {
  handlePythonInputRemoval,
  handlePythonRequest,
} from '../../../studio-runtime/src/python-requests'
import { pythonDistributionFixture } from '../../../studio-runtime/tests/python-distribution-fixture'
import { pythonInputFixture } from '../../../studio-runtime/tests/python-input-fixture'

mock.module('server-only', () => ({}))
const { inspectStudioPythonRevision, validateStudioPythonRevision, buildStudioPythonRevision } =
  await import('../../src/server/studio-python-runtime')
const dispose: (() => void)[] = []
afterEach(() => {
  for (const stop of dispose.splice(0)) stop()
})

async function fixture(
  fixtureOptions: { playtest?: boolean; standalone?: boolean; recipe?: unknown } = {},
) {
  const f = await pythonInputFixture()
  const previews = await pythonInputFixture()
  const runtime = await pythonDistributionFixture(fixtureOptions)
  await runtime.store()
  const content = structuredClone(f.request.snapshot)
  content.configuration.runtime = {
    profileId: runtime.deployment.release.profileId,
    releaseId: runtime.deployment.release.releaseId,
    manifestSha256: runtime.deployment.release.manifestSha256,
  }
  content.configuration.python.dependencyLock.runtimeManifestSha256 =
    runtime.deployment.release.manifestSha256
  content.revision = await studioPythonExecutionRevision({
    version: content.version,
    configuration: content.configuration,
    directories: content.directories,
    files: content.files,
  })
  const registry = await createPythonDistributionRegistry({
    approvedDeployments: [runtime.deployment],
    parentOrigins: ['https://app.example'],
    status: () => 'active',
  })
  const report = StudioPythonInspectionReportSchema.parse({
    version: 1,
    revision: content.revision,
    runtimeManifestSha256: runtime.deployment.release.manifestSha256,
    pythonVersion: '3.14.2',
    status: 'passed',
    files: content.files.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      status: 'passed',
      diagnostics: [],
    })),
  })
  const recipe = StudioPythonPlaytestRecipeSchema.parse(fixtureOptions.recipe ?? { version: 1 })
  const execution = StudioPythonPlaytestReportSchema.parse({
    version: 1,
    projectId: content.projectId,
    revision: content.revision,
    runtimeManifestSha256: content.configuration.runtime.manifestSha256,
    pythonVersion: '3.14.2',
    instanceId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    recipe,
    status: 'passed',
    started: true,
    stopped: true,
    stateBeforeStop: 'completed',
    observedDurationMs: recipe.observeMs,
    stdout: 'executed',
    stderr: '',
    omittedChars: 0,
    errors: [],
    input: {
      stdinRequests: recipe.stdin.length,
      stdinSubmitted: recipe.stdin.length,
      keysDispatched: recipe.keys.length,
      clicksDispatched: recipe.clicks.length,
    },
  })
  let created = 0,
    destroyed = 0,
    authorizations = 0,
    authorized = true,
    cleanupFailures = 0
  let retired!: () => void
  const whenRetired = new Promise<void>((yes) => {
    retired = yes
  })
  let executed = async () => {}
  let transform = async (response: Response, _path: string) => response
  const paths: string[] = []
  const transfers: Uint8Array[] = []
  const sandbox: PythonInspectionSandbox = {
    async mkdir() {},
    async writeFile(path, bytes) {
      if (typeof bytes !== 'string' && path.endsWith('/project/main.py'))
        transfers.push(new Uint8Array(await new Response(bytes).arrayBuffer()))
      else if (typeof bytes !== 'string') await new Response(bytes).arrayBuffer()
    },
    async readFile(path) {
      return {
        content: JSON.stringify(path.endsWith('/python-playtest-result.json') ? execution : report),
      }
    },
    async exec() {
      await executed()
      return { success: true, stdout: '', stderr: '' }
    },
    async destroy() {
      destroyed++
      retired()
    },
  }
  const token = 'native-python-transport-test-token'
  let previewCommitted = false,
    previewRetired = false
  let lastPreview: ReturnType<typeof StudioPythonPreviewReferenceSchema.parse> | undefined
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request): Promise<Response> {
      const path = new URL(request.url).pathname
      if (path.startsWith('/v1/python-previews/'))
        return servePythonPreview(request, {
          bucket: previews.bucket,
          runtimeBucket: runtime.bucket,
          registry,
          serviceOrigin: server.url.origin,
          assertCurrent() {},
          async authorize() {
            return previewCommitted && !previewRetired
          },
        })
      if (request.headers.get('Authorization') !== `Bearer ${token}`)
        return new Response(null, { status: 401 })
      paths.push(path)
      if (path === '/v1/python/previews/remove')
        return handlePythonInputRemoval(request, {
          kind: 'preview',
          assertCurrent() {},
          async limit() {
            return true
          },
          async cancel() {
            previewRetired = true
            return { retired: true, cleanupConfirmed: true }
          },
        })
      const response = await handlePythonRequest(request, {
        bucket: f.bucket,
        runtimeBucket: runtime.bucket,
        registry,
        preview: {
          bucket: previews.bucket,
          serviceOrigin: server.url.origin,
          validation: { profileVersion: 1, runtimeFingerprint: 'e'.repeat(64) },
        },
        assertCurrent() {},
        async limit() {
          return true
        },
        createSandbox() {
          created++
          return sandbox
        },
      })
      if (path === '/v1/python/validate' && response.ok) {
        const body: unknown = await response.clone().json()
        if (body && typeof body === 'object' && 'preview' in body) {
          lastPreview = StudioPythonPreviewReferenceSchema.parse(body.preview)
          previewCommitted = true
        }
      }
      return transform(response, path)
    },
  })
  dispose.push(() => {
    server.stop(true)
  })
  const controller = new AbortController()
  const options = {
    snapshot: content,
    projectId: content.projectId,
    owner: f.request.owner,
    executionId: f.request.executionId,
    requestId: f.request.requestId,
    runtimeUrl: server.url.href,
    runtimeToken: token,
    signal: controller.signal,
    async read() {
      return f.bytes
    },
    async authorize() {
      authorizations++
      if (!authorized) throw new Error('context revoked')
    },
    cleanupFailed() {
      cleanupFailures++
    },
  }
  return {
    f,
    content,
    report,
    recipe,
    execution,
    previews,
    previewUrl: () => lastPreview?.url,
    options,
    paths,
    transfers,
    controller,
    whenRetired,
    setAuthorized(value: boolean) {
      authorized = value
    },
    setExecuted(value: typeof executed) {
      executed = value
    },
    setTransform(value: typeof transform) {
      transform = value
    },
    counts: () => ({ created, destroyed, authorizations, cleanupFailures }),
  }
}

test('BFF sends raw bytes through native HTTP, validates the report, retires the input and reauthorizes final acceptance', async () => {
  const x = await fixture()
  expect(await inspectStudioPythonRevision(x.options)).toEqual(x.report)
  expect(x.transfers).toEqual([x.f.bytes])
  expect(x.paths).toEqual([
    '/v1/python/inputs',
    `/v1/python/files/${x.f.fileHash}`,
    '/v1/python/inspect',
    '/v1/python/inputs/remove',
  ])
  expect(x.counts().created).toBe(1)
  expect(x.counts().destroyed).toBe(1)
  expect(x.counts().authorizations).toBeGreaterThanOrEqual(8)
  expect([...x.f.objects.keys()].filter((key) => key.includes('/files/'))).toEqual([])
})

test('complete Python validation reuses native binary transport and confirms both phases before retirement', async () => {
  const x = await fixture({ playtest: true })
  const report = await validateStudioPythonRevision({ ...x.options, recipe: x.recipe })
  expect(report.status).toBe('passed')
  expect(report.inspection).toEqual(x.report)
  expect(report.execution).toEqual(x.execution)
  expect(x.transfers).toEqual([x.f.bytes])
  expect(x.paths).toEqual([
    '/v1/python/inputs',
    `/v1/python/files/${x.f.fileHash}`,
    '/v1/python/validate',
    '/v1/python/inputs/remove',
  ])
  expect(x.counts().created).toBe(1)
  expect(x.counts().destroyed).toBe(1)
  expect(x.counts().authorizations).toBeGreaterThanOrEqual(8)
})

test('invalid validation recipes fail before admission rather than silently compiling only', async () => {
  const x = await fixture({ playtest: true })
  for (const recipe of [
    undefined,
    { version: 1, stdin: ['two\nlines'] },
    { version: 1, selector: '#secret' },
  ])
    await expect(validateStudioPythonRevision({ ...x.options, recipe })).rejects.toThrow()
  expect(x.paths).toEqual([])
  expect(x.counts().created).toBe(0)
})

test('protected preview survives private input retirement and uses the same two-phase job', async () => {
  const x = await fixture({ playtest: true, standalone: true })
  let phases = 0
  x.setExecuted(async () => {
    phases++
  })
  const result = await buildStudioPythonRevision({
    ...x.options,
    recipe: x.recipe,
    preview: { parentOrigin: 'https://app.example' },
  })
  expect(result.report.status).toBe('passed')
  expect(result.preview?.revision).toBe(x.content.revision)
  expect(phases).toBe(2)
  expect(x.counts().created).toBe(1)
  expect(x.counts().destroyed).toBe(1)
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
  expect([...x.f.objects.keys()].filter((key) => key.includes('/files/'))).toEqual([])
  if (!result.preview) throw new Error('Protected preview missing')
  const response = await fetch(result.preview.url)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('standalone.mjs')
  const source = await fetch(new URL('project/main.py', result.preview.url))
  expect(new Uint8Array(await source.arrayBuffer())).toEqual(x.f.bytes)
  expect(source.headers.get('Content-Type')).toBe('application/octet-stream')
})

test('preview requests reject invalid or same-origin configuration before HTTP admission', async () => {
  const x = await fixture({ playtest: true, standalone: true })
  for (const preview of [
    undefined,
    { parentOrigin: 'http://external.example' },
    { parentOrigin: new URL(x.options.runtimeUrl).origin },
  ])
    await expect(
      buildStudioPythonRevision({ ...x.options, recipe: x.recipe, preview }),
    ).rejects.toThrow()
  expect(x.paths).toEqual([])
  expect(x.counts().created).toBe(0)
})

test('missing, substituted or stale service preview references cannot be accepted by the host', async () => {
  for (const change of ['missing', 'revision', 'origin', 'expiry'] as const) {
    const x = await fixture({ playtest: true, standalone: true })
    x.setTransform(async (response, path) => {
      if (path !== '/v1/python/validate') return response
      const body: unknown = await response.json()
      if (!body || typeof body !== 'object' || !('preview' in body))
        throw new Error('Preview fixture missing')
      const preview = StudioPythonPreviewReferenceSchema.parse(body.preview)
      return Response.json({
        ...body,
        preview:
          change === 'missing'
            ? undefined
            : {
                ...preview,
                ...(change === 'revision' ? { revision: '0'.repeat(64) } : {}),
                ...(change === 'origin'
                  ? {
                      url: preview.url.replace(new URL(preview.url).origin, 'https://evil.example'),
                    }
                  : {}),
                ...(change === 'expiry' ? { expiresAt: Date.now() - 1 } : {}),
              },
      })
    })
    await expect(
      buildStudioPythonRevision({
        ...x.options,
        recipe: x.recipe,
        preview: { parentOrigin: 'https://app.example' },
      }),
    ).rejects.toThrow()
    expect(x.counts().destroyed).toBe(1)
    expect(x.paths.at(-1)).toBe('/v1/python/previews/remove')
    const previewUrl = x.previewUrl()
    if (!previewUrl) throw new Error('Owned preview URL missing')
    expect((await fetch(previewUrl)).status).toBe(404)
  }
})

test('host rejection before or after input cleanup explicitly retires its owned preview', async () => {
  for (const fence of ['/v1/python/validate', '/v1/python/inputs/remove']) {
    const x = await fixture({ playtest: true, standalone: true })
    x.setTransform(async (response, path) => {
      if (path === fence) x.setAuthorized(false)
      return response
    })
    await expect(
      buildStudioPythonRevision({
        ...x.options,
        recipe: x.recipe,
        preview: { parentOrigin: 'https://app.example' },
      }),
    ).rejects.toThrow('context revoked')
    expect(x.paths.at(-1)).toBe('/v1/python/previews/remove')
    const previewUrl = x.previewUrl()
    if (!previewUrl) throw new Error('Owned preview URL missing')
    expect((await fetch(previewUrl)).status).toBe(404)
  }
})

test('complete validation refuses a changed execution recipe and still releases its input', async () => {
  const x = await fixture({ playtest: true })
  x.execution.recipe.observeMs = 999
  await expect(validateStudioPythonRevision({ ...x.options, recipe: x.recipe })).rejects.toThrow()
  expect(x.counts().destroyed).toBe(1)
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
})

test('complete validation cannot be accepted after contextual authority is revoked in the response', async () => {
  const x = await fixture({ playtest: true })
  x.setTransform(async (response, path) => {
    if (path === '/v1/python/validate') x.setAuthorized(false)
    return response
  })
  await expect(validateStudioPythonRevision({ ...x.options, recipe: x.recipe })).rejects.toThrow(
    'context revoked',
  )
  expect(x.counts().destroyed).toBe(1)
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
})

test('complete validation returns failed compilation without executing the learner phase', async () => {
  const x = await fixture({ playtest: true })
  x.report.status = x.report.files[0]!.status = 'failed'
  x.report.files[0]!.diagnostics = [{ message: 'SyntaxError' }]
  let phases = 0
  x.setExecuted(async () => {
    phases++
  })
  const report = await validateStudioPythonRevision({ ...x.options, recipe: x.recipe })
  expect(report.status).toBe('failed')
  expect(report.execution).toBeUndefined()
  expect(phases).toBe(1)
  expect(x.counts().destroyed).toBe(1)
})

test('project identity is checked separately from the execution content digest before HTTP', async () => {
  const x = await fixture()
  await expect(
    inspectStudioPythonRevision({ ...x.options, projectId: 'other-project' }),
  ).rejects.toThrow('outro projeto')
  expect(x.paths).toEqual([])
})

test('structural grading refuses a compile-only runtime and still retires the input', async () => {
  const x = await fixture()
  await expect(inspectStudioPythonRevision({ ...x.options, structure: true })).rejects.toThrow()
  expect(x.counts().destroyed).toBe(1)
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
})

test('BFF accepts complete exact-revision structure and independently rejects missing facts in the response', async () => {
  for (const strip of [false, true]) {
    const x = await fixture()
    for (const file of x.report.files)
      file.structure = {
        version: 1,
        nodesVisited: 1,
        usesLoop: false,
        usesConditional: false,
        assignedNames: [],
        definedFunctions: [],
        callTargets: [],
      }
    if (strip)
      x.setTransform(async (response, route) => {
        if (!route.endsWith('/inspect')) return response
        await response.body?.cancel()
        return Response.json({
          ok: true,
          report: {
            ...x.report,
            files: x.report.files.map(({ structure: _structure, ...file }) => file),
          },
        })
      })
    const inspection = inspectStudioPythonRevision({ ...x.options, structure: true })
    if (strip) await expect(inspection).rejects.toThrow('incompleta')
    else expect((await inspection).files.every((file) => !!file.structure)).toBe(true)
    expect(x.counts().destroyed).toBe(1)
    expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
  }
})

test('a foreign admission response never becomes a cleanup capability', async () => {
  const x = await fixture()
  x.setTransform(async (response, path) => {
    if (path.endsWith('/inputs')) {
      const raw: unknown = await response.json()
      if (
        !raw ||
        typeof raw !== 'object' ||
        !('input' in raw) ||
        !raw.input ||
        typeof raw.input !== 'object'
      )
        throw new Error('missing reference')
      return Response.json({ ...raw, input: { ...raw.input, owner: 'e'.repeat(64) } })
    }
    return response
  })
  await expect(inspectStudioPythonRevision(x.options)).rejects.toThrow('outra revisão')
  expect(x.paths).toEqual(['/v1/python/inputs'])
  expect(x.counts().created).toBe(0)
})

test('a different admission nonce with otherwise identical scope is neither accepted nor closed', async () => {
  const x = await fixture()
  const foreignResponse = await fetch(`${x.options.runtimeUrl}v1/python/inputs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${x.options.runtimeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...x.f.request, snapshot: x.content, requestId: crypto.randomUUID() }),
  })
  const raw: unknown = await foreignResponse.json()
  if (!raw || typeof raw !== 'object' || !('input' in raw))
    throw new Error('missing foreign admission')
  const foreign = StudioPythonInputReferenceSchema.parse(raw.input)
  x.paths.length = 0
  x.setTransform(async (response, path) => {
    if (!path.endsWith('/inputs')) return response
    await response.body?.cancel()
    return Response.json({ ok: true, input: foreign })
  })
  await expect(inspectStudioPythonRevision(x.options)).rejects.toThrow('outra revisão')
  expect(x.paths).toEqual(['/v1/python/inputs'])
  expect(x.counts().created).toBe(0)
  await expect(
    createPythonInputStore(x.f.bucket).resolve(foreign, new AbortController().signal),
  ).resolves.toBeDefined()
})

test('changed source bytes are rejected before upload and the owned input is retired', async () => {
  const x = await fixture()
  await expect(
    inspectStudioPythonRevision({
      ...x.options,
      async read() {
        return new Uint8Array([1])
      },
    }),
  ).rejects.toThrow('bytes do snapshot')
  expect(x.paths).toEqual(['/v1/python/inputs', '/v1/python/inputs/remove'])
  expect(x.counts().created).toBe(0)
})

test('revocation during remote inspection rejects the report and still retires its owned input', async () => {
  const x = await fixture()
  x.setExecuted(async () => {
    x.setAuthorized(false)
  })
  await expect(inspectStudioPythonRevision(x.options)).rejects.toThrow('context revoked')
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
  expect(x.counts().destroyed).toBe(1)
})

test('revocation during cleanup cannot pass the final authorization fence', async () => {
  const x = await fixture()
  x.setTransform(async (response, path) => {
    if (path.endsWith('/remove')) x.setAuthorized(false)
    return response
  })
  await expect(inspectStudioPythonRevision(x.options)).rejects.toThrow('context revoked')
  expect(x.counts().destroyed).toBe(1)
})

test('a forged report fails shared verification and cleanup remains independent of the failure', async () => {
  const x = await fixture()
  x.setTransform(async (response, path) =>
    path.endsWith('/inspect')
      ? Response.json({ ok: true, report: { ...x.report, revision: '0'.repeat(64) } })
      : response,
  )
  await expect(inspectStudioPythonRevision(x.options)).rejects.toThrow()
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
  expect(x.counts().destroyed).toBe(1)
})

test('native HTTP cancellation retires the owned sandbox even while its operation does not acknowledge', async () => {
  const x = await fixture()
  let entered!: () => void
  const started = new Promise<void>((yes) => {
    entered = yes
  })
  x.setExecuted(async () => {
    entered()
    await new Promise(() => {})
  })
  const pending = inspectStudioPythonRevision(x.options)
  await started
  x.controller.abort(new Error('learner cancelled'))
  await expect(pending).rejects.toThrow()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      x.whenRetired,
      new Promise<never>((_yes, no) => {
        timer = setTimeout(
          () => no(new Error('Owned sandbox did not retire after HTTP cancellation')),
          2000,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
  expect(x.counts().destroyed).toBe(1)
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
})

for (const port of ['read', 'authorize'] as const) {
  test(`caller cancellation settles a non-cooperative ${port} port and starts input cleanup`, async () => {
    const x = await fixture()
    let entered!: () => void,
      release!: () => void,
      authorizations = 0
    const started = new Promise<void>((yes) => {
      entered = yes
    })
    const gate = new Promise<void>((yes) => {
      release = yes
    })
    let state = 'pending'
    const pending = inspectStudioPythonRevision({
      ...x.options,
      async read() {
        if (port === 'read') {
          entered()
          await gate
        }
        return x.f.bytes
      },
      async authorize() {
        authorizations++
        if (port === 'authorize' && authorizations === 3) {
          entered()
          await gate
        }
      },
    }).then(
      () => {
        state = 'fulfilled'
      },
      () => {
        state = 'rejected'
      },
    )
    await started
    x.controller.abort(new Error(`retired during ${port}`))
    await Promise.race([pending, Bun.sleep(500)])
    const beforeRelease = state
    const cleanupStarted = x.paths.includes('/v1/python/inputs/remove')
    release()
    await pending
    expect(beforeRelease).toBe('rejected')
    expect(cleanupStarted).toBe(true)
    expect(x.counts().created).toBe(0)
  })
}

test('a non-cooperative upload fetch is cancelled and its late response body is reclaimed', async () => {
  const x = await fixture()
  let entered!: () => void, release!: (response: Response) => void
  const started = new Promise<void>((yes) => {
    entered = yes
  })
  const gate = new Promise<Response>((yes) => {
    release = yes
  })
  const pending = inspectStudioPythonRevision({
    ...x.options,
    fetchImpl(url, init) {
      if (String(url).includes('/files/')) {
        entered()
        return gate
      }
      return fetch(url, init)
    },
  })
  await started
  x.controller.abort(new Error('upload retired'))
  await expect(pending).rejects.toThrow('upload retired')
  let cancelled = 0
  release(
    new Response(
      new ReadableStream<Uint8Array>(
        {
          cancel() {
            cancelled++
          },
        },
        { highWaterMark: 0 },
      ),
    ),
  )
  await Bun.sleep(0)
  expect(cancelled).toBe(1)
  expect(x.paths.at(-1)).toBe('/v1/python/inputs/remove')
})

test('cleanup has a real five-second deadline even if its fetch ignores cancellation', async () => {
  const x = await fixture()
  let release!: (response: Response) => void
  const gate = new Promise<Response>((yes) => {
    release = yes
  })
  expect(
    await inspectStudioPythonRevision({
      ...x.options,
      fetchImpl(url, init) {
        return String(url).endsWith('/remove') ? gate : fetch(url, init)
      },
    }),
  ).toEqual(x.report)
  expect(x.counts().cleanupFailures).toBe(1)
  let cancelled = 0
  release(
    new Response(
      new ReadableStream<Uint8Array>(
        {
          cancel() {
            cancelled++
          },
        },
        { highWaterMark: 0 },
      ),
    ),
  )
  await Bun.sleep(0)
  expect(cancelled).toBe(1)
}, 10_000)
