import { expect, test } from 'bun:test'
import { studioPythonExecutionRevision } from './python-execution-content'
import {
  StudioPythonPlaytestRecipeSchema,
  StudioPythonPlaytestReportSchema,
  verifyStudioPythonPlaytestCapture,
  verifyStudioPythonPlaytestReport,
} from './python-playtest'
import {
  StudioPythonValidationReportSchema,
  verifyStudioPythonValidationReport,
} from './python-validation'
import { readStudioRuntimeImage, readStudioRuntimePngDimensions } from './runtime-image'

const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='
const png = () => Uint8Array.from(atob(pngBase64), (char) => char.charCodeAt(0))
async function fixture() {
  const content = {
    version: 1,
    configuration: {
      runtime: { profileId: 'python-browser', releaseId: 'test-1', manifestSha256: 'a'.repeat(64) },
      extensions: [],
      python: {
        entrypoint: 'main.py',
        dependencyLock: {
          lockVersion: 1,
          target: 'browser',
          pythonVersion: '3.14.2',
          runtimeManifestSha256: 'a'.repeat(64),
          requirementsSha256: 'b'.repeat(64),
          packages: [],
        },
      },
    },
    directories: [],
    files: [{ path: 'main.py', kind: 'source', sha256: 'c'.repeat(64), byteLength: 4 }],
  }
  const snapshot = {
    ...content,
    projectId: 'game',
    revision: await studioPythonExecutionRevision(content),
  }
  const recipe = StudioPythonPlaytestRecipeSchema.parse({
    version: 1,
    stdin: [''],
    keys: ['ArrowLeft'],
    clicks: [{ x: 0.5, y: 0.5 }],
  })
  const report = StudioPythonPlaytestReportSchema.parse({
    version: 1,
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    runtimeManifestSha256: 'a'.repeat(64),
    pythonVersion: '3.14.2',
    instanceId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    recipe,
    status: 'passed',
    started: true,
    stopped: true,
    stateBeforeStop: 'completed',
    observedDurationMs: 1000,
    stdout: 'ação 🐢',
    stderr: 'a deliberate warning',
    omittedChars: 0,
    errors: [],
    input: { stdinRequests: 1, stdinSubmitted: 1, keysDispatched: 1, clicksDispatched: 1 },
  })
  return { snapshot, recipe, report }
}

test('playtest recipes reject code, external addresses and unbounded or ambiguous inputs', () => {
  expect(StudioPythonPlaytestRecipeSchema.parse({ version: 1 })).toEqual({
    version: 1,
    observeMs: 1000,
    stdin: [],
    keys: [],
    clicks: [],
    requireGraphics: false,
  })
  for (const changes of [
    { observeMs: 249 },
    { observeMs: 10_001 },
    { stdin: Array(5).fill('a') },
    { stdin: ['x'.repeat(4097)] },
    { keys: ['Control+a'] },
    { keys: [' '] },
    { clicks: [{ x: -0.1, y: 1 }] },
    { clicks: [{ x: 1, y: 1, button: 'back' }] },
    { script: 'alert(1)' },
    { selector: '#secret' },
    { url: 'https://external.invalid' },
  ])
    expect(StudioPythonPlaytestRecipeSchema.safeParse({ version: 1, ...changes }).success).toBe(
      false,
    )
})

test('service playtest evidence binds revision, project, runtime, version and effective recipe', async () => {
  const { snapshot, recipe, report } = await fixture()
  expect((await verifyStudioPythonPlaytestReport(report, snapshot, recipe)).status).toBe('passed')
  for (const changes of [
    { projectId: 'other' },
    { revision: 'd'.repeat(64) },
    { runtimeManifestSha256: 'd'.repeat(64) },
    { pythonVersion: '3.13.0' },
    { recipe: { ...recipe, observeMs: 999 } },
    { verifiedBy: 'server' },
  ])
    await expect(
      verifyStudioPythonPlaytestReport({ ...report, ...changes }, snapshot, recipe),
    ).rejects.toThrow()
  const pending = verifyStudioPythonPlaytestReport(report, snapshot, recipe)
  report.stdout = 'mutated'
  report.recipe.keys = []
  recipe.keys = []
  expect((await pending).stdout).toBe('ação 🐢')
})

test('a passed playtest requires execution, the complete recipe, optional graphics and confirmed stop', async () => {
  const { report } = await fixture()
  for (const changes of [
    { started: false },
    { stopped: false },
    { stateBeforeStop: 'ready' },
    { stateBeforeStop: 'paused' },
    { stateBeforeStop: 'failed' },
    { observedDurationMs: 999 },
    { errors: ['import failed'] },
    { input: { ...report.input, stdinSubmitted: 0 } },
    { input: { ...report.input, keysDispatched: 0 } },
    { input: { ...report.input, clicksDispatched: 0 } },
    { input: { ...report.input, stdinRequests: 0 } },
    { recipe: { ...report.recipe, requireGraphics: true } },
  ])
    expect(StudioPythonPlaytestReportSchema.safeParse({ ...report, ...changes }).success).toBe(
      false,
    )
  expect(
    StudioPythonPlaytestReportSchema.parse({
      ...report,
      status: 'failed',
      started: false,
      stopped: false,
      stateBeforeStop: 'failed',
      errors: ['import failed'],
    }).status,
  ).toBe('failed')
  // stderr may be deliberate program output; only explicit failures/diagnostics are technical errors.
  expect(StudioPythonPlaytestReportSchema.parse(report).stderr).toBe('a deliberate warning')
})

