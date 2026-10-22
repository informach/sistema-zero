import { expect, test } from 'bun:test'
import {
  currentPythonRelease,
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

test('mandatory policy requires the exact verified release, including an empty module profile', async () => {
  const release = await currentPythonRelease()
  const runtime = selection(release)
  expect(await createPythonBuilderPolicyResult({ runtimeRelease: release }, runtime)).toEqual({
    runtimeRelease: release,
  })
  for (const raw of [undefined, null, [], {}, { providedModules: [] }])
    await expect(createPythonBuilderPolicyResult(raw, runtime)).rejects.toThrow()
  const links = {
    revisionHash: 'a'.repeat(64),
    executionRevision: 'b'.repeat(64),
    parentOrigin: 'https://kids.test',
  }
  expect(StudioPythonBuilderAuthorizationSchema.safeParse(links).success).toBe(false)
  expect(StudioPythonBuilderAuthorizationSchema.safeParse({ ...links, policy: {} }).success).toBe(
    false,
  )
  expect(
    StudioPythonBuilderAuthorizationSchema.parse({ ...links, policy: { runtimeRelease: release } }),
  ).toEqual({
    ...links,
    policy: { runtimeRelease: StudioRuntimeReleaseSchema.parse(release) },
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
  expect(verified.runtimeRelease.manifest.python?.providedModules).toHaveLength(1)
  expect(Object.isFrozen(verified.runtimeRelease.manifest.python?.providedModules)).toBe(true)
  const empty = await createStudioRuntimeRelease({
    ...release.manifest,
    python: { ...release.manifest.python!, providedModules: [] },
  })
  expect(
    (await createPythonBuilderPolicyResult({ runtimeRelease: empty }, selection(empty)))
      .runtimeRelease,
  ).toEqual(empty)
})

test('forged bytes, wrong selection and omitted module metadata are rejected', async () => {
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
  const incomplete = structuredClone(release)
  Reflect.deleteProperty(incomplete.manifest.python!, 'providedModules')
  await expect(
    createPythonBuilderPolicyResult({ runtimeRelease: incomplete }, selection(release)),
  ).rejects.toThrow()
})

test('one attempt never accepts an absent or different release', async () => {
  const release = await providedPythonRelease()
  const configured = pythonBuilderPolicyFence(selection(release))
  await configured({ runtimeRelease: release })
  await expect(configured({})).rejects.toThrow()
  expect(await configured({ runtimeRelease: release })).toEqual({ runtimeRelease: release })
  await expect(configured({ runtimeRelease: await currentPythonRelease() })).rejects.toThrow()
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
