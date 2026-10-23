import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '../creations/content-fingerprint'
import { studioPythonExecutionRevision } from './python-execution-content'
import { StudioPythonPlaytestRecipeSchema } from './python-playtest'
import {
  STUDIO_PYTHON_PREVIEW_LIMITS,
  StudioPythonPreviewManifestSchema,
  StudioPythonPreviewReferenceSchema,
  verifyStudioPythonPreviewManifest,
  verifyStudioPythonPreviewReference,
} from './python-preview'
import { StudioPythonValidationReportSchema } from './python-validation'

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
  const recipe = StudioPythonPlaytestRecipeSchema.parse({ version: 1 })
  const report = StudioPythonValidationReportSchema.parse({
    version: 1,
    projectId: snapshot.projectId,
    recipe,
    status: 'passed',
    inspection: {
      version: 1,
      revision: snapshot.revision,
      runtimeManifestSha256: 'a'.repeat(64),
      pythonVersion: '3.14.2',
      status: 'passed',
      files: [{ path: 'main.py', sha256: 'c'.repeat(64), status: 'passed', diagnostics: [] }],
    },
    execution: {
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
      stdout: 'ok',
      stderr: '',
      omittedChars: 0,
      errors: [],
      input: { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 },
    },
  })
  const manifest = StudioPythonPreviewManifestSchema.parse({
    kind: 'python-preview',
    version: 1,
    id: 'd'.repeat(64),
    jobId: '1'.repeat(64),
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    runtime: content.configuration.runtime,
    pythonVersion: '3.14.2',
    createdAt: 1000,
    expiresAt: 1000 + STUDIO_PYTHON_PREVIEW_LIMITS.lifetimeMs,
    parentOrigin: 'https://app.example',
    validation: { profileVersion: 1, runtimeFingerprint: 'e'.repeat(64) },
    files: [
      { role: 'project', path: 'project/main.py', bytes: 4, sha256: 'c'.repeat(64) },
      { role: 'launcher', path: 'index.html', bytes: 20, sha256: 'f'.repeat(64) },
      { role: 'stylesheet', path: 'player.css', bytes: 20, sha256: 'f'.repeat(64) },
      { role: 'payload', path: 'payload.json', bytes: 20, sha256: 'f'.repeat(64) },
      {
        role: 'validation',
        path: 'validation.json',
        bytes: new TextEncoder().encode(canonicalJson(report)).byteLength,
        sha256: await sha256Hex(canonicalJson(report)),
      },
    ],
  })
  const ref = {
    kind: 'python-preview',
    version: 1,
    id: manifest.id,
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    runtimeManifestSha256: 'a'.repeat(64),
    previewHostAudioVersion: 1,
    url: `https://runtime.example/v1/python-previews/${manifest.id}/index.html`,
    sha256: await sha256Hex(canonicalJson(manifest)),
    expiresAt: manifest.expiresAt,
  }
  const scope = {
    projectId: snapshot.projectId,
    revision: snapshot.revision,
    runtimeManifestSha256: 'a'.repeat(64),
    serviceOrigin: 'https://runtime.example',
    parentOrigin: manifest.parentOrigin,
    now: 1000,
  }
  return { snapshot, report, manifest, ref, scope }
}

test('preview references bind revision, exact service route, distinct origins and expiry', async () => {
  const { ref, scope } = await fixture()
  expect(verifyStudioPythonPreviewReference(ref, scope).id).toBe(ref.id)
  for (const changes of [
    { projectId: 'other' },
    { revision: 'b'.repeat(64) },
    { runtimeManifestSha256: 'b'.repeat(64) },
    { serviceOrigin: 'https://other.example' },
    { parentOrigin: scope.serviceOrigin },
    { now: ref.expiresAt },
    { now: 999 },
  ])
    expect(() => verifyStudioPythonPreviewReference(ref, { ...scope, ...changes })).toThrow()
  for (const url of [
    `${ref.url}?x=1`,
    `${ref.url}#x`,
    ref.url.replace('index.html', '%69ndex.html'),
    ref.url.replace('https:', 'http:'),
    ref.url.replace('runtime.example', 'user@runtime.example'),
    ref.url.replace('python-previews', 'artifacts'),
  ])
    expect(StudioPythonPreviewReferenceSchema.safeParse({ ...ref, url }).success).toBe(false)
})

