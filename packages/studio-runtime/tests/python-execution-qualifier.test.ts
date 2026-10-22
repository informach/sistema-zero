import { expect, test } from 'bun:test'
import {
  parsePythonExecutionOptions,
  STAGING_PYTHON_RUNTIME_ORIGIN,
} from '../scripts/qualify-python-execution'

const flags = [
  '--environment=staging',
  `--base-url=${STAGING_PYTHON_RUNTIME_ORIGIN}`,
  '--plan=plan.json',
  `--plan-sha256=${'a'.repeat(64)}`,
  `--manifest-sha256=${'b'.repeat(64)}`,
  `--distribution-sha256=${'c'.repeat(64)}`,
  '--parent-origin=https://community-kids-staging.up.railway.app',
  '--out=new-receipt',
]

test('the qualifier requires all explicit pins and only the exact staging origin', () => {
  expect(parsePythonExecutionOptions(['preflight', ...flags]).mode).toBe('preflight')
  expect(parsePythonExecutionOptions(['run', ...flags]).baseUrl).toBe(STAGING_PYTHON_RUNTIME_ORIGIN)
  for (const args of [
    ['run', ...flags, '--retry=1'],
    ['run', ...flags, flags[0]!],
    ['run', ...flags.slice(1)],
    ['run', ...flags.map((flag) => flag.replace('environment=staging', 'environment=production'))],
    [
      'run',
      ...flags.map((flag) => flag.replace(STAGING_PYTHON_RUNTIME_ORIGIN, 'https://other.example')),
    ],
  ])
    expect(() => parsePythonExecutionOptions(args)).toThrow()
})

import { createHash, randomUUID } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  type StudioPythonInspectionReport,
  StudioPythonInspectionReportSchema,
} from '@sistemazero/core/studio/python-inspection'
import { StudioPythonPlaytestReportSchema } from '@sistemazero/core/studio/python-playtest'
import { verifyStudioPythonDeployment } from '@sistemazero/core/studio/python-runtime-distribution'
import {
  StudioPythonInputOpenSchema,
  StudioPythonInputReferenceSchema,
  StudioPythonInspectionRequestSchema,
  StudioPythonValidationRequestSchema,
} from '@sistemazero/core/studio/python-validation-input'
import { currentPythonDeployment } from '../../core/tests/fixtures/python-provided-release'
import {
  createPythonExecutionRun,
  pinPythonExecutionPlan,
  qualifyPythonExecution,
} from '../scripts/qualify-python-execution'

test('preview cleanup failure still awaits input retirement and cannot qualify', async () => {
  const h = await harness('preview-cleanup-503')
  const outcome = await h.execute().then(
    () => null,
    (error: unknown) => error,
  )
  expect(outcome).toBeInstanceOf(Error)
  expect(h.run.receipt.cases[2]!.previewRemoveAcknowledged).toBe(false)
  expect(h.run.receipt.cases[2]!.inputRetirementConfirmed).toBe(true)
  expect(h.run.receipt.logicalCleanupConfirmed).toBe(false)
  expect([...h.inputs.values()].every((input) => input.removed)).toBe(true)
})

test('lost validation response still removes a possibly created preview before the known input', async () => {
  const h = await harness()
  const outcome = await h
    .execute({
      fetchImpl: async (url, init) => {
        if (new URL(url).pathname === '/v1/python/validate') {
          const request = StudioPythonValidationRequestSchema.parse(JSON.parse(String(init.body)))
          if (request.preview) {
            await h.fetchImpl(url, init)
            throw new Error('lost validation reply')
          }
        }
        return h.fetchImpl(url, init)
      },
    })
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(outcome).toBeInstanceOf(Error)
  expect(h.run.receipt.cases[2]!.previewRemoveAcknowledged).toBe(true)
  // No trusted URL was received; the acknowledged coordinator removal is recorded, not a GET proof.
  expect(h.run.receipt.cases[2]!.previewRetirementConfirmed).toBe(false)
  expect(h.run.receipt.cases[2]!.inputRetirementConfirmed).toBe(true)
  expect(h.run.receipt.apiQualified).toBe(false)
})

