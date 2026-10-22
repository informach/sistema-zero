import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalJson } from '@sistemazero/core/creations'
import { awaitWithSignal, readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  StudioPythonExecutionContentSchema,
  studioPythonExecutionRevision,
  verifyStudioPythonExecutionMetadata,
} from '@sistemazero/core/studio/python-execution-content'
import { verifyStudioPythonInspectionReport } from '@sistemazero/core/studio/python-inspection'
import {
  STUDIO_PYTHON_PLAYTEST_LIMITS,
  StudioPythonPlaytestRecipeSchema,
  verifyStudioPythonPlaytestCapture,
} from '@sistemazero/core/studio/python-playtest'
import { verifyStudioPythonPreviewReference } from '@sistemazero/core/studio/python-preview'
import { verifyStudioPythonDeployment } from '@sistemazero/core/studio/python-runtime-distribution'
import {
  STUDIO_PYTHON_VALIDATION_LIMITS,
  verifyStudioPythonValidationReport,
} from '@sistemazero/core/studio/python-validation'
import {
  STUDIO_PYTHON_INPUT_LIMITS,
  StudioPythonInputOpenSchema,
  type StudioPythonInputReference,
  StudioPythonInputReferenceSchema,
  StudioPythonInspectionRequestSchema,
  StudioPythonValidationRequestSchema,
} from '@sistemazero/core/studio/python-validation-input'
import { z } from 'zod'
import { verifyPythonPromotionPlan } from './python-promotion-plan'

export const STAGING_PYTHON_RUNTIME_ORIGIN =
  'https://sistemazero-studio-runtime-staging.helena-bcc.workers.dev'
export const PYTHON_EXECUTION_QUALIFICATION_LIMITS = Object.freeze({
  workMs: 240_000,
  cleanupMs: 60_000,
  totalMs: 300_000,
  requestMs: 90_000,
  smallRequestMs: 15_000,
  cleanupRequestMs: 10_000,
  planBytes: 2_000_000,
})
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const ackSchema = z.strictObject({ ok: z.literal(true) })
const openSchema = z.strictObject({ ok: z.literal(true), input: StudioPythonInputReferenceSchema })
const reportSchema = z.strictObject({ ok: z.literal(true), report: z.unknown() })
const validationSchema = reportSchema.extend({ preview: z.unknown().optional() })
const denialSchema = z.object({ ok: z.literal(false), code: z.string() })
type Deployment = Awaited<ReturnType<typeof verifyStudioPythonDeployment>>
type FetchPort = (url: string | URL, init: RequestInit) => Promise<Response>

export function parsePythonExecutionOptions(args: readonly string[]) {
  const [mode, ...flags] = args
  assert(mode === 'preflight' || mode === 'run', 'Use preflight or run explicitly.')
  const names = [
    'environment',
    'base-url',
    'plan',
    'plan-sha256',
    'manifest-sha256',
    'distribution-sha256',
    'parent-origin',
    'out',
  ]
  const values = new Map<string, string>()
  for (const flag of flags) {
    const match = /^--([a-z0-9-]+)=(.+)$/.exec(flag)
    assert(
      match && names.includes(match[1]!) && !values.has(match[1]!),
      'Invalid or repeated argument.',
    )
    values.set(match[1]!, match[2]!)
  }
  assert(
    names.every((name) => values.has(name)),
    'Every public pin and path is required.',
  )
  const get = (name: string) => values.get(name)!
  assert.equal(get('environment'), 'staging')
  assert.equal(get('base-url'), STAGING_PYTHON_RUNTIME_ORIGIN)
  for (const key of ['plan-sha256', 'manifest-sha256', 'distribution-sha256'])
    assert(/^[a-f0-9]{64}$/.test(get(key)), 'Invalid SHA-256.')
  const parent = new URL(get('parent-origin'))
  assert(
    parent.protocol === 'https:' &&
      parent.origin === get('parent-origin') &&
      !parent.username &&
      !parent.password &&
      parent.origin !== get('base-url'),
    'Invalid parent origin.',
  )
  return Object.freeze({
    mode,
    environment: 'staging' as const,
    baseUrl: get('base-url'),
    planPath: resolve(get('plan')),
    planSha256: get('plan-sha256'),
    manifestSha256: get('manifest-sha256'),
    distributionSha256: get('distribution-sha256'),
    parentOrigin: parent.origin,
    directory: resolve(get('out')),
  })
}
export type PythonExecutionOptions = ReturnType<typeof parsePythonExecutionOptions>

