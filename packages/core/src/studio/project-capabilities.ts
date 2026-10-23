import { z } from 'zod'
import {
  StudioCatalogIdSchema,
  StudioExactVersionSchema,
  StudioProjectEnvironmentSchema,
  StudioProjectKindSchema,
  type StudioProjectMode,
  StudioProjectModeSchema,
  studioModesForKind,
} from './project-environment'
import { StudioPythonLearningLevelSchema } from './python-learning'
import {
  STUDIO_PROJECT_CAPABILITIES,
  type StudioProjectCapability,
  StudioProjectCapabilitySchema,
  StudioRuntimeProfileSchema,
  StudioRuntimeReleaseSchema,
  StudioRuntimeReleaseStatusSchema,
} from './runtime-catalog'

export const StudioOperationAvailabilitySchema = z
  .strictObject({
    capability: StudioProjectCapabilitySchema,
    state: z.enum(['available', 'checking', 'unavailable']),
    reasonCode: StudioCatalogIdSchema.optional(),
  })
  .superRefine((operation, context) => {
    if (operation.state !== 'available' && !operation.reasonCode)
      context.addIssue({
        code: 'custom',
        path: ['reasonCode'],
        message: 'Informe o motivo da indisponibilidade.',
      })
  })
export type StudioOperationAvailability = z.infer<typeof StudioOperationAvailabilitySchema>

export const StudioProjectCurationSchema = z.strictObject({
  pythonLevel: StudioPythonLearningLevelSchema.optional(),
  level: StudioCatalogIdSchema.optional(),
  allowBlocks: z.array(z.string().min(1).max(128)).max(10000).optional(),
  allowCategories: z.array(z.string().min(1).max(128)).max(256).optional(),
  allowedModes: z.array(StudioProjectModeSchema).max(3).optional(),
  allowLevelReveal: z.boolean().optional(),
})
export type StudioProjectCuration = z.infer<typeof StudioProjectCurationSchema>

export const StudioProjectCapabilityInputSchema = z
  .strictObject({
    ...StudioProjectEnvironmentSchema.shape,
    kind: StudioProjectKindSchema,
    installedExtensions: z
      .array(
        z.strictObject({
          id: StudioCatalogIdSchema,
          version: StudioExactVersionSchema,
        }),
      )
      .max(256),
  })
  .superRefine((project, context) => {
    if (
      new Set(project.installedExtensions.map((item) => item.id)).size !==
      project.installedExtensions.length
    )
      context.addIssue({
        code: 'custom',
        path: ['installedExtensions'],
        message: 'Há extensões repetidas.',
      })
  })
export type StudioProjectCapabilityInput = z.infer<typeof StudioProjectCapabilityInputSchema>

export interface StudioCompatibilityIssue {
  code: string
  path: string
  message: string
}
export interface StudioResolvedCapabilities {
  /** Structural compatibility only: does not confer execution or authentication. */
  valid: boolean
  modes: readonly StudioProjectMode[]
  capabilities: readonly StudioProjectCapability[]
  operations: readonly StudioOperationAvailability[]
  extensionIds: readonly string[]
  issues: readonly StudioCompatibilityIssue[]
}

const inputSchema = z
  .strictObject({
    project: StudioProjectCapabilityInputSchema,
    profile: StudioRuntimeProfileSchema,
    release: StudioRuntimeReleaseSchema,
    releaseStatus: StudioRuntimeReleaseStatusSchema,
    hostOperations: z
      .array(StudioOperationAvailabilitySchema)
      .max(STUDIO_PROJECT_CAPABILITIES.length),
    grantedCapabilities: z
      .array(StudioProjectCapabilitySchema)
      .max(STUDIO_PROJECT_CAPABILITIES.length),
    grantedExtensionIds: z.array(StudioCatalogIdSchema).max(256),
    curation: StudioProjectCurationSchema.nullable(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.hostOperations.map((item) => item.capability)).size !==
      input.hostOperations.length
    )
      context.addIssue({
        code: 'custom',
        path: ['hostOperations'],
        message: 'Há operações conflitantes.',
      })
  })

/** Readonly inputs allow a verified, frozen catalog to be shared by all hosts. */
export interface StudioCapabilityResolutionInput {
  project: StudioProjectCapabilityInput
  profile: import('./runtime-catalog').StudioRuntimeProfile
  release: import('./runtime-catalog').StudioRuntimeRelease
  releaseStatus: import('./runtime-catalog').StudioRuntimeReleaseStatus
  hostOperations: readonly StudioOperationAvailability[]
  grantedCapabilities: readonly StudioProjectCapability[]
  grantedExtensionIds: readonly string[]
  curation: StudioProjectCuration | null
}

const executionOperations: readonly StudioProjectCapability[] = [
  'execute',
  'pause',
  'publish',
  'terminal',
  'python-repl',
  'install-dependencies',
]