test('cancellation of an unacknowledged noncooperative admission stays unknown with no invented cleanup', async () => {
  const h = await harness()
  const abort = new AbortController()
  let abandoned = false
  const outcome = await h
    .execute({
      signal: abort.signal,
      fetchImpl: async (url, init) => {
        if (
          new URL(url).pathname === '/v1/python/inputs' &&
          new Headers(init.headers).has('Authorization')
        ) {
          const request = StudioPythonInputOpenSchema.parse(JSON.parse(String(init.body)))
          if (request.snapshot.configuration.runtime.manifestSha256 === h.options.manifestSha256) {
            abandoned = true
            abort.abort(new Error('operator stop'))
            return new Promise<Response>(() => {})
          }
        }
        return h.fetchImpl(url, init)
      },
    })
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(outcome).toBeInstanceOf(Error)
  expect(abandoned).toBe(true)
  expect(h.run.receipt.remoteOutcomeUnknown).toBe(true)
  expect(h.run.receipt.logicalCleanupConfirmed).toBe(false)
  expect(h.calls.some((call) => call.endsWith('/remove'))).toBe(false)
})

test('noncooperative PNG persistence is cancellable and cannot hold known resources indefinitely', async () => {
  const h = await harness()
  const abort = new AbortController()
  const outcome = await h
    .execute({
      signal: abort.signal,
      saveCapture: async () => {
        abort.abort(new Error('stop while writing'))
        return new Promise<void>(() => {})
      },
    })
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(outcome).toBeInstanceOf(Error)
  expect(h.run.receipt.cases[2]!.inputRetirementConfirmed).toBe(true)
  expect(h.run.receipt.cases[2]!.previewRetirementConfirmed).toBe(true)
  expect(h.run.receipt.apiQualified).toBe(false)
})

test('a failing cleanup checkpoint is reported but does not suppress cleanup HTTP', async () => {
  const h = await harness()
  const outcome = await h
    .execute({
      checkpoint: async () => {
        if (h.run.receipt.phase.includes(':remove-input'))
          throw new Error('receipt disk unavailable')
      },
    })
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(outcome).toBeInstanceOf(Error)
  expect(h.run.receipt.cases[0]!.inputRetirementConfirmed).toBe(true)
  expect([...h.inputs.values()].every((input) => input.removed)).toBe(true)
  expect(h.run.receipt.apiQualified).toBe(false)
  expect(h.inputs.size).toBe(1)
})

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
type OpenInput = ReturnType<typeof StudioPythonInputOpenSchema.parse>
type Reference = ReturnType<typeof StudioPythonInputReferenceSchema.parse>
type Fault =
  | 'lost-admission'
  | 'invalid-admission'
  | 'open-503'
  | 'persisted-open-408'
  | 'persisted-open-409'
  | 'report-revision'
  | 'missing-marker'
  | 'bad-png'
  | 'cleanup-503'
  | 'cleanup-false'
  | 'primary-and-cleanup'
  | 'anonymous-admitted'
  | 'stream-too-large'
  | 'receipt-recipe'
  | 'preview-cleanup-503'
