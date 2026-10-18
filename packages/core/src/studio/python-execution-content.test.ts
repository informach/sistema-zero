import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '../creations/content-fingerprint'
import {
  StudioPythonExecutionContentSchema,
  StudioPythonExecutionMetadataSchema,
  StudioPythonWebPayloadSchema,
  studioPythonExecutionRevision,
  verifyStudioPythonWebPayload,
} from './python-execution-content'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from './python-material-policy'

function content() {
  return {
    version: 1 as const,
    configuration: {
      runtime: {
        profileId: 'python-browser',
        releaseId: '2026-10-17',
        manifestSha256: 'a'.repeat(64),
      },
      extensions: [{ id: 'turtle', version: '1.0.0' }],
      python: {
        entrypoint: 'src/main.py',
        dependencyLock: {
          lockVersion: 1 as const,
          target: 'browser' as const,
          pythonVersion: '3.14.2',
          runtimeManifestSha256: 'a'.repeat(64),
          requirementsSha256: 'b'.repeat(64),
          packages: [],
        },
      },
    },
    directories: ['src'],
    files: [
      { path: 'src/main.py', kind: 'source' as const, sha256: 'c'.repeat(64), byteLength: 32 },
    ],
  }
}

test('execution revision preserves the original canonical content recipe and detaches before awaiting', async () => {
  const raw = content()
  const expected = await sha256Hex(canonicalJson(raw))
  const pending = studioPythonExecutionRevision(raw)
  raw.files[0]!.sha256 = 'd'.repeat(64)
  raw.configuration.python.entrypoint = 'changed.py'
  expect(await pending).toBe(expected)
  expect(await studioPythonExecutionRevision(content())).toBe(expected)
  const changed = content()
  changed.configuration.extensions = []
  expect(await studioPythonExecutionRevision(changed)).not.toBe(expected)
})

test('extended metadata retains all tree, quota, runtime-lock and entrypoint refinements', () => {
  const invalid = [
    (value: ReturnType<typeof content>) => {
      value.configuration.python.dependencyLock.runtimeManifestSha256 = 'f'.repeat(64)
    },
    (value: ReturnType<typeof content>) => {
      value.configuration.extensions.push({ ...value.configuration.extensions[0]! })
    },
    (value: ReturnType<typeof content>) => {
      value.directories.push('src')
    },
    (value: ReturnType<typeof content>) => {
      value.files.push({ ...value.files[0]!, path: 'SRC/other.py' })
    },
    (value: ReturnType<typeof content>) => {
      value.files.push({ ...value.files[0]! })
    },
    (value: ReturnType<typeof content>) => {
      value.files[0]!.path = 'src'
    },
    (value: ReturnType<typeof content>) => {
      value.files[0]!.path = '../main.py'
    },
    (value: ReturnType<typeof content>) => {
      value.configuration.python.entrypoint = 'missing.py'
    },
    (value: ReturnType<typeof content>) => {
      value.files[0]!.byteLength = STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes
      value.files.push({ ...value.files[0]!, path: 'other.py', byteLength: 1 })
    },
  ]
  for (const mutate of invalid) {
    const value = content()
    mutate(value)
    expect(StudioPythonExecutionContentSchema.safeParse(value).success).toBe(false)
    expect(
      StudioPythonExecutionMetadataSchema.safeParse({
        ...value,
        projectId: 'game',
        revision: 'e'.repeat(64),
      }).success,
    ).toBe(false)
  }
  expect(
    StudioPythonExecutionMetadataSchema.safeParse({
      ...content(),
      projectId: 'game',
      revision: 'e'.repeat(64),
    }).success,
  ).toBe(true)
})

test('web payload checks its digest, rejects injected authority and returns a detached snapshot', async () => {
  const value = content()
  const payload = {
    version: 1,
    name: 'Meu jogo 🐢',
    snapshot: { ...value, projectId: 'game', revision: await studioPythonExecutionRevision(value) },
  }
  const pending = verifyStudioPythonWebPayload(payload)
  payload.snapshot.files[0]!.byteLength = 99
  payload.name = 'changed'
  const verified = await pending
  expect(verified.name).toBe('Meu jogo 🐢')
  expect(verified.snapshot.files[0]!.byteLength).toBe(32)
  await expect(verifyStudioPythonWebPayload(payload)).rejects.toThrow('revisão')
  await expect(
    verifyStudioPythonWebPayload({ ...verified, runtimeURL: 'https://attacker.test/' }),
  ).rejects.toThrow()
  await expect(
    verifyStudioPythonWebPayload({ ...verified, snapshot: { ...verified.snapshot, grant: true } }),
  ).rejects.toThrow()
  await expect(
    verifyStudioPythonWebPayload({
      ...verified,
      snapshot: { ...verified.snapshot, revision: '0'.repeat(64) },
    }),
  ).rejects.toThrow('revisão')
})

test('web payload preserves every project name permitted by the document contract', async () => {
  const value = content()
  const snapshot = {
    ...value,
    projectId: 'game',
    revision: await studioPythonExecutionRevision(value),
  }
  for (const name of ['', 'x'.repeat(121), 'x'.repeat(200)]) {
    expect((await verifyStudioPythonWebPayload({ version: 1, name, snapshot })).name).toBe(name)
  }
  expect(
    StudioPythonWebPayloadSchema.safeParse({ version: 1, name: 'x'.repeat(201), snapshot }).success,
  ).toBe(false)
})
