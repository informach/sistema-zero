import { expect, test } from 'bun:test'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import {
  StudioPythonPlaytestRecipeSchema,
  StudioPythonPlaytestReportSchema,
} from '@sistemazero/core/studio/python-playtest'
import { StudioPythonPreviewReferenceSchema } from '@sistemazero/core/studio/python-preview'
import { StudioPythonInputReferenceSchema } from '@sistemazero/core/studio/python-validation-input'
import { createPythonDistributionRegistry } from '../src/python-distributions'
import { createPythonInputStore, PythonInputError } from '../src/python-inputs'
import type { PythonInspectionSandbox } from '../src/python-inspection'
import {
  handlePythonRequest,
  PYTHON_INPUT_REFERENCE_HEADER,
  type PythonInspectionJobs,
} from '../src/python-requests'
import { pythonDistributionFixture } from './python-distribution-fixture'
import { pythonInputFixture } from './python-input-fixture'

async function fixture(fixtureOptions: { playtest?: boolean; standalone?: boolean } = {}) {
  const f = await pythonInputFixture()
  const runtime = await pythonDistributionFixture(fixtureOptions)
  await runtime.store()
  const request = structuredClone(f.request)
  const selection = {
    profileId: runtime.deployment.release.profileId,
    releaseId: runtime.deployment.release.releaseId,
    manifestSha256: runtime.deployment.release.manifestSha256,
  }
  request.snapshot.configuration.runtime = selection
  request.snapshot.configuration.python.dependencyLock.runtimeManifestSha256 =
    selection.manifestSha256
  request.snapshot.revision = await studioPythonExecutionRevision({
    version: request.snapshot.version,
    configuration: request.snapshot.configuration,
    directories: request.snapshot.directories,
    files: request.snapshot.files,
  })
  let status: 'active' | 'retired' | 'revoked' = 'active'
  const registry = await createPythonDistributionRegistry({
    approvedDeployments: [runtime.deployment],
    parentOrigins: ['https://app.example'],
    status: () => status,
  })
  const report = {
    version: 1,
    revision: request.snapshot.revision,
    runtimeManifestSha256: selection.manifestSha256,
    pythonVersion: '3.14.2',
    status: 'passed',
    files: request.snapshot.files.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      status: 'passed',
      diagnostics: [],
    })),
  }
  const recipe = StudioPythonPlaytestRecipeSchema.parse({ version: 1 })
  const execution = StudioPythonPlaytestReportSchema.parse({
    version: 1,
    projectId: request.snapshot.projectId,
    revision: request.snapshot.revision,
    runtimeManifestSha256: selection.manifestSha256,
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
    input: { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 },
  })
  let created = 0,
    destroyed = 0,
    executed = 0,
    current = true,
    allowed = true
  let execute = async () => {}
  const transfers = new Map<string, Uint8Array>()
  const limits: { owner: string; operation: string }[] = []
  const sandbox: PythonInspectionSandbox = {
    async mkdir() {},
    async writeFile(path, content) {
      if (typeof content !== 'string')
        transfers.set(path, new Uint8Array(await new Response(content).arrayBuffer()))
    },
    async readFile(path) {
      return {
        content: JSON.stringify(path.endsWith('/python-playtest-result.json') ? execution : report),
      }
    },
    async exec() {
      executed++
      await execute()
      return { success: true, stdout: '', stderr: '' }
    },
    async destroy() {
      destroyed++
    },
  }
  const options: Parameters<typeof handlePythonRequest>[1] = {
    bucket: f.bucket,
    runtimeBucket: runtime.bucket,
    registry,
    assertCurrent() {
      if (!current) throw new PythonInputError(409, 'configuration changed')
    },
    async limit(owner: string, operation: 'job' | 'transfer') {
      limits.push({ owner, operation })
      return allowed
    },
    createSandbox() {
      created++
      return sandbox
    },
  }
  const send = (path: string, body: unknown) =>
    handlePythonRequest(
      new Request(`https://runtime.example/v1/python/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      options,
    )
  const open = async () => {
    const response = await send('inputs', request)
    expect(response.status).toBe(200)
    const raw: unknown = await response.json()
    if (!raw || typeof raw !== 'object' || !('input' in raw))
      throw new Error('Input response missing')
    return StudioPythonInputReferenceSchema.parse(raw.input)
  }
  const upload = (
    reference: unknown,
    body: ReadableStream<Uint8Array> = new Blob([f.bytes]).stream(),
  ) =>
    handlePythonRequest(
      new Request(`https://runtime.example/v1/python/files/${f.fileHash}`, {
        method: 'POST',
        headers: { [PYTHON_INPUT_REFERENCE_HEADER]: JSON.stringify(reference) },
        body,
      }),
      options,
    )
  return {
    f,
    runtime,
    request,
    report,
    recipe,
    execution,
    options,
    selection,
    transfers,
    limits,
    send,
    open,
    upload,
    store: createPythonInputStore(f.bucket),
    setStatus(value: typeof status) {
      status = value
    },
    setCurrent(value: boolean) {
      current = value
    },
    setAllowed(value: boolean) {
      allowed = value
    },
    setExecute(value: typeof execute) {
      execute = value
    },
    counts: () => ({ created, destroyed, executed }),
  }
}