async function harness(fault?: Fault) {
  const payload = await currentPythonDeployment()
  const deployment = await verifyStudioPythonDeployment(payload)
  const options = parsePythonExecutionOptions([
    'run',
    ...flags.map((flag) => {
      if (flag.startsWith('--manifest-sha256='))
        return `--manifest-sha256=${deployment.release.manifestSha256}`
      if (flag.startsWith('--distribution-sha256='))
        return `--distribution-sha256=${deployment.distributionSha256}`
      return flag
    }),
  ])
  const run = await createPythonExecutionRun(options, deployment)
  const calls: string[] = []
  const inputs = new Map<string, { input: OpenInput; ref: Reference; removed: boolean }>()
  const uploaded = new Map<string, Uint8Array>()
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
    'base64',
  )
  const previewId = 'd'.repeat(64)
  let previewRemoved = false
  let tokenFreeGet = 0
  let captureSaved = false
  const reportFor = (input: OpenInput, failed = false): StudioPythonInspectionReport =>
    StudioPythonInspectionReportSchema.parse({
      version: 1,
      revision: input.snapshot.revision,
      runtimeManifestSha256: input.snapshot.configuration.runtime.manifestSha256,
      pythonVersion: input.snapshot.configuration.python.dependencyLock.pythonVersion,
      status: failed ? 'failed' : 'passed',
      files: input.snapshot.files
        .filter((file) => file.path.endsWith('.py'))
        .map((file) => ({
          path: file.path,
          sha256: file.sha256,
          status: failed && file.path === 'main.py' ? 'failed' : 'passed',
          diagnostics: failed && file.path === 'main.py' ? [{ message: 'invalid syntax' }] : [],
        })),
    })
  const deny = (status: number) => Response.json({ ok: false, code: 'INVALID_REQUEST' }, { status })
  const fetchImpl = async (url: string | URL, init: RequestInit) => {
    const path = new URL(url).pathname
    calls.push(`${init.method ?? 'GET'} ${path}`)
    const headers = new Headers(init.headers)
    if ((init.method ?? 'GET') === 'GET') {
      expect(headers.has('Authorization')).toBe(false)
      tokenFreeGet++
      if (path.startsWith('/v1/runtime-deployments/')) return Response.json(payload)
      if (path.endsWith('/python-playtest.png')) {
        if (fault === 'stream-too-large')
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(4_600_000))
                controller.close()
              },
            }),
            { headers: { 'Content-Type': 'image/png' } },
          )
        return new Response(fault === 'bad-png' ? new Uint8Array(png.length) : png, {
          headers: { 'Content-Type': 'image/png' },
        })
      }
      expect(path).toBe(`/v1/python-previews/${previewId}/index.html`)
      expect(previewRemoved).toBe(true)
      return new Response('Preview indisponível. Execute o projeto novamente.', { status: 404 })
    }
    if (path === '/v1/python/inputs') {
      const input = StudioPythonInputOpenSchema.parse(JSON.parse(String(init.body)))
      if (!headers.has('Authorization') && fault !== 'anonymous-admitted') return deny(401)
      if (input.snapshot.configuration.runtime.manifestSha256 !== deployment.release.manifestSha256)
        return deny(409)
      const ref = StudioPythonInputReferenceSchema.parse({
        version: 1,
        inputId: randomUUID().replaceAll('-', ''),
        generation: randomUUID(),
        owner: input.owner,
        requestId: input.requestId,
        executionId: input.executionId,
        projectId: input.snapshot.projectId,
        revision: input.snapshot.revision,
        expiresAt: Date.now() + 900_000,
      })
      inputs.set(ref.inputId, { input, ref, removed: false })
      if (fault === 'lost-admission') throw new Error('private transport failure: fake-secret')
      if (fault === 'invalid-admission') return Response.json({ ok: true, input: {} })
      if (fault === 'open-503') return Response.json({ ok: false, code: 'ERROR' }, { status: 503 })
      if (fault === 'persisted-open-408') return deny(408)
      if (fault === 'persisted-open-409') return deny(409)
      return Response.json({ ok: true, input: ref })
    }
    expect(headers.get('Authorization')).toBe('Bearer fake-secret')
    if (path.startsWith('/v1/python/files/')) {
      const ref = StudioPythonInputReferenceSchema.parse(
        JSON.parse(headers.get('X-Studio-Python-Input')!),
      )
      expect(inputs.has(ref.inputId)).toBe(true)
      expect(init.body instanceof Blob).toBe(true)
      const bytes = new Uint8Array(await new Response(init.body).arrayBuffer())
      const sha = path.split('/').at(-1)!
      expect(digest(bytes)).toBe(sha)
      uploaded.set(sha, bytes)
      return Response.json({ ok: true, file: { sha256: sha, bytes: bytes.length } })
    }
    const raw: unknown = JSON.parse(String(init.body))
    if (path.endsWith('/remove')) {
      // Production removal accepts the reference itself, never {version,input}.
      const ref = StudioPythonInputReferenceSchema.parse(raw)
      const stored = inputs.get(ref.inputId)!
      expect(stored.ref).toEqual(ref)
      if (
        fault === 'cleanup-503' ||
        fault === 'primary-and-cleanup' ||
        (fault === 'preview-cleanup-503' && path === '/v1/python/previews/remove')
      )
        return Response.json({ ok: false, code: 'PYTHON_CLEANUP_PENDING' }, { status: 503 })
      if (fault === 'cleanup-false') return Response.json({ ok: false })
      if (path === '/v1/python/previews/remove') previewRemoved = true
      else stored.removed = true
      return Response.json({ ok: true })
    }
    const operation = path.endsWith('/validate')
      ? StudioPythonValidationRequestSchema.parse(raw)
      : StudioPythonInspectionRequestSchema.parse(raw)
    const stored = inputs.get(operation.input.inputId)!
    if (stored.removed) return deny(410)
    if (operation.input.owner !== stored.ref.owner) return deny(409)
    for (const file of stored.input.snapshot.files) expect(uploaded.has(file.sha256)).toBe(true)
    if (path.endsWith('/inspect')) {
      if (fault === 'primary-and-cleanup') throw new Error('original-operation-failure')
      const report = reportFor(stored.input)
      if (fault === 'report-revision') report.revision = 'f'.repeat(64)
      return Response.json({ ok: true, report })
    }
    const validation = StudioPythonValidationRequestSchema.parse(raw)
    const graphical = validation.recipe.requireGraphics
    const inspection = reportFor(stored.input, !graphical)
    if (!graphical)
      return Response.json({
        ok: true,
        report: {
          version: 1,
          projectId: stored.ref.projectId,
          recipe: validation.recipe,
          status: 'failed',
          inspection,
        },
      })
    const execution = StudioPythonPlaytestReportSchema.parse({
      version: 1,
      projectId: stored.ref.projectId,
      revision: stored.ref.revision,
      runtimeManifestSha256: deployment.release.manifestSha256,
      pythonVersion: '3.14.2',
      instanceId: randomUUID(),
      runId: randomUUID(),
      recipe: validation.recipe,
      status: 'passed',
      started: true,
      stopped: true,
      stateBeforeStop: 'running',
      observedDurationMs: 1000,
      stdout:
        fault === 'missing-marker'
          ? 'qa-stdin-Lia\nqa-key-fired\n'
          : 'qa-stdin-Lia\nqa-key-fired\nqa-click-fired\n',
      stderr: '',
      omittedChars: 0,
      errors: [],
      input: { stdinRequests: 1, stdinSubmitted: 1, keysDispatched: 1, clicksDispatched: 1 },
      capture: {
        path: 'python-playtest.png',
        sha256: digest(png),
        byteLength: png.length,
        width: 1,
        height: 1,
        frameSequence: 4,
      },
    })
    const recipe =
      fault === 'receipt-recipe' ? { ...validation.recipe, observeMs: 2000 } : validation.recipe
    return Response.json({
      ok: true,
      report: {
        version: 1,
        projectId: stored.ref.projectId,
        recipe,
        status: 'passed',
        inspection,
        execution,
      },
      preview: {
        kind: 'python-preview',
        version: 1,
        id: previewId,
        projectId: stored.ref.projectId,
        revision: stored.ref.revision,
        runtimeManifestSha256: deployment.release.manifestSha256,
        previewHostAudioVersion: 1,
        url: `${options.baseUrl}/v1/python-previews/${previewId}/index.html`,
        sha256: 'e'.repeat(64),
        expiresAt: Date.now() + 600_000,
      },
    })
  }
  const execute = (extra: Partial<Parameters<typeof qualifyPythonExecution>[0]> = {}) =>
    qualifyPythonExecution({
      options,
      deployment,
      run,
      token: 'fake-secret',
      fetchImpl,
      checkpoint: async () => {},
      saveCapture: async (bytes) => {
        expect(bytes).toEqual(new Uint8Array(png))
        captureSaved = true
      },
      ...extra,
    })
  return {
    options,
    deployment,
    run,
    execute,
    calls,
    inputs,
    fetchImpl,
    get tokenFreeGet() {
      return tokenFreeGet
    },
    get captureSaved() {
      return captureSaved
    },
  }
}