/**
 * Pure intersection. Profile/release come from the host's verified catalog, grants from
 * contextual authorization. Neither may be taken from the learner's document.
 * Host operations already account for injected providers and browser feature probes.
 */
export function resolveStudioProjectCapabilities(
  input: StudioCapabilityResolutionInput,
): StudioResolvedCapabilities {
  const issues: StudioCompatibilityIssue[] = []
  const issue = (code: string, path: string, message: string) => {
    issues.push({ code, path, message })
  }
  const invalid = (): StudioResolvedCapabilities => ({
    valid: false,
    modes: [],
    capabilities: [],
    extensionIds: [],
    issues,
    operations: STUDIO_PROJECT_CAPABILITIES.map((capability) => ({
      capability,
      state: 'unavailable',
      reasonCode: 'project-incompatible',
    })),
  })
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    for (const error of parsed.error.issues)
      issue('invalid-capability-input', `$.${error.path.join('.')}`, error.message)
    return invalid()
  }
  const {
    project,
    profile,
    release,
    releaseStatus,
    hostOperations,
    grantedCapabilities,
    grantedExtensionIds,
    curation,
  } = parsed.data
  const manifest = release.manifest
  const reference = profile.releases.find((item) => item.id === release.releaseId)
  if (project.runtime.profileId !== profile.id || release.profileId !== profile.id)
    issue('profile-mismatch', '$.runtime.profileId', 'O perfil não corresponde ao projeto.')
  if (project.runtime.releaseId !== release.releaseId || !reference)
    issue('release-mismatch', '$.runtime.releaseId', 'A release não pertence ao perfil aprovado.')
  if (
    project.runtime.manifestSha256 !== release.manifestSha256 ||
    reference?.manifestSha256 !== release.manifestSha256
  )
    issue(
      'manifest-mismatch',
      '$.runtime.manifestSha256',
      'O manifesto não corresponde à release aprovada.',
    )
  if (
    !profile.languages.includes(project.programmingLanguage) ||
    manifest.programmingLanguage !== project.programmingLanguage
  )
    issue(
      'language-mismatch',
      '$.programmingLanguage',
      'A linguagem não é compatível com o ambiente.',
    )
  if (!profile.kinds.includes(project.kind) || !manifest.kinds.includes(project.kind))
    issue('kind-mismatch', '$.kind', 'Este ambiente não oferece esse tipo de projeto.')
  for (const [index, extension] of project.installedExtensions.entries()) {
    const supported = manifest.extensions.find((item) => item.id === extension.id)
    if (!supported?.versions.includes(extension.version))
      issue(
        'extension-incompatible',
        `$.installedExtensions[${index}]`,
        'A extensão ou sua versão não é compatível com a release.',
      )
  }
  if (curation?.level !== undefined && !profile.levels.includes(curation.level))
    issue(
      'curation-level-unknown',
      '$.curation.level',
      'O nível não pertence ao catálogo deste ambiente.',
    )
  const modes = studioModesForKind(project.kind).filter(
    (mode) =>
      profile.modes.includes(mode) &&
      manifest.modes.includes(mode) &&
      (curation?.allowedModes === undefined || curation.allowedModes.includes(mode)),
  )
  if (!modes.length)
    issue(
      'curation-no-modes',
      '$.curation.allowedModes',
      'A configuração precisa permitir um modo válido para este projeto.',
    )
  if (issues.length) return invalid()

  const extensionIds = project.installedExtensions
    .filter((extension) => grantedExtensionIds.includes(extension.id))
    .map((extension) => extension.id)
  const deniedExtension = extensionIds.length !== project.installedExtensions.length
  const operations = STUDIO_PROJECT_CAPABILITIES.map((capability): StudioOperationAvailability => {
    const unavailable = (reasonCode: string): StudioOperationAvailability => ({
      capability,
      state: 'unavailable',
      reasonCode,
    })
    if (!manifest.capabilities.includes(capability)) return unavailable('not-implemented')
    if (
      (capability === 'terminal' && project.programmingLanguage !== 'javascript') ||
      (capability === 'python-repl' && project.programmingLanguage !== 'python') ||
      (['terminal', 'python-repl', 'install-dependencies'].includes(capability) &&
        project.kind !== 'pro')
    )
      return unavailable('not-supported-by-project')
    if (!grantedCapabilities.includes(capability)) return unavailable('capability-not-granted')
    if (executionOperations.includes(capability)) {
      if (releaseStatus === 'revoked') return unavailable('runtime-revoked')
      if (deniedExtension) return unavailable('extension-not-granted')
    }
    const host = hostOperations.find((operation) => operation.capability === capability)
    if (!host) return unavailable('host-operation-missing')
    return { ...host }
  })
  return {
    valid: true,
    modes,
    operations,
    extensionIds,
    issues,
    capabilities: operations
      .filter((operation) => operation.state === 'available')
      .map((operation) => operation.capability),
  }
}