export async function pinPythonExecutionPlan(raw: unknown, options: PythonExecutionOptions) {
  const plan = await verifyPythonPromotionPlan(raw, options.planSha256)
  assert.equal(plan.input.environment, options.environment)
  assert.equal(plan.input.target.runtimeOrigin, options.baseUrl)
  assert(
    plan.configuration.worker?.parentOrigins.includes(options.parentOrigin),
    'Parent origin is absent from the final approved plan.',
  )
  const deployment = await verifyStudioPythonDeployment(plan.deployment)
  assert.equal(deployment.release.manifestSha256, options.manifestSha256)
  assert.equal(deployment.distributionSha256, options.distributionSha256)
  assert(
    deployment.release.manifest.extensions.some(
      (item) => item.id === 'python-turtle' && item.versions.includes('1.0.0'),
    ),
    'Turtle 1.0.0 is required.',
  )
  assert(
    ['inspect.mjs', 'playtest.mjs'].every((path) =>
      deployment.distribution.files.some((file) => file.path === path),
    ),
    'Inspection/playtest artifacts are required.',
  )
  return deployment
}

const imageBytes = () =>
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
    'base64',
  )
const sourceFixtures = [
  {
    name: 'inspection-no-execution',
    main: 'import helper\nraise RuntimeError("qa-main-must-not-run")\n',
    helper: 'raise RuntimeError("qa-helper-must-not-run")\n',
  },
  { name: 'compile-rejection', main: 'def broken(:\n    pass\n', helper: 'VALUE = 7\n' },
  {
    name: 'turtle-input-and-capture',
    main: [
      'import turtle',
      'from helper import greeting',
      'screen = turtle.Screen()',
      'screen.setup(320, 240)',
      'actor = turtle.Turtle()',
      'actor.speed(0)',
      'screen.addshape("hero.png")',
      'actor.shape("hero.png")',
      'def pressed():',
      '    actor.forward(10)',
      '    print("qa-key-fired")',
      'def clicked(x, y):',
      '    actor.goto(x, y)',
      '    print("qa-click-fired")',
      'screen.onkey(pressed, "space")',
      'screen.onclick(clicked)',
      'screen.listen()',
      'print("Nome?")',
      'answer = input()',
      'print(greeting(answer))',
      'screen.mainloop()',
      '',
    ].join('\n'),
    helper: 'def greeting(name):\n    return "qa-stdin-" + name\n',
  },
] as const