test('all three API oracles bind real Core schemas, callbacks and PNG; retirement is serial and awaited', async () => {
  const h = await harness()
  const receipt = await h.execute()
  expect(receipt.status).toBe('API_PASSED')
  expect(receipt.cases.map((item) => item.oraclePassed)).toEqual([true, true, true])
  expect(receipt.cases[1]!.noExecutionReported).toBe(true)
  expect(receipt.cases[2]!.callbacks).toEqual({ stdin: true, key: true, click: true })
  expect(receipt.cases[2]!.capture?.frameSequence).toBe(4)
  expect(receipt.logicalCleanupConfirmed).toBe(true)
  expect(receipt.negativeAdmissions.map((item) => item.admission)).toEqual(['denied', 'denied'])
  expect(h.inputs.size).toBe(3)
  expect([...h.inputs.values()].every((input) => input.removed)).toBe(true)
  expect(h.captureSaved).toBe(true)
  expect(h.tokenFreeGet).toBe(3)
  expect(receipt.overallQualified).toBe(false)
  expect(receipt.physicalCleanupVerified).toBe(false)
  expect(receipt.cancellationQualified).toBe(false)
  const mutations = h.calls.filter((call) => call.endsWith('/inputs') || call.endsWith('/remove'))
  expect(mutations).toEqual([
    'POST /v1/python/inputs',
    'POST /v1/python/inputs',
    'POST /v1/python/inputs',
    'POST /v1/python/inputs/remove',
    'POST /v1/python/inputs',
    'POST /v1/python/inputs/remove',
    'POST /v1/python/inputs',
    'POST /v1/python/previews/remove',
    'POST /v1/python/inputs/remove',
  ])
  const text = canonicalJson(receipt)
  for (const forbidden of [
    'fake-secret',
    'inputId',
    'generation',
    '"Authorization"',
    'X-Studio-Python-Input',
    'qa-main-must-not-run',
    'qa-stdin-Lia',
    'stdout',
    'stderr',
  ])
    expect(text.includes(forbidden)).toBe(false)
})

