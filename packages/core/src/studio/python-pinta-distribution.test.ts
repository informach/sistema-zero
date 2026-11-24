import { expect, test } from 'bun:test'
import { currentPythonDeployment } from '../../tests/fixtures/python-provided-release'
import {
  StudioPythonDistributionSchema,
  verifyStudioPythonDeployment,
} from './python-runtime-distribution'
import {
  PYTHON_PINTA_REGIONS_FEATURE,
  PYTHON_PINTA_SCENE_MODULE_MAX_BYTES,
  PYTHON_PINTA_SCENE_MODULE_PATHS,
} from './python-runtime-features'
import { createStudioRuntimeRelease } from './runtime-catalog'

test('Pinta capability requires all three bounded artifacts and cannot leak into a legacy distribution', async () => {
  const { distribution: legacy } = await currentPythonDeployment()
  const modules = Object.values(PYTHON_PINTA_SCENE_MODULE_PATHS).map((path) => ({
    path,
    bytes: 32,
    sha256: 'a'.repeat(64),
  }))
  const candidate = {
    ...legacy,
    features: [...legacy.features, PYTHON_PINTA_REGIONS_FEATURE],
    files: [...legacy.files, ...modules],
  }
  expect(StudioPythonDistributionSchema.safeParse(candidate).success).toBe(true)
  for (const module of modules) {
    expect(
      StudioPythonDistributionSchema.safeParse({
        ...candidate,
        files: candidate.files.filter((file) => file.path !== module.path),
      }).success,
    ).toBe(false)
    for (const bytes of [0, PYTHON_PINTA_SCENE_MODULE_MAX_BYTES + 1])
      expect(
        StudioPythonDistributionSchema.safeParse({
          ...candidate,
          files: candidate.files.map((file) =>
            file.path === module.path ? { ...file, bytes } : file,
          ),
        }).success,
      ).toBe(false)
    expect(
      StudioPythonDistributionSchema.safeParse({
        ...legacy,
        files: [...legacy.files, module],
      }).success,
    ).toBe(false)
  }
  expect(StudioPythonDistributionSchema.parse(legacy)).toEqual(legacy)
})

test('a release authorizes the exact Pinta module hashes, not just their names and capability', async () => {
  const original = await currentPythonDeployment()
  const files = [
    ...original.distribution.files,
    ...Object.values(PYTHON_PINTA_SCENE_MODULE_PATHS).map((path) => ({
      path,
      bytes: 32,
      sha256: 'a'.repeat(64),
    })),
  ]
  const features = [PYTHON_PINTA_REGIONS_FEATURE]
  const distribution = StudioPythonDistributionSchema.parse({
    ...original.distribution,
    features,
    files,
  })
  const release = await createStudioRuntimeRelease({
    ...original.release.manifest,
    artifacts: files.map(({ path, sha256 }) => ({ path, sha256 })),
    python: { ...original.release.manifest.python!, features },
  })
  await expect(verifyStudioPythonDeployment({ release, distribution })).resolves.toBeDefined()
  for (const path of Object.values(PYTHON_PINTA_SCENE_MODULE_PATHS))
    await expect(
      verifyStudioPythonDeployment({
        release,
        distribution: {
          ...distribution,
          files: files.map((file) =>
            file.path === path ? { ...file, sha256: 'b'.repeat(64) } : file,
          ),
        },
      }),
    ).rejects.toThrow()
  await expect(
    verifyStudioPythonDeployment({ release: original.release, distribution }),
  ).rejects.toThrow()
})
