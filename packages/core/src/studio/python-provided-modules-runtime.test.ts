import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { currentPythonDeployment } from '../../tests/fixtures/python-provided-release'
import { canonicalJson } from '../creations/content-fingerprint'
import { buildPythonProvidedModuleMetadata } from './python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from './python-provided-modules-sz-audio'
import {
  StudioPythonDistributionSchema,
  StudioPythonRuntimeConfigurationSchema,
  verifyStudioPythonDeployment,
} from './python-runtime-distribution'
import type { StudioPythonRuntimeFeature } from './python-runtime-features'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
  StudioRuntimeManifestSchema,
} from './runtime-catalog'

const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
test('current Python metadata is explicit, validated and bound to distribution and release', async () => {
  const original = await currentPythonDeployment()
  const features: StudioPythonRuntimeFeature[] = ['turtle-compound-shapes']
  const distribution = StudioPythonDistributionSchema.parse({ ...original.distribution, features })
  const release = await createStudioRuntimeRelease({
    ...original.release.manifest,
    python: { ...original.release.manifest.python!, features },
  })
  const changed = await verifyStudioPythonDeployment({ release, distribution })
  expect(changed.distribution.features).toEqual(features)
  expect(Object.isFrozen(changed.distribution.features)).toBe(true)
  expect(changed.release.manifestSha256).not.toBe(original.release.manifestSha256)
  await expect(
    verifyStudioPythonDeployment({ release, distribution: original.distribution }),
  ).rejects.toThrow('recursos')
  await expect(
    verifyStudioPythonDeployment({ release: original.release, distribution }),
  ).rejects.toThrow('recursos')
  for (const features of [
    undefined,
    null,
    ['unknown'],
    ['turtle-compound-shapes', 'turtle-compound-shapes'],
    'turtle-compound-shapes',
  ]) {
    expect(
      StudioPythonDistributionSchema.safeParse({ ...original.distribution, features }).success,
    ).toBe(false)
    expect(
      StudioRuntimeManifestSchema.safeParse({
        ...original.release.manifest,
        python: { ...original.release.manifest.python!, features },
      }).success,
    ).toBe(false)
  }
  for (const providedModules of [undefined, null, 'sz_audio']) {
    expect(
      StudioPythonDistributionSchema.safeParse({ ...original.distribution, providedModules })
        .success,
    ).toBe(false)
    expect(
      StudioRuntimeManifestSchema.safeParse({
        ...original.release.manifest,
        python: { ...original.release.manifest.python!, providedModules },
      }).success,
    ).toBe(false)
  }
  for (const field of ['features', 'providedModules'] as const) {
    const distribution = { ...original.distribution }
    Reflect.deleteProperty(distribution, field)
    expect(StudioPythonDistributionSchema.safeParse(distribution).success).toBe(false)
    const python = { ...original.release.manifest.python! }
    Reflect.deleteProperty(python, field)
    expect(
      StudioRuntimeManifestSchema.safeParse({ ...original.release.manifest, python }).success,
    ).toBe(false)
  }
})

test('the current distribution requires preview host audio v1 without defaults', async () => {
  const original = await currentPythonDeployment()
  expect(original.distribution.previewHostAudioVersion).toBe(1)
  for (const previewHostAudioVersion of [undefined, null, 0, 2, '1', true])
    expect(
      StudioPythonDistributionSchema.safeParse({
        ...original.distribution,
        previewHostAudioVersion,
      }).success,
    ).toBe(false)
  const missing = { ...original.distribution }
  Reflect.deleteProperty(missing, 'previewHostAudioVersion')
  expect(StudioPythonDistributionSchema.safeParse(missing).success).toBe(false)
})

