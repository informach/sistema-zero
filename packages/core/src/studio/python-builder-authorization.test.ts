import { expect, test } from 'bun:test'
import {
  legacyPythonRelease,
  providedPythonRelease,
} from '../../tests/fixtures/python-provided-release'
import {
  createPythonBuilderPolicyResult,
  pythonBuilderPolicyFence,
  StudioPythonBuilderAuthorizationSchema,
} from './python-builder-authorization'
import { createStudioRuntimeRelease, StudioRuntimeReleaseSchema } from './runtime-catalog'

const selection = (release: Awaited<ReturnType<typeof providedPythonRelease>>) => ({
  profileId: release.profileId,
  releaseId: release.releaseId,
  manifestSha256: release.manifestSha256,
})

test('mandatory policy distinguishes verified legacy absence from unavailable or old responses', async () => {
  const runtime = selection(legacyPythonRelease())
  expect(await createPythonBuilderPolicyResult({}, runtime)).toEqual({})
  for (const raw of [undefined, null, [], { providedModules: [] }])
    await expect(createPythonBuilderPolicyResult(raw, runtime)).rejects.toThrow()
  const links = {
    revisionHash: 'a'.repeat(64),
    executionRevision: 'b'.repeat(64),
    parentOrigin: 'https://kids.test',
  }
  expect(StudioPythonBuilderAuthorizationSchema.safeParse(links).success).toBe(false)
  expect(StudioPythonBuilderAuthorizationSchema.parse({ ...links, policy: {} })).toEqual({
    ...links,
    policy: {},
  })
})

test('exact release metadata is snapshotted before await; declared empty remains configured', async () => {
  const release = await providedPythonRelease()
  const raw = { runtimeRelease: StudioRuntimeReleaseSchema.parse(release) }
  const runtime = selection(release)
  const pending = createPythonBuilderPolicyResult(raw, runtime)
  raw.runtimeRelease.manifest.python!.providedModules = []
  runtime.manifestSha256 = '0'.repeat(64)
  const verified = await pending
  expect(verified.runtimeRelease?.manifest.python?.providedModules).toHaveLength(1)
  expect(Object.isFrozen(verified.runtimeRelease?.manifest.python?.providedModules)).toBe(true)
  const empty = await createStudioRuntimeRelease({
    ...release.manifest,
    python: { ...release.manifest.python!, providedModules: [] },
  })
  expect(
    (await createPythonBuilderPolicyResult({ runtimeRelease: empty }, selection(empty)))
      .runtimeRelease,
  ).toEqual(empty)
})

test('forged bytes, wrong selection and legacy release disguised as configured are rejected', async () => {
  const release = await providedPythonRelease()
  for (const field of ['profileId', 'releaseId', 'manifestSha256'] as const) {
    const wrong = {
      ...selection(release),
      [field]: field === 'manifestSha256' ? '0'.repeat(64) : 'different',
    }
    await expect(
      createPythonBuilderPolicyResult({ runtimeRelease: release }, wrong),
    ).rejects.toThrow()
  }
  const forged = {
    ...release,
    manifest: {
      ...release.manifest,
      python: {
        ...release.manifest.python!,
        providedModules: release.manifest.python!.providedModules!.map((module) => ({
          ...module,
          descriptor: { ...module.descriptor, summary: 'forged' },
        })),
      },
    },
  }
  await expect(
    createPythonBuilderPolicyResult({ runtimeRelease: forged }, selection(release)),
  ).rejects.toThrow()
  const legacy = legacyPythonRelease()
  await expect(
    createPythonBuilderPolicyResult({ runtimeRelease: legacy }, selection(legacy)),
  ).rejects.toThrow()
})

test('one attempt fences both metadata withdrawal and late introduction', async () => {
  const release = await providedPythonRelease()
  const configured = pythonBuilderPolicyFence(selection(release))
  await configured({ runtimeRelease: release })
  await expect(configured({})).rejects.toThrow('mudou')
  expect(await configured({ runtimeRelease: release })).toEqual({ runtimeRelease: release })
  const legacy = pythonBuilderPolicyFence(selection(release))
  await legacy({})
  await expect(legacy({ runtimeRelease: release })).rejects.toThrow('mudou')
})

test('a structurally valid release beyond the shared byte ceiling is refused', async () => {
  const provided = await providedPythonRelease()
  const release = await createStudioRuntimeRelease({
    ...provided.manifest,
    extensions: Array.from({ length: 256 }, (_, extension) => ({
      id: `fixture-${extension}`,
      versions: Array.from(
        { length: 64 },
        (_, version) => `1${'a'.repeat(59)}${String(version).padStart(4, '0')}`,
      ),
    })),
  })
  expect(StudioRuntimeReleaseSchema.safeParse(release).success).toBe(true)
  await expect(
    createPythonBuilderPolicyResult({ runtimeRelease: release }, selection(release)),
  ).rejects.toThrow('byte limit')
})