interface CaseEvidence {
  name: string
  requestId: string
  executionId: string
  revision: string
  files: { path: string; sha256: string; byteLength: number }[]
  admission: 'not-sent' | 'pending' | 'denied' | 'known' | 'unknown'
  oraclePassed: boolean
  recipeSha256?: string
  reportSha256?: string
  compilePassed?: boolean
  noExecutionReported?: boolean
  callbacks?: { stdin: boolean; key: boolean; click: boolean }
  capture?: {
    sha256: string
    byteLength: number
    width: number
    height: number
    frameSequence: number
  }
  previewRequested: boolean
  previewRemoveAcknowledged: boolean
  previewRetirementConfirmed: boolean
  inputRemoveAcknowledged: boolean
  inputRetirementConfirmed: boolean
}
function evidence(name: string, revision: string, files: CaseEvidence['files']): CaseEvidence {
  return {
    name,
    requestId: randomUUID(),
    executionId: `qa-${randomUUID()}`,
    revision,
    files,
    admission: 'not-sent',
    oraclePassed: false,
    previewRequested: false,
    previewRemoveAcknowledged: false,
    previewRetirementConfirmed: false,
    inputRemoveAcknowledged: false,
    inputRetirementConfirmed: false,
  }
}
export async function createPythonExecutionRun(
  options: PythonExecutionOptions,
  deployment: Deployment,
) {
  assert.equal(deployment.release.manifestSha256, options.manifestSha256)
  assert.equal(deployment.distributionSha256, options.distributionSha256)
  const owner = Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const projectId = `qa-runtime-${randomUUID()}`
  const cases = []
  for (const fixture of sourceFixtures) {
    const files = new Map<string, Uint8Array>([
      ['main.py', Buffer.from(fixture.main)],
      ['helper.py', Buffer.from(fixture.helper)],
    ])
    const graphical = fixture.name === 'turtle-input-and-capture'
    if (graphical) files.set('hero.png', imageBytes())
    const content = StudioPythonExecutionContentSchema.parse({
      version: 1,
      configuration: {
        runtime: {
          profileId: deployment.release.profileId,
          releaseId: deployment.release.releaseId,
          manifestSha256: options.manifestSha256,
        },
        extensions: graphical ? [{ id: 'python-turtle', version: '1.0.0' }] : [],
        python: {
          entrypoint: 'main.py',
          dependencyLock: {
            lockVersion: 1,
            target: 'browser',
            pythonVersion: deployment.distribution.pythonVersion,
            runtimeManifestSha256: options.manifestSha256,
            requirementsSha256: hash(''),
            packages: [],
          },
        },
      },
      directories: [],
      files: [...files].map(([path, bytes]) => ({
        path,
        kind: path.endsWith('.py') ? 'source' : 'asset',
        sha256: hash(bytes),
        byteLength: bytes.length,
      })),
    })
    const snapshot = await verifyStudioPythonExecutionMetadata({
      ...content,
      projectId,
      revision: await studioPythonExecutionRevision(content),
    })
    const recipe = StudioPythonPlaytestRecipeSchema.parse({
      version: 1,
      observeMs: 1000,
      stdin: graphical ? ['Lia'] : [],
      keys: graphical ? ['Space'] : [],
      clicks: graphical ? [{ x: 0.25, y: 0.25, button: 'left' }] : [],
      requireGraphics: graphical,
    })
    const state = evidence(
      fixture.name,
      snapshot.revision,
      snapshot.files.map(({ path, sha256, byteLength }) => ({ path, sha256, byteLength })),
    )
    if (fixture.name !== 'inspection-no-execution') state.recipeSha256 = hash(canonicalJson(recipe))
    cases.push({
      files,
      snapshot,
      recipe,
      state,
    })
  }
  const receipt = {
    version: 1,
    kind: 'studio.python.remote-execution-qualification',
    environment: options.environment,
    baseUrl: options.baseUrl,
    parentOrigin: options.parentOrigin,
    planSha256: options.planSha256,
    manifestSha256: options.manifestSha256,
    distributionSha256: options.distributionSha256,
    pythonVersion: deployment.distribution.pythonVersion,
    owner,
    projectId,
    status: 'RUNNING',
    phase: 'reserved',
    startedAt: new Date().toISOString(),
    endedAt: null as string | null,
    cases: cases.map((item) => item.state),
    negativeAdmissions: [] as CaseEvidence[],
    checks: [] as { name: string; status: number; passed: boolean }[],
    remoteOutcomeUnknown: false,
    logicalCleanupConfirmed: false,
    apiQualified: false,
    cancellationQualified: false,
    physicalCleanupVerified: false,
    hostedUI: false,
    contextualAuthorization: false,
    publicGameExecution: false,
    performance: false,
    overallQualified: false,
    failures: [] as { phase: string; kind: 'operation' | 'cleanup' | 'checkpoint' }[],
  }
  return { receipt, cases }
}
type Run = Awaited<ReturnType<typeof createPythonExecutionRun>>
interface Resource {
  ref: StudioPythonInputReference
  state: CaseEvidence
  previewUrl?: string
  cleanupAttempted: boolean
}