test('preview references require the current audio contract without defaults', async () => {
  const { ref } = await fixture()
  expect(StudioPythonPreviewReferenceSchema.parse(ref).previewHostAudioVersion).toBe(1)
  for (const previewHostAudioVersion of [undefined, null, 0, 2, '1', true])
    expect(
      StudioPythonPreviewReferenceSchema.safeParse({ ...ref, previewHostAudioVersion }).success,
    ).toBe(false)
  const missing = { ...ref }
  Reflect.deleteProperty(missing, 'previewHostAudioVersion')
  expect(StudioPythonPreviewReferenceSchema.safeParse(missing).success).toBe(false)
})

test('preview accepts only exact generated paths and a portable nonoverlapping project tree', async () => {
  const { manifest } = await fixture()
  for (const path of [
    'index.html',
    'project/../index.html',
    'project/a%2fb.py',
    'project/CON.py',
    'project/.git/main.py',
  ]) {
    const files = structuredClone(manifest.files)
    const first = files[0]
    if (!first) throw new Error('Fixture sem arquivo de projeto.')
    first.path = path
    expect(StudioPythonPreviewManifestSchema.safeParse({ ...manifest, files }).success).toBe(false)
  }
  for (const file of [
    { ...manifest.files[0], path: 'project/MAIN.py' },
    { ...manifest.files[0], path: 'project/main.py/helper.py' },
    { ...manifest.files[1], path: 'project/injected.html' },
  ])
    expect(
      StudioPythonPreviewManifestSchema.safeParse({ ...manifest, files: [...manifest.files, file] })
        .success,
    ).toBe(false)
  const longest = structuredClone(manifest.files)
  const firstLongest = longest[0]
  if (!firstLongest) throw new Error('Fixture sem arquivo de projeto.')
  firstLongest.path = `project/${'a'.repeat(237)}.py`
  expect(StudioPythonPreviewManifestSchema.safeParse({ ...manifest, files: longest }).success).toBe(
    true,
  )
})

test('separate Python budgets reject per-role overflow and ambiguous lifetime', async () => {
  const { manifest } = await fixture()
  for (const [role, bytes] of [
    ['project', 32 * 1024 * 1024 + 1],
    ['launcher', 64 * 1024 + 1],
    ['payload', 2 * 1024 * 1024 + 1],
    ['validation', 3 * 1024 * 1024 + 1],
  ] as const) {
    const files = manifest.files.map((file) => (file.role === role ? { ...file, bytes } : file))
    expect(StudioPythonPreviewManifestSchema.safeParse({ ...manifest, files }).success).toBe(false)
  }
  expect(
    StudioPythonPreviewManifestSchema.safeParse({ ...manifest, expiresAt: manifest.expiresAt + 1 })
      .success,
  ).toBe(false)
})

test('preview verification rejects substituted files, report bytes and incomplete validation', async () => {
  const { manifest, snapshot, report } = await fixture()
  expect((await verifyStudioPythonPreviewManifest(manifest, snapshot, report)).revision).toBe(
    snapshot.revision,
  )
  for (const changes of [
    { projectId: 'other' },
    { revision: 'b'.repeat(64) },
    { pythonVersion: '3.13.0' },
    { runtime: { ...manifest.runtime, releaseId: 'other' } },
    {
      files: manifest.files.map((file) =>
        file.role === 'project' ? { ...file, sha256: 'f'.repeat(64) } : file,
      ),
    },
    {
      files: manifest.files.map((file) =>
        file.role === 'validation' ? { ...file, bytes: file.bytes + 1 } : file,
      ),
    },
  ])
    await expect(
      verifyStudioPythonPreviewManifest({ ...manifest, ...changes }, snapshot, report),
    ).rejects.toThrow()
  await expect(
    verifyStudioPythonPreviewManifest(manifest, snapshot, { ...report, execution: undefined }),
  ).rejects.toThrow()
  const pending = verifyStudioPythonPreviewManifest(manifest, snapshot, report)
  const first = manifest.files[0]
  if (!first) throw new Error('Fixture sem arquivo de projeto.')
  first.sha256 = 'f'.repeat(64)
  snapshot.projectId = 'changed'
  report.execution = undefined
  expect((await pending).projectId).toBe('game')
})