test('a changed plan pin is rejected before artifact reads or any remote operation', async () => {
  const h = await harness()
  const outcome = await pinPythonExecutionPlan({}, h.options).then(
    () => null,
    (error: unknown) => error,
  )
  expect(outcome).toBeInstanceOf(Error)
  expect(h.calls).toHaveLength(0)
})

for (const fault of [
  'lost-admission',
  'invalid-admission',
  'open-503',
  'persisted-open-408',
  'persisted-open-409',
] as const)
  test(`${fault} remains unknown, never retries or claims cleanup`, async () => {
    const h = await harness(fault)
    const outcome = await h.execute().then(
      () => null,
      (error: unknown) => error,
    )
    expect(outcome).toBeInstanceOf(Error)
    expect(h.run.receipt.remoteOutcomeUnknown).toBe(true)
    expect(h.run.receipt.cases[0]!.admission).toBe('unknown')
    expect(h.inputs.size).toBe(1)
    expect([...h.inputs.values()][0]!.removed).toBe(false)
    expect(h.run.receipt.logicalCleanupConfirmed).toBe(false)
    expect(h.run.receipt.status).toBe('FAILED')
    expect(h.calls.filter((call) => call.endsWith('/inputs'))).toHaveLength(3)
    expect(h.calls.some((call) => call.endsWith('/remove'))).toBe(false)
    expect(canonicalJson(h.run.receipt).includes('fake-secret')).toBe(false)
  })

