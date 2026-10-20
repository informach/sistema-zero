import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { canonicalJson } from '../creations/content-fingerprint'
import { buildPythonProvidedModuleMetadata } from './python-provided-modules-render'
import { SZ_AUDIO_MODULE_DESCRIPTOR } from './python-provided-modules-sz-audio'
import {
  StudioPythonDistributionSchema,
  StudioPythonRuntimeConfigurationSchema,
  verifyStudioPythonDeployment,
} from './python-runtime-distribution'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
  StudioRuntimeManifestSchema,
} from './runtime-catalog'

const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex')
// Public metadata captured from the approved staging plan. No payload/runtime binaries or secrets.
const legacy = JSON.parse(
  readFileSync(
    new URL('../../tests/fixtures/python-runtime-legacy-2026-10-19.json', import.meta.url),
    'utf8',
  ),
)
const legacyConfigurationHash = '40ce822aab07184da90bec7a0902296d4889c011740063be6c859bc5b60c57b2'
const legacyReleaseHash = '56204780388c78e8ecf978da984eca182ed4ac958e78c63a22ac286210ab7880'
const legacyDistributionHash = '996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7'

function historical() {
  return StudioPythonRuntimeConfigurationSchema.parse(legacy).deployments[0]!.deployment
}

test('preview host audio declaration is optional for history and bound into canonical distribution marker', async () => {
  const original = historical()
  expect(Object.hasOwn(original.distribution, 'previewHostAudioVersion')).toBe(false)
  // Metadata-only mutation proves hashing, not that historical launcher bytes support this feature.
  const declared = StudioPythonDistributionSchema.parse({
    ...original.distribution,
    previewHostAudioVersion: 1,
  })
  expect(declared.previewHostAudioVersion).toBe(1)
  const old = await verifyStudioPythonDeployment(original)
  const changed = await verifyStudioPythonDeployment({ ...original, distribution: declared })
  expect(changed.distributionSha256).not.toBe(old.distributionSha256)
  expect(changed.markerSha256).not.toBe(old.markerSha256)
  for (const previewHostAudioVersion of [0, 2, '1', true])
    expect(
      StudioPythonDistributionSchema.safeParse({
        ...original.distribution,
        previewHostAudioVersion,
      }).success,
    ).toBe(false)
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
  const original = historical()
  const metadata = await buildPythonProvidedModuleMetadata(SZ_AUDIO_MODULE_DESCRIPTOR)
  const module = {
    descriptor: metadata.descriptor,
    descriptorArtifact: {
      path: metadata.descriptorFile.path,
      sha256: metadata.descriptorFile.sha256,
    },
    typingArtifact: { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 },
    browserArtifacts: [
      original.release.manifest.artifacts.find((file) => file.path === 'worker.mjs')!,
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

test('historical Python release/distribution/configuration preserve canonical bytes and absence', async () => {
  const configuration = StudioPythonRuntimeConfigurationSchema.parse(legacy)
  expect(Buffer.byteLength(canonicalJson(configuration))).toBe(12857)
  expect(hash(configuration)).toBe(legacyConfigurationHash)
  const input = configuration.deployments[0]!.deployment
  const deployment = await verifyStudioPythonDeployment(input)
  expect(deployment.release.manifestSha256).toBe(legacyReleaseHash)
  expect(deployment.distributionSha256).toBe(legacyDistributionHash)
  expect(deployment.markerSha256).toBe(
    'cdc273d6876f545454460d7e316859f5994389e765bf08595355c13c962cebe2',
  )
  expect(Object.hasOwn(deployment.release.manifest.python!, 'providedModules')).toBe(false)
  expect(Object.hasOwn(deployment.distribution, 'providedModules')).toBe(false)
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
  expect(deployment.release.manifestSha256).not.toBe(legacyReleaseHash)
  expect(deployment.distributionSha256).not.toBe(legacyDistributionHash)
  expect(
    Object.isFrozen(deployment.distribution.providedModules![0]!.descriptor.audio.policy),
  ).toBe(true)
  const catalog = await createStudioRuntimeCatalog(catalogFor(release))
  expect(catalog.releases[0]!.manifest.python!.providedModules).toEqual([module])
  expect(historical().release.manifest.python).toEqual({ version: '3.14.2', packages: [] })
})

test('JavaScript manifests remain unchanged and cannot carry a Python module claim', async () => {
  const manifest = {
    ...historical().release.manifest,
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
      python: { version: '3.14.2', packages: [], providedModules: [module] },
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

test('deployment metadata must agree exactly including absent versus present-empty', async () => {
  const { manifest, distribution } = await withAudio()
  const release = await createStudioRuntimeRelease(manifest)
  for (const providedModules of [undefined, []])
    await expect(
      verifyStudioPythonDeployment({ release, distribution: { ...distribution, providedModules } }),
    ).rejects.toThrow('módulos')
  const original = historical()
  await expect(
    verifyStudioPythonDeployment({
      ...original,
      distribution: { ...original.distribution, providedModules: [] },
    }),
  ).rejects.toThrow('módulos')
  const emptyRelease = await createStudioRuntimeRelease({
    ...original.release.manifest,
    python: { ...original.release.manifest.python!, providedModules: [] },
  })
  await expect(
    verifyStudioPythonDeployment({ release: emptyRelease, distribution: original.distribution }),
  ).rejects.toThrow('módulos')
  expect(
    await verifyStudioPythonDeployment({
      release: emptyRelease,
      distribution: { ...original.distribution, providedModules: [] },
    }),
  ).toBeDefined()
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
