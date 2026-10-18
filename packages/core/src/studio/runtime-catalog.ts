import { z } from 'zod'
import { canonicalJson, sha256Hex } from '../creations/content-fingerprint'
import {
  StudioCatalogIdSchema,
  StudioDependencyArtifactSchema,
  type StudioDependencyLock,
  StudioDependencyLockSchema,
  StudioDependencyResolutionsSchema,
  StudioExactVersionSchema,
  StudioProjectKindSchema,
  StudioProjectLanguageSchema,
  StudioProjectModeSchema,
  type StudioRuntimeSelection,
  StudioRuntimeSelectionSchema,
  StudioSha256Schema,
  studioPortableFileConflict,
} from './project-environment'

export const STUDIO_PROJECT_CAPABILITIES = [
  'edit',
  'execute',
  'pause',
  'publish',
  'export-source',
  'install-dependencies',
  'terminal',
  'python-repl',
  'assist',
] as const
export const StudioProjectCapabilitySchema = z.enum(STUDIO_PROJECT_CAPABILITIES)
export type StudioProjectCapability = z.infer<typeof StudioProjectCapabilitySchema>
export const StudioBrowserFeatureSchema = z.enum(['wasm', 'worker', 'jspi', 'trusted-types'])
export type StudioBrowserFeature = z.infer<typeof StudioBrowserFeatureSchema>

const extensionSchema = z.strictObject({
  id: StudioCatalogIdSchema,
  versions: z.array(StudioExactVersionSchema).min(1).max(64),
})

/** Contains only portable data. No executable URL or runtime import enters the catalog. */
export const StudioRuntimeManifestSchema = z
  .strictObject({
    manifestVersion: z.literal(1),
    profileId: StudioCatalogIdSchema,
    releaseId: StudioCatalogIdSchema,
    programmingLanguage: StudioProjectLanguageSchema,
    kinds: z.array(StudioProjectKindSchema).min(1).max(2),
    modes: z.array(StudioProjectModeSchema).min(1).max(3),
    capabilities: z
      .array(StudioProjectCapabilitySchema)
      .min(1)
      .max(STUDIO_PROJECT_CAPABILITIES.length),
    extensions: z.array(extensionSchema).max(256),
    sourceTargets: z
      .array(z.enum(['browser', 'desktop']))
      .min(1)
      .max(2),
    requiredBrowserFeatures: z.array(StudioBrowserFeatureSchema).max(4),
    artifacts: z.array(StudioDependencyArtifactSchema).min(1).max(512),
    python: z
      .strictObject({
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        packages: StudioDependencyResolutionsSchema,
      })
      .optional(),
  })
  .superRefine((manifest, context) => {
    if ((manifest.programmingLanguage === 'python') !== (manifest.python !== undefined))
      context.addIssue({
        code: 'custom',
        path: ['python'],
        message: 'A configuração Python precisa corresponder à linguagem.',
      })
    for (const key of [
      'kinds',
      'modes',
      'capabilities',
      'sourceTargets',
      'requiredBrowserFeatures',
    ] as const) {
      if (new Set(manifest[key]).size !== manifest[key].length)
        context.addIssue({ code: 'custom', path: [key], message: 'Há itens repetidos.' })
    }
    if (
      new Set(manifest.extensions.map((extension) => extension.id)).size !==
      manifest.extensions.length
    )
      context.addIssue({ code: 'custom', path: ['extensions'], message: 'Há extensões repetidas.' })
    for (const [index, extension] of manifest.extensions.entries()) {
      if (new Set(extension.versions).size !== extension.versions.length)
        context.addIssue({
          code: 'custom',
          path: ['extensions', index, 'versions'],
          message: 'Há versões repetidas.',
        })
    }
    if (studioPortableFileConflict(manifest.artifacts.map((artifact) => artifact.path)))
      context.addIssue({
        code: 'custom',
        path: ['artifacts'],
        message: 'Há caminhos conflitantes.',
      })
    const artifacts = new Map(
      manifest.artifacts.map((artifact) => [artifact.path, artifact.sha256]),
    )
    for (const item of manifest.python?.packages ?? []) {
      for (const artifact of item.artifacts) {
        if (artifacts.get(artifact.path) !== artifact.sha256)
          context.addIssue({
            code: 'custom',
            path: ['python', 'packages'],
            message: 'A distribuição referencia um artefato ausente ou diferente da release.',
          })
      }
    }
  })
export type StudioRuntimeManifest = z.infer<typeof StudioRuntimeManifestSchema>

export const StudioRuntimeReleaseSchema = z
  .strictObject({
    ...StudioRuntimeSelectionSchema.shape,
    manifest: StudioRuntimeManifestSchema,
  })
  .superRefine((release, context) => {
    for (const key of ['profileId', 'releaseId'] as const) {
      if (release[key] !== release.manifest[key])
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'A identidade não corresponde ao manifesto.',
        })
    }
  })

type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export type StudioRuntimeRelease = DeepReadonly<z.infer<typeof StudioRuntimeReleaseSchema>>