for (const fault of [
  'report-revision',
  'missing-marker',
  'bad-png',
  'stream-too-large',
  'receipt-recipe',
] as const)
  test(`${fault} cannot qualify despite successful transport and still retires every known input`, async () => {
    const h = await harness(fault)
    const outcome = await h.execute().then(
      () => null,
      (error: unknown) => error,
    )
    expect(outcome).toBeInstanceOf(Error)
    expect(h.run.receipt.apiQualified).toBe(false)
    expect(h.run.receipt.logicalCleanupConfirmed).toBe(true)
    expect([...h.inputs.values()].every((input) => input.removed)).toBe(true)
    if (h.run.receipt.cases[2]!.previewRequested)
      expect(h.calls.indexOf('POST /v1/python/previews/remove')).toBeLessThan(
        h.calls.lastIndexOf('POST /v1/python/inputs/remove'),
      )
  })

for (const fault of ['cleanup-503', 'cleanup-false'] as const)
  test(`${fault} is not an ACK and prevents admitting another case`, async () => {
    const h = await harness(fault)
    const outcome = await h.execute().then(
      () => null,
      (error: unknown) => error,
    )
    expect(outcome).toBeInstanceOf(Error)
    expect(h.run.receipt.logicalCleanupConfirmed).toBe(false)
    expect(h.run.receipt.cases[0]!.inputRemoveAcknowledged).toBe(false)
    expect(h.inputs.size).toBe(1)
    expect(h.calls.filter((call) => call.endsWith('/inputs/remove'))).toHaveLength(1)
  })

test('primary failure survives alongside cleanup failure and no resource is retried', async () => {
  const h = await harness('primary-and-cleanup')
  const outcome = await h.execute().then(
    () => null,
    (error: unknown) => error,
  )
  expect(outcome).toBeInstanceOf(AggregateError)
  if (!(outcome instanceof AggregateError)) throw new Error('Expected aggregate')
  expect(
    outcome.errors.some(
      (error) => error instanceof Error && error.message === 'original-operation-failure',
    ),
  ).toBe(true)
  expect(h.run.receipt.failures.map((item) => item.kind)).toEqual(['operation', 'cleanup'])
  expect(h.calls.filter((call) => call.endsWith('/inputs/remove'))).toHaveLength(1)
})

test('an unexpectedly admitted anonymous request is still owned and cleaned before failure', async () => {
  const h = await harness('anonymous-admitted')
  const outcome = await h.execute().then(
    () => null,
    (error: unknown) => error,
  )
  expect(outcome).toBeInstanceOf(Error)
  expect(h.run.receipt.negativeAdmissions[0]!.inputRetirementConfirmed).toBe(true)
  expect(h.run.receipt.remoteOutcomeUnknown).toBe(false)
  expect(h.run.receipt.status).toBe('FAILED')
  expect([...h.inputs.values()].every((input) => input.removed)).toBe(true)
})

test('checkpoint failure after admission cannot discard ownership; before dispatch creates no unknown admission', async () => {
  for (const before of [false, true]) {
    const h = await harness()
    let failed = false
    const outcome = await h
      .execute({
        checkpoint: async () => {
          if (
            !failed &&
            h.run.receipt.phase === 'inspection-no-execution:open' &&
            (before || h.run.receipt.cases[0]!.admission === 'known')
          ) {
            failed = true
            throw new Error('disk failure')
          }
        },
      })
      .then(
        () => null,
        (error: unknown) => error,
      )
    expect(outcome).toBeInstanceOf(Error)
    expect(h.run.receipt.remoteOutcomeUnknown).toBe(false)
    expect(h.inputs.size).toBe(before ? 0 : 1)
    expect([...h.inputs.values()].every((input) => input.removed)).toBe(true)
    expect(h.run.receipt.apiQualified).toBe(false)
  }
})

test('caller cancellation after admission aborts work but uses independent awaited cleanup', async () => {
  const h = await harness()
  const abort = new AbortController()
  const outcome = await h
    .execute({
      signal: abort.signal,
      checkpoint: async () => {
        if (h.run.receipt.phase === 'inspection-no-execution:owner-refused')
          abort.abort(new Error('stop'))
      },
    })
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(outcome).toBeInstanceOf(Error)
  expect(h.run.receipt.logicalCleanupConfirmed).toBe(true)
  expect(h.run.receipt.apiQualified).toBe(false)
  expect(h.inputs.size).toBe(1)
  expect([...h.inputs.values()].every((input) => input.removed)).toBe(true)
})
