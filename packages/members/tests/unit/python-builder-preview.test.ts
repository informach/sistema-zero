import { expect, test } from 'bun:test'
import { createStudioProRevision } from '@sistemazero/core/studio/pro-revision'
import {
  StudioPythonBuilderPreviewSchema,
  verifyStudioPythonBuilderPreview,
} from '@sistemazero/core/studio/python-builder-preview'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { controlledPythonBuilderReport } from '../fakes/python-builder-report'
import { authoringFixture } from '../fakes/studio-authoring-policy'

/** Controlled receipts for acceptance-boundary tests, not a claim of actual execution. */
async function fixture(excludedSource = false) {
  const { project } = await authoringFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Python Pro expected')
  if (excludedSource) {
    project.tree.venv = { kind: 'dir' }
    project.tree['venv/typed.py'] = { kind: 'file', content: 'n: int = "wrong type"\n' }
  }
  const { base, binaries } = await capturePythonProRevisionPayload(project)
  const { metadata: snapshot } = await prepareStudioPythonProExecution(base, binaries)
  const report = controlledPythonBuilderReport(snapshot)
  const now = Date.now(),
    scope = { now, serviceOrigin: 'https://python.test', parentOrigin: 'https://kids.test' }
  const preview = StudioPythonBuilderPreviewSchema.parse({
    kind: 'python',
    revisionHash: base.hash,
    reference: {
      kind: 'python-preview',
      version: 1,
      id: 'c'.repeat(64),
      projectId: base.projectId,
      revision: snapshot.revision,
      runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
      url: `https://python.test/v1/python-previews/${'c'.repeat(64)}/index.html`,
      sha256: 'd'.repeat(64),
      expiresAt: now + 60000,
    },
    validation: {
      profileVersion: 1,
      snapshot,
      report,
      types: {
        version: 1,
        revision: base.hash,
        executionRevision: snapshot.revision,
        status: 'passed',
        diagnostics: [],
      },
    },
  })
  return { base, binaries, preview, scope }
}

test('Python preview acceptance binds controlled receipts to actual candidate bytes and trusted origins', async () => {
  const f = await fixture()
  expect(f.base.hash).not.toBe(f.preview.reference.revision)
  const expected = structuredClone(f.preview)
  const pending = verifyStudioPythonBuilderPreview(f.preview, f.base, f.binaries, f.scope)
  f.preview.reference.url = 'https://attacker.test/player'
  f.preview.validation.snapshot.files[0]!.sha256 = 'e'.repeat(64)
  f.scope.serviceOrigin = 'https://attacker.test'
  expect(await pending).toEqual(expected)
})

test.each([
  'cas',
  'execution',
  'project',
  'runtime',
  'expired',
  'origin',
  'report-bytes',
  'metadata-bytes',
  'span',
] as const)('Python preview refuses mismatched %s', async (mode) => {
  const f = await fixture()
  if (mode === 'cas') f.preview.revisionHash = 'f'.repeat(64)
  else if (mode === 'execution') f.preview.reference.revision = 'f'.repeat(64)
  else if (mode === 'project') f.preview.reference.projectId = 'another'
  else if (mode === 'runtime') f.preview.reference.runtimeManifestSha256 = 'f'.repeat(64)
  else if (mode === 'expired') f.preview.reference.expiresAt = f.scope.now
  else if (mode === 'origin') f.scope.serviceOrigin = 'https://another.test'
  else if (mode === 'report-bytes')
    f.preview.validation.report.inspection.files[0]!.sha256 = 'f'.repeat(64)
  else if (mode === 'metadata-bytes')
    f.preview.validation.snapshot.files[0]!.sha256 = 'f'.repeat(64)
  const raw: unknown =
    mode === 'span'
      ? {
          ...f.preview,
          validation: {
            ...f.preview.validation,
            types: {
              ...f.preview.validation.types,
              diagnostics: [
                {
                  path: 'src/main.py',
                  start: 100000,
                  length: 1,
                  source: 'Pyright',
                  code: 'test',
                  message: 'test',
                  severity: 'warning',
                },
              ],
            },
          },
        }
      : f.preview
  const error = await verifyStudioPythonBuilderPreview(raw, f.base, f.binaries, f.scope).then(
    () => null,
    (reason: Error) => reason,
  )
  expect(error).toBeInstanceOf(Error)
})

test('internally consistent receipts cannot certify omitted analysis files', async () => {
  const f = await fixture(true)
  const error = await verifyStudioPythonBuilderPreview(f.preview, f.base, f.binaries, f.scope).then(
    () => null,
    (reason: Error) => reason,
  )
  expect(error).toBeInstanceOf(Error)
  expect(f.base.files['venv/typed.py']).toBe('n: int = "wrong type"\n')
})

test('valid receipts from a different source revision never certify the candidate', async () => {
  const f = await fixture()
  const changed = await createStudioProRevision({
    ...f.base,
    files: { ...f.base.files, 'src/main.py': 'print("changed")\n' },
  })
  const error = await verifyStudioPythonBuilderPreview(
    f.preview,
    changed,
    f.binaries,
    f.scope,
  ).then(
    () => null,
    (reason: Error) => reason,
  )
  expect(error).toBeInstanceOf(Error)
})