function catalogFor(release: Awaited<ReturnType<typeof createStudioRuntimeRelease>>) {
  return {
    profiles: [
      {
        id: release.profileId,
        languages: ['python'] as const,
        kinds: release.manifest.kinds,
        modes: release.manifest.modes,
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
    releases: [release],
  }
}

async function withAudio() {
  const original = await currentPythonDeployment()
  const metadata = await buildPythonProvidedModuleMetadata(SZ_AUDIO_MODULE_DESCRIPTOR)
  const module = {
    descriptor: metadata.descriptor,
    descriptorArtifact: {
      path: metadata.descriptorFile.path,
      sha256: metadata.descriptorFile.sha256,
    },
    typingArtifact: { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 },
    browserArtifacts: [
      { ...original.release.manifest.artifacts.find((file) => file.path === 'worker.mjs')! },
    ],
  }
  const additionalFiles = [metadata.descriptorFile, metadata.typingFile].map(
    ({ path, sha256, text }) => ({ path, sha256, bytes: Buffer.byteLength(text) }),
  )
  const manifest = {
    ...original.release.manifest,
    releaseId: 'provided-modules-test',
    python: { ...original.release.manifest.python!, providedModules: [module] },
    artifacts: [
      ...original.release.manifest.artifacts,
      ...additionalFiles.map(({ path, sha256 }) => ({ path, sha256 })),
    ],
  }
  const distribution = {
    ...original.distribution,
    files: [...original.distribution.files, ...additionalFiles],
    providedModules: [module],
  }
  return { manifest, distribution, module }
}

test('current inert metadata has canonical hashes and remains unchanged after verification', async () => {
  const input = await currentPythonDeployment()
  const configuration = StudioPythonRuntimeConfigurationSchema.parse({
    version: 1,
    parentOrigins: ['https://inert.example'],
    deployments: [{ status: 'active', deployment: input }],
  })
  const deployment = await verifyStudioPythonDeployment(configuration.deployments[0]!.deployment)
  expect(deployment.release.manifestSha256).toBe(hash(input.release.manifest))
  expect(deployment.distributionSha256).toBe(hash(input.distribution))
  expect(deployment.markerSha256).toBe(hash(JSON.parse(deployment.marker)))
  expect(deployment.release.manifest.python!.providedModules).toEqual([])
  expect(deployment.distribution.providedModules).toEqual([])
  expect(canonicalJson(deployment.distribution)).toBe(canonicalJson(input.distribution))
  const catalog = await createStudioRuntimeCatalog(catalogFor(deployment.release))
  expect(canonicalJson(catalog.releases[0])).toBe(canonicalJson(input.release))
})

test('a new release binds descriptor and stub bytes without granting catalog availability', async () => {
  const { manifest, distribution, module } = await withAudio()
  const release = await createStudioRuntimeRelease(manifest)
  const deployment = await verifyStudioPythonDeployment({ release, distribution })
  expect(deployment.release.manifest.python!.providedModules).toEqual([module])
  expect(deployment.distribution.providedModules).toEqual([module])
  expect(deployment.release.manifestSha256).not.toBe(
    (await currentPythonDeployment()).release.manifestSha256,
  )
  expect(deployment.distributionSha256).not.toBe(
    hash((await currentPythonDeployment()).distribution),
  )
  expect(
    Object.isFrozen(deployment.distribution.providedModules![0]!.descriptor.audio.policy),
  ).toBe(true)
  const catalog = await createStudioRuntimeCatalog(catalogFor(release))
  expect(catalog.releases[0]!.manifest.python!.providedModules).toEqual([module])
  expect((await currentPythonDeployment()).release.manifest.python).toEqual({
    version: '3.14.2',
    packages: [],
    providedModules: [],
    features: [],
  })
})

test('JavaScript manifests remain unchanged and cannot carry a Python module claim', async () => {
  const manifest = {
    ...(await currentPythonDeployment()).release.manifest,
    programmingLanguage: 'javascript' as const,
    python: undefined,
  }
  const release = await createStudioRuntimeRelease(manifest)
  expect(release.manifestSha256).toBe(hash(manifest))
  expect(canonicalJson(release.manifest)).toBe(canonicalJson(manifest))
  const { module } = await withAudio()
  expect(
    StudioRuntimeManifestSchema.safeParse({
      ...manifest,
      python: { version: '3.14.2', packages: [], providedModules: [module], features: [] },
    }).success,
  ).toBe(false)
})

test('synchronous schemas reject module references missing from release or distribution', async () => {
  const { manifest, distribution, module } = await withAudio()
  for (const path of [module.descriptorArtifact.path, module.typingArtifact.path, 'worker.mjs']) {
    expect(
      StudioRuntimeManifestSchema.safeParse({
        ...manifest,
        artifacts: manifest.artifacts.filter((file) => file.path !== path),
      }).success,
    ).toBe(false)
    expect(
      StudioPythonDistributionSchema.safeParse({
        ...distribution,
        files: distribution.files.filter((file) => file.path !== path),
      }).success,
    ).toBe(false)
  }
  const wrong = { ...module, browserArtifacts: [{ path: 'worker.mjs', sha256: '0'.repeat(64) }] }
  expect(
    StudioRuntimeManifestSchema.safeParse({
      ...manifest,
      python: { ...manifest.python, providedModules: [wrong] },
    }).success,
  ).toBe(false)
  expect(
    StudioPythonDistributionSchema.safeParse({ ...distribution, providedModules: [wrong] }).success,
  ).toBe(false)
})

test('a self-hashed release cannot substitute descriptor content behind an approved artifact reference', async () => {
  const { manifest, module } = await withAudio()
  const badManifest = {
    ...manifest,
    python: {
      ...manifest.python,
      providedModules: [
        { ...module, descriptor: { ...module.descriptor, summary: 'Forged API description' } },
      ],
    },
  }
  await expect(createStudioRuntimeRelease(badManifest)).rejects.toThrow('descriptor')
  const forgedRelease = {
    profileId: badManifest.profileId,
    releaseId: badManifest.releaseId,
    manifestSha256: hash(badManifest),
    manifest: badManifest,
  }
  await expect(createStudioRuntimeCatalog(catalogFor(forgedRelease))).rejects.toThrow('descriptor')
})

test('forging stub hashes in both references and artifact list still fails generated-byte verification', async () => {
  const { manifest, module } = await withAudio()
  const forgedTyping = { ...module.typingArtifact, sha256: 'f'.repeat(64) }
  const forgedManifest = {
    ...manifest,
    artifacts: manifest.artifacts.map((file) =>
      file.path === forgedTyping.path ? forgedTyping : file,
    ),
    python: { ...manifest.python, providedModules: [{ ...module, typingArtifact: forgedTyping }] },
  }
  expect(StudioRuntimeManifestSchema.safeParse(forgedManifest).success).toBe(true)
  await expect(createStudioRuntimeRelease(forgedManifest)).rejects.toThrow('tipagem')
  await expect(
    createStudioRuntimeCatalog(
      catalogFor({
        profileId: manifest.profileId,
        releaseId: manifest.releaseId,
        manifestSha256: hash(forgedManifest),
        manifest: forgedManifest,
      }),
    ),
  ).rejects.toThrow('tipagem')
})

test('deployment module selections must agree exactly and missing arrays are invalid', async () => {
  const { manifest, distribution } = await withAudio()
  const release = await createStudioRuntimeRelease(manifest)
  await expect(
    verifyStudioPythonDeployment({
      release,
      distribution: { ...distribution, providedModules: [] },
    }),
  ).rejects.toThrow('módulos')
  for (const providedModules of [undefined, null])
    await expect(
      verifyStudioPythonDeployment({ release, distribution: { ...distribution, providedModules } }),
    ).rejects.toThrow()
  const empty = await currentPythonDeployment()
  await expect(
    verifyStudioPythonDeployment({ release: empty.release, distribution }),
  ).rejects.toThrow('módulos')
  expect(await verifyStudioPythonDeployment(empty)).toBeDefined()
})

test('individually valid versions cannot be substituted between a release and its distribution', async () => {
  const { manifest, distribution, module } = await withAudio()
  const next = await buildPythonProvidedModuleMetadata({ ...module.descriptor, version: '1.0.1' })
  const nextFiles = [next.descriptorFile, next.typingFile].map(({ path, sha256, text }) => ({
    path,
    sha256,
    bytes: Buffer.byteLength(text),
  }))
  const nextModule = {
    descriptor: next.descriptor,
    descriptorArtifact: { path: next.descriptorFile.path, sha256: next.descriptorFile.sha256 },
    typingArtifact: { path: next.typingFile.path, sha256: next.typingFile.sha256 },
    browserArtifacts: module.browserArtifacts,
  }
  // Both versions' files are present and individually valid: only the module selection differs.
  const release = await createStudioRuntimeRelease({
    ...manifest,
    artifacts: [...manifest.artifacts, ...nextFiles.map(({ path, sha256 }) => ({ path, sha256 }))],
  })
  const changed = {
    ...distribution,
    files: [...distribution.files, ...nextFiles],
    providedModules: [nextModule],
  }
  expect(StudioPythonDistributionSchema.safeParse(changed).success).toBe(true)
  await expect(verifyStudioPythonDeployment({ release, distribution: changed })).rejects.toThrow(
    'módulos',
  )
})

test('metadata cannot claim a second version or mutate a pending release verification', async () => {
  const { manifest, distribution, module } = await withAudio()
  for (const providedModules of [[module, module], null]) {
    expect(
      StudioRuntimeManifestSchema.safeParse({
        ...manifest,
        python: { ...manifest.python, providedModules },
      }).success,
    ).toBe(false)
    expect(
      StudioPythonDistributionSchema.safeParse({ ...distribution, providedModules }).success,
    ).toBe(false)
  }
  const pending = createStudioRuntimeRelease(manifest)
  module.browserArtifacts[0]!.sha256 = 'd'.repeat(64)
  manifest.python.providedModules.length = 0
  const captured = await pending
  expect(captured.manifest.python!.providedModules).toHaveLength(1)
  expect(captured.manifest.python!.providedModules![0]!.browserArtifacts[0]!.sha256).not.toBe(
    'd'.repeat(64),
  )
})

test('catalog and deployment verification snapshot module selections before yielding', async () => {
  const { manifest, distribution, module } = await withAudio()
  const approved = await createStudioRuntimeRelease(manifest)
  const candidate = { ...approved, manifest }
  const catalogPending = createStudioRuntimeCatalog(catalogFor(candidate))
  const deploymentPending = verifyStudioPythonDeployment({ release: candidate, distribution })
  module.browserArtifacts[0]!.sha256 = 'e'.repeat(64)
  manifest.python.providedModules = []
  distribution.providedModules = []
  const catalog = await catalogPending
  const deployment = await deploymentPending
  expect(catalog.releases[0]!.manifest.python!.providedModules).toEqual(
    approved.manifest.python!.providedModules,
  )
  expect(deployment.distribution.providedModules).toEqual(approved.manifest.python!.providedModules)
  expect(deployment.release.manifestSha256).toBe(approved.manifestSha256)
})