export const StudioRuntimeProfileSchema = z
  .strictObject({
    id: StudioCatalogIdSchema,
    languages: z.array(StudioProjectLanguageSchema).min(1).max(2),
    kinds: z.array(StudioProjectKindSchema).min(1).max(2),
    modes: z.array(StudioProjectModeSchema).min(1).max(3),
    /** Authoring levels accepted by this profile, independent of execution permissions. */
    levels: z.array(StudioCatalogIdSchema).max(64),
    releases: z
      .array(z.strictObject({ id: StudioCatalogIdSchema, manifestSha256: StudioSha256Schema }))
      .max(128),
  })
  .superRefine((profile, context) => {
    for (const key of ['languages', 'kinds', 'modes', 'levels'] as const) {
      if (new Set(profile[key]).size !== profile[key].length)
        context.addIssue({ code: 'custom', path: [key], message: 'Há itens repetidos.' })
    }
    if (new Set(profile.releases.map((release) => release.id)).size !== profile.releases.length)
      context.addIssue({ code: 'custom', path: ['releases'], message: 'Há releases repetidas.' })
  })
export type StudioRuntimeProfile = DeepReadonly<z.infer<typeof StudioRuntimeProfileSchema>>

/** Operational policy is kept outside the hashed release, so history stays immutable. */
export const StudioRuntimeReleaseStatusSchema = z.enum(['active', 'retired', 'revoked'])
export type StudioRuntimeReleaseStatus = z.infer<typeof StudioRuntimeReleaseStatusSchema>

function freezeData<T extends object>(data: T): DeepReadonly<T> {
  for (const value of Object.values(data)) {
    if (value !== null && typeof value === 'object') freezeData(value)
  }
  return Object.freeze(data) as DeepReadonly<T>
}

/** For trusted release assembly only; computing a digest does not approve a release. */
export async function createStudioRuntimeRelease(
  manifest: DeepReadonly<StudioRuntimeManifest>,
): Promise<StudioRuntimeRelease> {
  const parsed = StudioRuntimeManifestSchema.parse(manifest)
  return freezeData({
    profileId: parsed.profileId,
    releaseId: parsed.releaseId,
    manifestSha256: await sha256Hex(canonicalJson(parsed)),
    manifest: parsed,
  })
}

export interface StudioRuntimeCatalog {
  readonly profiles: readonly StudioRuntimeProfile[]
  readonly releases: readonly StudioRuntimeRelease[]
}

/** Select only from a host-verified catalog. Document data is an identity, never a loader URL. */
export function selectStudioRuntimeRelease(
  catalog: StudioRuntimeCatalog,
  selection: StudioRuntimeSelection,
): StudioRuntimeRelease | null {
  const parsed = StudioRuntimeSelectionSchema.safeParse(selection)
  if (!parsed.success) return null
  const { profileId, releaseId, manifestSha256 } = parsed.data
  const profile = catalog.profiles.find((item) => item.id === profileId)
  if (
    !profile?.releases.some(
      (item) => item.id === releaseId && item.manifestSha256 === manifestSha256,
    )
  )
    return null
  return (
    catalog.releases.find(
      (item) =>
        item.profileId === profileId &&
        item.releaseId === releaseId &&
        item.manifestSha256 === manifestSha256,
    ) ?? null
  )
}

/** Host-owned catalog only. A project's supplied catalog must never be used as authority. */
export async function createStudioRuntimeCatalog(input: {
  profiles: readonly StudioRuntimeProfile[]
  releases: readonly StudioRuntimeRelease[]
}): Promise<StudioRuntimeCatalog> {
  const profiles = z.array(StudioRuntimeProfileSchema).max(64).parse(input.profiles)
  const releases = z.array(StudioRuntimeReleaseSchema).max(1024).parse(input.releases)
  const profileIds = new Set(profiles.map((profile) => profile.id))
  const releaseIds = new Set(releases.map((release) => `${release.profileId}/${release.releaseId}`))
  if (profileIds.size !== profiles.length || releaseIds.size !== releases.length)
    throw new Error('O catálogo contém identidades repetidas.')
  for (const release of releases) {
    const profile = profiles.find((item) => item.id === release.profileId)
    const reference = profile?.releases.find((item) => item.id === release.releaseId)
    if (
      !profile ||
      !reference ||
      reference.manifestSha256 !== release.manifestSha256 ||
      !profile.languages.includes(release.manifest.programmingLanguage) ||
      release.manifest.kinds.some((kind) => !profile.kinds.includes(kind)) ||
      release.manifest.modes.some((mode) => !profile.modes.includes(mode))
    )
      throw new Error('A release não corresponde ao perfil aprovado.')
    if ((await sha256Hex(canonicalJson(release.manifest))) !== release.manifestSha256)
      throw new Error('O conteúdo da release não corresponde ao hash aprovado.')
  }
  for (const profile of profiles) {
    if (profile.releases.some((release) => !releaseIds.has(`${profile.id}/${release.id}`)))
      throw new Error('O perfil referencia uma release ausente.')
  }
  return freezeData({ profiles, releases })
}

/** Validate the exact browser resolution; no pip resolution or package downloads occur here. */
export function studioDependencyLockIssue(
  lock: StudioDependencyLock,
  release: StudioRuntimeRelease,
  requirementsSha256: string,
): string | null {
  const parsed = StudioDependencyLockSchema.safeParse(lock)
  if (!parsed.success || !StudioSha256Schema.safeParse(requirementsSha256).success)
    return 'invalid-dependency-lock'
  const value = parsed.data
  const runtime = release.manifest.python
  if (
    !runtime ||
    value.pythonVersion !== runtime.version ||
    value.runtimeManifestSha256 !== release.manifestSha256
  )
    return 'dependency-runtime-mismatch'
  if (value.requirementsSha256 !== requirementsSha256) return 'dependency-requirements-mismatch'
  for (const dependency of value.packages) {
    const approved = runtime.packages.find((item) => item.distribution === dependency.distribution)
    if (!approved || canonicalJson(approved) !== canonicalJson(dependency))
      return 'dependency-not-approved'
  }
  return null
}