test('capture binds PNG header, exact bytes and SHA independently and detaches before hashing', async () => {
  const bytes = png()
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  const capture = {
    path: 'python-playtest.png' as const,
    sha256: hash,
    byteLength: bytes.byteLength,
    width: 1,
    height: 1,
    frameSequence: 1,
  }
  expect(await verifyStudioPythonPlaytestCapture(capture, bytes)).toEqual(capture)
  for (const changes of [
    { path: '../image.png' },
    { sha256: 'f'.repeat(64) },
    { byteLength: bytes.byteLength + 1 },
    { width: 2 },
    { frameSequence: 0 },
  ])
    await expect(
      verifyStudioPythonPlaytestCapture({ ...capture, ...changes }, bytes),
    ).rejects.toThrow()
  const corrupt = Uint8Array.from(bytes)
  corrupt[0] = 0
  await expect(verifyStudioPythonPlaytestCapture(capture, corrupt)).rejects.toThrow('Cabeçalho')
  const pending = verifyStudioPythonPlaytestCapture(capture, bytes)
  bytes.fill(0)
  capture.sha256 = 'e'.repeat(64)
  expect((await pending).sha256).toBe(hash)
})

test('interactive and isolated capture use the same bounded PNG header contract, including offset views', () => {
  const bytes = png()
  const padded = new Uint8Array(bytes.length + 4)
  padded.set(bytes, 4)
  expect(readStudioRuntimePngDimensions(padded.subarray(4))).toEqual({ width: 1, height: 1 })
  expect(readStudioRuntimePngDimensions(bytes.subarray(0, 32))).toBeUndefined()
  const image = {
    dataUrl: `data:image/png;base64,${pngBase64}`,
    width: 1,
    height: 1,
    frameSequence: 1,
  }
  expect(readStudioRuntimeImage(image)).toEqual(image)
  for (const changes of [
    { width: 2 },
    { height: 769 },
    { frameSequence: 0 },
    { dataUrl: 'data:image/svg+xml,<svg/>' },
  ])
    expect(readStudioRuntimeImage({ ...image, ...changes })).toBeUndefined()
})

test('complete validation binds both phases to one project, revision, runtime and captured recipe', async () => {
  const { snapshot, recipe, report: execution } = await fixture()
  const inspection = {
    version: 1,
    revision: snapshot.revision,
    runtimeManifestSha256: execution.runtimeManifestSha256,
    pythonVersion: execution.pythonVersion,
    status: 'passed',
    files: snapshot.files.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      status: 'passed',
      diagnostics: [],
    })),
  }
  const report = StudioPythonValidationReportSchema.parse({
    version: 1,
    projectId: snapshot.projectId,
    recipe,
    status: 'passed',
    inspection,
    execution,
  })
  expect((await verifyStudioPythonValidationReport(report, snapshot, recipe)).status).toBe('passed')
  for (const changes of [
    { execution: undefined },
    { projectId: 'other' },
    { status: 'failed' },
    { execution: { ...execution, revision: 'f'.repeat(64) } },
    { execution: { ...execution, runtimeManifestSha256: 'f'.repeat(64) } },
    { execution: { ...execution, pythonVersion: '3.13.0' } },
    { recipe: { ...recipe, observeMs: 999 } },
    { verifiedBy: 'server' },
  ])
    await expect(
      verifyStudioPythonValidationReport({ ...report, ...changes }, snapshot, recipe),
    ).rejects.toThrow()
  await expect(verifyStudioPythonValidationReport(report, snapshot, recipe, true)).rejects.toThrow(
    'incompleta',
  )
  const pending = verifyStudioPythonValidationReport(report, snapshot, recipe)
  report.recipe.keys = []
  report.execution = undefined
  recipe.keys = []
  expect((await pending).execution?.stdout).toBe('ação 🐢')
})

test('failed compilation is complete failed validation and cannot include learner execution', async () => {
  const { snapshot, recipe, report: execution } = await fixture()
  const inspection = {
    version: 1,
    revision: snapshot.revision,
    runtimeManifestSha256: execution.runtimeManifestSha256,
    pythonVersion: execution.pythonVersion,
    status: 'failed',
    files: snapshot.files.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      status: 'failed',
      diagnostics: [{ message: 'SyntaxError' }],
    })),
  }
  const report = { version: 1, projectId: snapshot.projectId, recipe, status: 'failed', inspection }
  expect((await verifyStudioPythonValidationReport(report, snapshot, recipe, true)).status).toBe(
    'failed',
  )
  expect(StudioPythonValidationReportSchema.safeParse({ ...report, execution }).success).toBe(false)
  await expect(
    verifyStudioPythonValidationReport(report, { ...snapshot, projectId: 'other' }, recipe),
  ).rejects.toThrow('projeto')
})