/** Body budget applies to actual bytes, including a missing or misleading Content-Length. */
async function readBinary(response: Response, maximum: number, signal: AbortSignal) {
  const declared = response.headers.get('content-length')
  assert(
    declared === null || (/^\d+$/.test(declared) && Number(declared) <= maximum),
    'Body limit.',
  )
  assert(response.body, 'Missing response body.')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  let complete = false
  try {
    while (true) {
      const part = await awaitWithSignal(() => reader.read(), signal)
      if (part.done) {
        complete = true
        break
      }
      length += part.value.length
      assert(length <= maximum, 'Body limit.')
      chunks.push(part.value)
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return bytes
  } finally {
    if (!complete)
      await awaitWithSignal(() => reader.cancel(), AbortSignal.timeout(1000)).catch(() => {})
    reader.releaseLock()
  }
}

/** Test port supplies only HTTP; all metadata/report/image oracles remain the real Core verifiers. */
export async function qualifyPythonExecution(input: {
  options: PythonExecutionOptions
  deployment: Deployment
  run: Run
  token: string
  checkpoint: () => Promise<void>
  saveCapture?: (bytes: Uint8Array) => Promise<void>
  fetchImpl?: FetchPort
  signal?: AbortSignal
}) {
  const { deployment, run, checkpoint, saveCapture } = input
  const options = Object.freeze({ ...input.options })
  assert(options.baseUrl === STAGING_PYTHON_RUNTIME_ORIGIN && options.environment === 'staging')
  assert(
    input.token.trim() === input.token && input.token.length > 0 && !/[\r\n]/.test(input.token),
  )
  // Capture caller-owned inputs before the first suspension.
  const cases = run.cases.map((item) => ({
    ...item,
    snapshot: structuredClone(item.snapshot),
    recipe: structuredClone(item.recipe),
    files: new Map([...item.files].map(([path, bytes]) => [path, Uint8Array.from(bytes)])),
  }))
  const token = input.token
  const fetchPort: FetchPort = input.fetchImpl ?? fetch
  const receipt = run.receipt
  const resources: Resource[] = []
  const failures: unknown[] = []
  const total = AbortSignal.timeout(PYTHON_EXECUTION_QUALIFICATION_LIMITS.totalMs)
  const work = AbortSignal.any([
    total,
    AbortSignal.timeout(PYTHON_EXECUTION_QUALIFICATION_LIMITS.workMs),
    ...(input.signal ? [input.signal] : []),
  ])
  let finalCleanup: AbortSignal | undefined

  const persist = async (signal: AbortSignal = work) => {
    try {
      await awaitWithSignal(checkpoint, signal)
    } catch (error) {
      receipt.failures.push({ phase: receipt.phase, kind: 'checkpoint' })
      throw error
    }
  }
  const wire = async (
    name: string,
    path: string,
    params: {
      body?: unknown
      bytes?: Uint8Array
      ref?: StudioPythonInputReference
      anonymous?: boolean
      cleanup?: boolean
      binary?: boolean
      onDispatch?: () => void
    } = {},
  ) => {
    receipt.phase = name
    const scope = params.cleanup ? (finalCleanup ?? total) : work
    const signal = AbortSignal.any([
      scope,
      AbortSignal.timeout(
        params.cleanup
          ? PYTHON_EXECUTION_QUALIFICATION_LIMITS.cleanupRequestMs
          : path.endsWith('/validate') || path.endsWith('/inspect')
            ? PYTHON_EXECUTION_QUALIFICATION_LIMITS.requestMs
            : PYTHON_EXECUTION_QUALIFICATION_LIMITS.smallRequestMs,
      ),
    ])
    // Failure to persist cannot abandon already-owned resources. It remains a failing oracle.
    if (params.cleanup) {
      try {
        await persist(AbortSignal.any([scope, AbortSignal.timeout(1000)]))
      } catch (error) {
        failures.push(error)
      }
    } else await persist(signal)
    signal.throwIfAborted()
    const headers: Record<string, string> = {}
    if (!params.anonymous) headers.Authorization = `Bearer ${token}`
    if (params.ref) headers['X-Studio-Python-Input'] = JSON.stringify(params.ref)
    const body = params.bytes
      ? new Blob([Uint8Array.from(params.bytes)])
      : params.body === undefined
        ? undefined
        : JSON.stringify(params.body)
    if (body !== undefined)
      headers['Content-Type'] = params.bytes ? 'application/octet-stream' : 'application/json'
    const response = await awaitWithSignal(
      () => {
        params.onDispatch?.()
        return fetchPort(new URL(path, options.baseUrl), {
          method: body === undefined ? 'GET' : 'POST',
          body,
          headers,
          signal,
          redirect: 'error',
        })
      },
      signal,
      (late) => {
        void late.body?.cancel().catch(() => {})
      },
    )
    try {
      const value: unknown = params.binary
        ? await readBinary(response, STUDIO_PYTHON_PLAYTEST_LIMITS.captureBytes, signal)
        : await readJsonBodyWithLimit(
            response,
            STUDIO_PYTHON_VALIDATION_LIMITS.responseBytes,
            signal,
          )
      receipt.checks.push({ name, status: response.status, passed: false })
      return { status: response.status, headers: response.headers, value }
    } catch (error) {
      void response.body?.cancel().catch(() => {})
      throw error
    }
  }
  const pass = () => {
    receipt.checks[receipt.checks.length - 1]!.passed = true
  }
  const retire = async (resource: Resource) => {
    if (resource.cleanupAttempted) return
    resource.cleanupAttempted = true
    const { state, ref } = resource
    if (state.previewRequested) {
      try {
        const removed = await wire(`${state.name}:remove-preview`, '/v1/python/previews/remove', {
          body: ref,
          cleanup: true,
        })
        assert.equal(removed.status, 200)
        ackSchema.parse(removed.value)
        state.previewRemoveAcknowledged = true
        pass()
        if (resource.previewUrl) {
          const absent = await wire(`${state.name}:preview-retired`, resource.previewUrl, {
            anonymous: true,
            cleanup: true,
            binary: true,
          })
          assert.equal(absent.status, 404)
          state.previewRetirementConfirmed = true
          pass()
        }
      } catch (error) {
        failures.push(error)
        receipt.failures.push({ phase: receipt.phase, kind: 'cleanup' })
      }
    }
    try {
      const removed = await wire(`${state.name}:remove-input`, '/v1/python/inputs/remove', {
        body: ref,
        cleanup: true,
      })
      assert.equal(removed.status, 200)
      ackSchema.parse(removed.value)
      state.inputRemoveAcknowledged = true
      pass()
      const absent = await wire(`${state.name}:input-retired`, '/v1/python/inspect', {
        body: StudioPythonInspectionRequestSchema.parse({
          version: 1,
          input: ref,
          structure: false,
        }),
        cleanup: true,
      })
      assert.equal(absent.status, 410)
      denialSchema.parse(absent.value)
      state.inputRetirementConfirmed = true
      pass()
    } catch (error) {
      failures.push(error)
      receipt.failures.push({ phase: receipt.phase, kind: 'cleanup' })
    }
  }
  const admit = async (
    item: Run['cases'][number],
    expected: 200 | 401 | 409,
    anonymous = false,
  ) => {
    const state = item.state
    if (expected !== 200) receipt.negativeAdmissions.push(state)
    const body = StudioPythonInputOpenSchema.parse({
      version: 1,
      owner: receipt.owner,
      requestId: state.requestId,
      executionId: state.executionId,
      snapshot: item.snapshot,
    })
    let dispatched = false
    let acknowledged = false
    try {
      const result = await wire(`${state.name}:open`, '/v1/python/inputs', {
        body,
        anonymous,
        onDispatch: () => {
          dispatched = true
          state.admission = 'pending'
        },
      })
      if (result.status === 200) {
        const ref = openSchema.parse(result.value).input
        assert(
          ref.owner === body.owner &&
            ref.requestId === body.requestId &&
            ref.executionId === body.executionId &&
            ref.projectId === body.snapshot.projectId &&
            ref.revision === body.snapshot.revision &&
            ref.expiresAt > Date.now() &&
            ref.expiresAt <= Date.now() + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs,
          'Admission mismatch.',
        )
        const resource: Resource = { ref, state, cleanupAttempted: false }
        resources.push(resource) // Own it before the next await, including an unexpected successful admission.
        state.admission = 'known'
        acknowledged = true
        assert.equal(result.status, expected)
        pass()
        await persist()
        return resource
      }
      denialSchema.parse(result.value)
      // A positive admission can persist before a later check/approval returns 4xx.
      // Only these constructed pre-admission negatives establish that no input was opened.
      const provenPreAdmissionDenial =
        (anonymous && expected === 401 && result.status === 401) ||
        (!anonymous &&
          expected === 409 &&
          result.status === 409 &&
          body.snapshot.configuration.runtime.manifestSha256 !== options.manifestSha256)
      if (provenPreAdmissionDenial) {
        state.admission = 'denied'
        acknowledged = true
      }
      assert.equal(result.status, expected)
      pass()
      return undefined
    } catch (error) {
      if (dispatched && !acknowledged) {
        state.admission = 'unknown'
        receipt.remoteOutcomeUnknown = true
      }
      throw error
    }
  }

  try {
    const metadata = await wire('deployment', `/v1/runtime-deployments/${options.manifestSha256}`, {
      anonymous: true,
    })
    assert.equal(metadata.status, 200)
    const served = await verifyStudioPythonDeployment(metadata.value)
    assert.equal(served.release.manifestSha256, options.manifestSha256)
    assert.equal(served.distributionSha256, options.distributionSha256)
    assert.equal(canonicalJson(served.release), canonicalJson(deployment.release))
    pass()
    const base = cases[0]!
    await admit(
      { ...base, state: evidence('anonymous-refused', base.snapshot.revision, []) },
      401,
      true,
    )
    const changed = structuredClone(base.snapshot)
    const unknownManifest = hash(`unapproved-qa-${randomUUID()}`)
    changed.configuration.runtime.manifestSha256 = unknownManifest
    changed.configuration.python.dependencyLock.runtimeManifestSha256 = unknownManifest
    const { projectId: _id, revision: _revision, ...changedContent } = changed
    changed.revision = await studioPythonExecutionRevision(changedContent)
    await admit(
      {
        ...base,
        snapshot: changed,
        state: evidence('unapproved-release-refused', changed.revision, []),
      },
      409,
    )
    for (const item of cases) {
      const resource = await admit(item, 200)
      assert(resource)
      const { state, ref } = resource
      const wrongOwner = { ...ref, owner: hash(`different-owner-${receipt.owner}`) }
      const refused = await wire(`${state.name}:owner-refused`, '/v1/python/inspect', {
        body: StudioPythonInspectionRequestSchema.parse({
          version: 1,
          input: wrongOwner,
          structure: false,
        }),
      })
      assert.equal(refused.status, 409)
      denialSchema.parse(refused.value)
      pass()
      for (const file of item.snapshot.files) {
        const bytes = item.files.get(file.path)
        assert(bytes && hash(bytes) === file.sha256 && bytes.byteLength === file.byteLength)
        const uploaded = await wire(
          `${state.name}:upload:${file.path}`,
          `/v1/python/files/${file.sha256}`,
          { bytes, ref },
        )
        assert.equal(uploaded.status, 200)
        const ack = z
          .strictObject({
            ok: z.literal(true),
            file: z.strictObject({
              sha256: z.string(),
              bytes: z.number(),
            }),
          })
          .parse(uploaded.value)
        assert.equal(ack.file.sha256, file.sha256)
        assert.equal(ack.file.bytes, file.byteLength)
        pass()
      }
      if (state.name === 'inspection-no-execution') {
        const inspected = await wire(`${state.name}:inspect`, '/v1/python/inspect', {
          body: StudioPythonInspectionRequestSchema.parse({
            version: 1,
            input: ref,
            structure: false,
          }),
        })
        assert.equal(inspected.status, 200)
        const report = await verifyStudioPythonInspectionReport(
          reportSchema.parse(inspected.value).report,
          item.snapshot,
        )
        assert.equal(report.status, 'passed')
        state.compilePassed = true
        state.noExecutionReported = true
        state.reportSha256 = hash(canonicalJson(report))
        pass()
      } else {
        state.previewRequested = item.recipe.requireGraphics
        const validated = await wire(`${state.name}:validate`, '/v1/python/validate', {
          body: StudioPythonValidationRequestSchema.parse({
            version: 1,
            input: ref,
            structure: false,
            recipe: item.recipe,
            ...(state.previewRequested ? { preview: { parentOrigin: options.parentOrigin } } : {}),
          }),
        })
        assert.equal(validated.status, 200)
        const envelope = validationSchema.parse(validated.value)
        const report = await verifyStudioPythonValidationReport(
          envelope.report,
          item.snapshot,
          item.recipe,
          false,
        )
        state.reportSha256 = hash(canonicalJson(report))
        state.compilePassed = report.inspection.status === 'passed'
        if (!state.previewRequested) {
          assert.equal(report.status, 'failed')
          assert.equal(report.inspection.status, 'failed')
          assert.equal(report.execution, undefined)
          assert.equal(envelope.preview, undefined)
          state.noExecutionReported = true
          pass()
        } else {
          assert.equal(report.status, 'passed')
          const execution = report.execution
          assert(execution?.capture && execution.omittedChars === 0 && execution.stderr === '')
          state.callbacks = {
            stdin: execution.stdout.split(/\r?\n/).includes('qa-stdin-Lia'),
            key: execution.stdout.split(/\r?\n/).includes('qa-key-fired'),
            click: execution.stdout.split(/\r?\n/).includes('qa-click-fired'),
          }
          assert(
            Object.values(state.callbacks).every(Boolean),
            'Callbacks did not produce their causal markers.',
          )
          const preview = verifyStudioPythonPreviewReference(envelope.preview, {
            projectId: item.snapshot.projectId,
            revision: item.snapshot.revision,
            runtimeManifestSha256: options.manifestSha256,
            serviceOrigin: options.baseUrl,
            parentOrigin: options.parentOrigin,
            now: Date.now(),
          })
          resource.previewUrl = preview.url
          pass()
          const capture = await wire(
            `${state.name}:capture`,
            new URL('python-playtest.png', preview.url).href,
            { anonymous: true, binary: true },
          )
          assert.equal(capture.status, 200)
          assert.equal(capture.headers.get('content-type'), 'image/png')
          assert(capture.value instanceof Uint8Array)
          const verified = await verifyStudioPythonPlaytestCapture(execution.capture, capture.value)
          const { path: _path, ...publicCapture } = verified
          state.capture = publicCapture
          const png = capture.value
          if (saveCapture) await awaitWithSignal(() => saveCapture(png), work)
          pass()
        }
      }
      state.oraclePassed = true
      await retire(resource)
      await persist()
      assert.equal(failures.length, 0, 'Cleanup failed; no further case will be admitted.')
      work.throwIfAborted()
    }
  } catch (error) {
    failures.push(error)
    receipt.failures.push({ phase: receipt.phase, kind: 'operation' })
  } finally {
    finalCleanup = AbortSignal.any([
      total,
      AbortSignal.timeout(PYTHON_EXECUTION_QUALIFICATION_LIMITS.cleanupMs),
    ])
    for (const resource of resources) await retire(resource)
    receipt.logicalCleanupConfirmed =
      resources.length > 0 &&
      !receipt.remoteOutcomeUnknown &&
      resources.every(
        ({ state, previewUrl }) =>
          state.inputRemoveAcknowledged &&
          state.inputRetirementConfirmed &&
          (!state.previewRequested ||
            (state.previewRemoveAcknowledged && (!previewUrl || state.previewRetirementConfirmed))),
      )
    receipt.apiQualified =
      failures.length === 0 &&
      receipt.logicalCleanupConfirmed &&
      receipt.cases.every((state) => state.oraclePassed)
    receipt.status = receipt.apiQualified ? 'API_PASSED' : 'FAILED'
    receipt.endedAt = new Date().toISOString()
    try {
      await persist(finalCleanup)
    } catch (error) {
      failures.push(error)
      receipt.status = 'FAILED'
      receipt.apiQualified = false
    }
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1)
    throw new AggregateError(failures, 'Runtime qualification and/or cleanup failed.')
  return receipt
}

export async function runPythonExecutionCli(args: readonly string[]) {
  assert(
    !process.versions.bun && process.versions.node === '24.22.0',
    'Use Node 24.22.0 for the remote operator.',
  )
  const options = parsePythonExecutionOptions(args)
  const info = await lstat(options.planPath)
  assert(
    info.isFile() &&
      !info.isSymbolicLink() &&
      info.size <= PYTHON_EXECUTION_QUALIFICATION_LIMITS.planBytes,
    'Plan must be a bounded regular file.',
  )
  const bytes = await readFile(options.planPath)
  assert(bytes.length <= PYTHON_EXECUTION_QUALIFICATION_LIMITS.planBytes)
  const deployment = await pinPythonExecutionPlan(
    JSON.parse(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)),
    options,
  )
  const run = await createPythonExecutionRun(options, deployment)
  await mkdir(options.directory, { recursive: false })
  const output = await open(resolve(options.directory, 'receipt.json'), 'wx')
  let writing: Promise<unknown> = Promise.resolve()
  const checkpoint = () => {
    const json = `${JSON.stringify(run.receipt, null, 2)}\n`
    const pending = writing.then(async () => {
      await output.truncate(0)
      await output.write(json, 0, 'utf8')
      await output.sync()
    })
    writing = pending.catch(() => {})
    return pending
  }
  const controller = new AbortController()
  const abort = () => controller.abort(new Error('Operator interrupted.'))
  process.on('SIGINT', abort)
  process.on('SIGTERM', abort)
  const errors: unknown[] = []
  try {
    await checkpoint()
    if (options.mode === 'preflight') {
      run.receipt.status = 'PREFLIGHT_ONLY'
      run.receipt.phase = 'offline-inputs-verified'
      run.receipt.endedAt = new Date().toISOString()
      await checkpoint()
    } else {
      const token = process.env.STUDIO_PYTHON_RUNTIME_TOKEN
      assert(token, 'STUDIO_PYTHON_RUNTIME_TOKEN is required in memory.')
      await qualifyPythonExecution({
        options,
        deployment,
        run,
        token,
        checkpoint,
        signal: controller.signal,
        saveCapture: (png) =>
          writeFile(resolve(options.directory, 'python-playtest.png'), png, { flag: 'wx' }),
      })
    }
  } catch (error) {
    errors.push(error)
    run.receipt.status = 'FAILED'
    run.receipt.apiQualified = false
    run.receipt.endedAt = new Date().toISOString()
    try {
      await checkpoint()
    } catch (failure) {
      errors.push(failure)
    }
  } finally {
    process.off('SIGINT', abort)
    process.off('SIGTERM', abort)
    await writing
    try {
      await output.close()
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1)
    throw new AggregateError(errors, 'Operator failed; inspect the sanitized receipt.')
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runPythonExecutionCli(process.argv.slice(2)).catch(() => {
    // Exceptions may contain authenticated request details. Never print them.
    process.stderr.write(
      'Runtime qualification failed. Inspect the new sanitized receipt; no automatic retry.\n',
    )
    process.exitCode = 1
  })
}