test('validation checks configuration, release and input generation before starting learner execution', async () => {
  for (const withdraw of [
    'configuration',
    'release',
    'input',
    'marker',
    'configuration-during-fence',
  ] as const) {
    const x = await fixture({ playtest: true })
    const reference = await x.open()
    expect((await x.upload(reference)).status).toBe(200)
    const get = x.f.bucket.get.bind(x.f.bucket)
    x.f.bucket.get = async (key) => {
      const result = await get(key)
      if (
        withdraw === 'configuration-during-fence' &&
        x.counts().executed === 1 &&
        key.startsWith('python-input-states/')
      )
        x.setCurrent(false)
      return result
    }
    x.setExecute(async () => {
      if (withdraw === 'configuration') x.setCurrent(false)
      else if (withdraw === 'release') x.setStatus('revoked')
      else if (withdraw === 'input') await x.store.remove(reference, new AbortController().signal)
      else if (withdraw === 'marker')
        for (const key of x.runtime.objects.keys())
          if (key.endsWith('/complete.json')) x.runtime.objects.delete(key)
    })
    const response = await x.send('validate', { version: 1, input: reference, recipe: x.recipe })
    expect(response.status).toBe(withdraw === 'input' ? 410 : 409)
    expect(x.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
  }
})

test('protected preview is generated only after both phases and confirmed sandbox destruction', async () => {
  const x = await fixture({ playtest: true, standalone: true })
  const preview = await pythonInputFixture()
  const put = preview.bucket.put.bind(preview.bucket)
  preview.bucket.put = async (...args) => {
    expect(x.counts()).toEqual({ created: 1, destroyed: 1, executed: 2 })
    return put(...args)
  }
  x.options.preview = {
    bucket: preview.bucket,
    serviceOrigin: 'https://runtime.example',
    validation: { profileVersion: 1, runtimeFingerprint: 'e'.repeat(64) },
  }
  const reference = await x.open()
  expect((await x.upload(reference)).status).toBe(200)
  const response = await x.send('validate', {
    version: 1,
    input: reference,
    recipe: x.recipe,
    preview: { parentOrigin: 'https://app.example' },
  })
  expect(response.status).toBe(200)
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object' || !('preview' in body)) throw new Error('Preview missing')
  const result = StudioPythonPreviewReferenceSchema.parse(body.preview)
  expect(result.revision).toBe(x.request.snapshot.revision)
  expect([...preview.objects.keys()].some((key) => key.endsWith('/complete.json'))).toBe(true)
})

test('unconfigured or unapproved previews fail before creating a sandbox', async () => {
  const x = await fixture({ playtest: true, standalone: true })
  const reference = await x.open()
  expect((await x.upload(reference)).status).toBe(200)
  const request = {
    version: 1,
    input: reference,
    recipe: x.recipe,
    preview: { parentOrigin: 'https://app.example' },
  }
  expect((await x.send('validate', request)).status).toBe(503)
  const preview = await pythonInputFixture()
  x.options.preview = {
    bucket: preview.bucket,
    serviceOrigin: 'https://runtime.example',
    validation: { profileVersion: 1, runtimeFingerprint: 'e'.repeat(64) },
  }
  for (const parentOrigin of ['https://evil.example', 'https://runtime.example'])
    expect((await x.send('validate', { ...request, preview: { parentOrigin } })).status).toBe(409)
  expect(x.counts().created).toBe(0)
})

test('validation rechecks a delegated complete report and requires a capable coordinator', async () => {
  const x = await fixture({ playtest: true })
  const reference = await x.open()
  expect((await x.upload(reference)).status).toBe(200)
  const operation = { version: 1, input: reference, recipe: x.recipe }
  x.options.jobs = {
    async inspect() {
      throw new Error('Validation cannot delegate to compile-only admission')
    },
    async cancel() {
      return { retired: true, cleanupConfirmed: true }
    },
  }
  expect((await x.send('validate', operation)).status).toBe(503)
  x.options.jobs.validate = async () => ({
    status: 200,
    body: {
      report: {
        version: 1,
        projectId: x.request.snapshot.projectId,
        recipe: x.recipe,
        status: 'passed',
        inspection: x.report,
        execution: x.execution,
      },
    },
  })
  expect((await x.send('validate', operation)).status).toBe(200)
  x.execution.revision = 'f'.repeat(64)
  expect((await x.send('validate', operation)).status).toBe(500)
  expect(x.counts().created).toBe(0)
})

test('private Python protocol opens idempotently, streams original bytes and inspects only the captured revision', async () => {
  const x = await fixture()
  const reference = await x.open()
  expect(await x.open()).toEqual(reference)
  expect(x.counts().created).toBe(0)
  expect((await x.upload(reference)).status).toBe(200)
  const response = await x.send('inspect', reference)
  expect(response.status).toBe(200)
  const body: unknown = await response.json()
  expect(body).toEqual({ ok: true, report: x.report })
  expect(x.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
  expect([...x.transfers].find(([path]) => path.endsWith('/project/main.py'))?.[1]).toEqual(
    x.f.bytes,
  )
  expect(x.limits.every((limit) => limit.owner === x.request.owner)).toBe(true)
  expect(x.limits.map((limit) => limit.operation)).toEqual(['job', 'job', 'transfer', 'job'])
  expect((await x.send('inputs/remove', reference)).status).toBe(200)
  expect((await x.send('inspect', reference)).status).toBe(410)
})

test('registry resolves exact configured identity, returns copies and reflects revocation', async () => {
  const x = await fixture()
  const first = x.options.registry.resolve(x.selection)!
  first.distribution.files[0].sha256 = 'f'.repeat(64)
  expect(x.options.registry.resolve(x.selection)!.distribution.files[0].sha256).not.toBe(
    'f'.repeat(64),
  )
  for (const selection of [
    { ...x.selection, profileId: 'other' },
    { ...x.selection, releaseId: 'other' },
    { ...x.selection, manifestSha256: '0'.repeat(64) },
    { ...x.selection, authorization: true },
  ])
    expect(x.options.registry.resolve(selection)).toBeUndefined()
  x.setStatus('retired')
  expect(x.options.registry.resolve(x.selection)).toBeDefined()
  x.setStatus('revoked')
  expect(x.options.registry.resolve(x.selection)).toBeUndefined()
  expect((await x.send('inputs', x.request)).status).toBe(409)
  expect(x.f.objects.size).toBe(0)
})

test('an approved descriptor without its completed upload cannot create an input', async () => {
  const x = await fixture()
  x.runtime.objects.delete(`${x.runtime.prefix}complete.json`)
  expect((await x.send('inputs', x.request)).status).toBe(409)
  expect(x.f.objects.size).toBe(0)
  expect(x.counts().created).toBe(0)
})

test('invalid revision and mismatched Python versions are rejected before creating input files', async () => {
  const x = await fixture()
  expect(
    (
      await x.send('inputs', {
        ...x.request,
        snapshot: { ...x.request.snapshot, revision: '0'.repeat(64) },
      })
    ).status,
  ).toBe(400)
  const other = structuredClone(x.request)
  other.snapshot.configuration.python.dependencyLock.pythonVersion = '3.13.0'
  expect((await x.send('inputs', other)).status).toBe(409)
  expect(x.f.objects.size).toBe(0)
})

test('quota denial retires the unconsumed binary stream and never creates a sandbox', async () => {
  const x = await fixture()
  const reference = await x.open()
  x.setAllowed(false)
  let reads = 0,
    cancelled = 0
  const response = await x.upload(
    reference,
    new ReadableStream<Uint8Array>(
      {
        pull() {
          reads++
        },
        cancel() {
          cancelled++
        },
      },
      { highWaterMark: 0 },
    ),
  )
  expect(response.status).toBe(429)
  expect(reads).toBe(0)
  expect(cancelled).toBe(1)
  expect(x.f.objects.size).toBe(1)
  expect(x.counts().created).toBe(0)
})

for (const retirement of ['configuration', 'runtime', 'input'] as const) {
  test(`a ${retirement} change during inspection rejects its late report and destroys the owned sandbox`, async () => {
    const x = await fixture()
    const reference = await x.open()
    expect((await x.upload(reference)).status).toBe(200)
    x.setExecute(async () => {
      if (retirement === 'configuration') x.setCurrent(false)
      else if (retirement === 'runtime') x.setStatus('revoked')
      else await x.store.remove(reference, new AbortController().signal)
    })
    const response = await x.send('inspect', reference)
    expect(response.status).toBe(retirement === 'input' ? 410 : 409)
    expect(await response.json()).not.toHaveProperty('report')
    expect(x.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
  })
}

test('an incomplete input cannot execute code and forged references cannot start a sandbox', async () => {
  const x = await fixture()
  const reference = await x.open()
  // The coordinator owns and destroys its sandbox if a registered source is missing.
  expect((await x.send('inspect', { ...reference, projectId: 'other-project' })).status).toBe(409)
  expect(x.counts().created).toBe(0)
  expect((await x.send('inspect', reference)).status).toBe(409)
  expect(x.counts()).toEqual({ created: 1, destroyed: 1, executed: 0 })
})

test('input closure during the final runtime marker check rejects a late report', async () => {
  const x = await fixture()
  const reference = await x.open()
  expect((await x.upload(reference)).status).toBe(200)
  let executed = false,
    closed = false
  x.setExecute(async () => {
    executed = true
  })
  const get = x.options.runtimeBucket.get
  x.options.runtimeBucket.get = async (key) => {
    if (executed && !closed && key.endsWith('/complete.json')) {
      closed = true
      await x.store.remove(reference, new AbortController().signal)
    }
    return get(key)
  }
  const response = await x.send('inspect', reference)
  expect(closed).toBe(true)
  expect(response.status).toBe(410)
  expect(await response.json()).not.toHaveProperty('report')
  expect(x.counts()).toEqual({ created: 1, destroyed: 1, executed: 1 })
})

test('ingress delegates inspection without creating an unowned sandbox and revalidates its exact report', async () => {
  const x = await fixture()
  const reference = await x.open()
  expect((await x.upload(reference)).status).toBe(200)
  const seen: unknown[] = []
  const jobs: PythonInspectionJobs = {
    async inspect(raw) {
      seen.push(raw)
      return { status: 200, body: { ok: true, report: x.report } }
    },
    async cancel() {
      return { retired: true, cleanupConfirmed: true }
    },
  }
  x.options.jobs = jobs
  const response = await x.send('inspect', reference)
  expect(response.status).toBe(200)
  const body: unknown = await response.json()
  expect(body).toEqual({ ok: true, report: x.report })
  expect(seen).toEqual([reference])
  expect(x.counts()).toEqual({ created: 0, destroyed: 0, executed: 0 })
  x.report.revision = 'f'.repeat(64)
  const stale = await x.send('inspect', reference)
  expect(stale.status).toBe(500)
  expect(await stale.json()).not.toHaveProperty('report')
})

test('ingress cancels owned execution before closing its input and does not acknowledge pending cleanup', async () => {
  const x = await fixture()
  const reference = await x.open()
  let confirmed = false
  let calls = 0
  x.options.jobs = {
    async inspect() {
      throw new Error('Removal must not inspect')
    },
    async cancel(raw) {
      calls++
      expect(raw).toEqual(reference)
      expect(await x.store.resolve(reference, new AbortController().signal)).toBeDefined()
      return { retired: true, cleanupConfirmed: confirmed }
    },
  }
  expect((await x.send('inputs/remove', reference)).status).toBe(503)
  expect(await x.store.resolve(reference, new AbortController().signal)).toBeDefined()
  confirmed = true
  expect((await x.send('inputs/remove', reference)).status).toBe(200)
  await expect(x.store.resolve(reference, new AbortController().signal)).rejects.toThrow()
  expect(calls).toBe(2)
})

test('ingress refuses a delegated report when its input is closed during the job', async () => {
  const x = await fixture()
  const reference = await x.open()
  expect((await x.upload(reference)).status).toBe(200)
  x.options.jobs = {
    async inspect() {
      await x.store.remove(reference, new AbortController().signal)
      return { status: 200, body: { ok: true, report: x.report } }
    },
    async cancel() {
      return { retired: true, cleanupConfirmed: true }
    },
  }
  const response = await x.send('inspect', reference)
  expect(response.status).toBe(410)
  expect(await response.json()).not.toHaveProperty('report')
  expect(x.counts().created).toBe(0)
})
