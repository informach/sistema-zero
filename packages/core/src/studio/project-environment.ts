import { z } from 'zod'
import { isStudioPortablePath, studioPortableFileConflict } from './portable-path'
import { isStudioCatalogId, isStudioSha256 } from './runtime-identity'

/** Defaults belong to creation/migration, never to parsing an unknown document. */
export const STUDIO_DEFAULT_PROJECT_LANGUAGE = 'javascript' as const
export const StudioProjectLanguageSchema = z.enum(['javascript', 'python'])
export type StudioProjectLanguage = z.infer<typeof StudioProjectLanguageSchema>
export const StudioProjectKindSchema = z.enum(['classic', 'pro'])
export type StudioProjectKind = z.infer<typeof StudioProjectKindSchema>
export const StudioProjectModeSchema = z.enum(['blocks', 'bridge', 'code'])
export type StudioProjectMode = z.infer<typeof StudioProjectModeSchema>

export const StudioSha256Schema = z.string().refine(isStudioSha256)
export const StudioCatalogIdSchema = z.string().refine(isStudioCatalogId)
/** An exact catalog version, not a range, command, requirement expression or URL. */
export const StudioExactVersionSchema = z
  .string()
  .max(64)
  .regex(/^[0-9][A-Za-z0-9.!+_-]*$/)

export {
  isStudioPortablePath,
  isStudioPythonAssetPath,
  studioPortableFileConflict,
} from './portable-path'

export const StudioPortablePathSchema = z.string().refine(isStudioPortablePath, {
  message: 'Use um caminho relativo portátil, sem atalhos de pasta ou nomes reservados.',
})
export const StudioPythonEntrypointSchema = StudioPortablePathSchema.refine(
  (path) => path.endsWith('.py'),
  { message: 'O arquivo inicial precisa ter a extensão .py.' },
)

export const StudioRuntimeSelectionSchema = z.strictObject({
  profileId: StudioCatalogIdSchema,
  releaseId: StudioCatalogIdSchema,
  manifestSha256: StudioSha256Schema,
})
export type StudioRuntimeSelection = z.infer<typeof StudioRuntimeSelectionSchema>

export const StudioProjectEnvironmentSchema = z.strictObject({
  programmingLanguage: StudioProjectLanguageSchema,
  runtime: StudioRuntimeSelectionSchema,
})
export type StudioProjectEnvironment = z.infer<typeof StudioProjectEnvironmentSchema>

export const StudioDependencyArtifactSchema = z.strictObject({
  path: StudioPortablePathSchema,
  sha256: StudioSha256Schema,
})

/** Distribution names use the canonical, lower-case PEP 503 spelling. */
const distributionSchema = z
  .string()
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const importSchema = z
  .string()
  .max(128)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/)

export const StudioDependencyResolutionSchema = z
  .strictObject({
    distribution: distributionSchema,
    version: StudioExactVersionSchema,
    imports: z.array(importSchema).min(1).max(128),
    requires: z.array(distributionSchema).max(256),
    artifacts: z.array(StudioDependencyArtifactSchema).min(1).max(256),
  })
  .superRefine((resolution, context) => {
    for (const key of ['imports', 'requires'] as const) {
      if (new Set(resolution[key]).size !== resolution[key].length)
        context.addIssue({ code: 'custom', path: [key], message: 'Há itens repetidos.' })
    }
    if (studioPortableFileConflict(resolution.artifacts.map((artifact) => artifact.path)))
      context.addIssue({
        code: 'custom',
        path: ['artifacts'],
        message: 'Há caminhos conflitantes.',
      })
  })
export type StudioDependencyResolution = z.infer<typeof StudioDependencyResolutionSchema>

export const StudioDependencyResolutionsSchema = z
  .array(StudioDependencyResolutionSchema)
  .max(256)
  .superRefine((packages, context) => {
    const names = new Set(packages.map((item) => item.distribution))
    if (names.size !== packages.length)
      context.addIssue({ code: 'custom', message: 'Há distribuições repetidas.' })
    packages.forEach((item, index) => {
      item.requires.forEach((dependency, dependencyIndex) => {
        if (!names.has(dependency))
          context.addIssue({
            code: 'custom',
            path: [index, 'requires', dependencyIndex],
            message: 'A dependência precisa estar resolvida no mesmo lock.',
          })
      })
    })
    if (
      studioPortableFileConflict(
        packages.flatMap((item) => item.artifacts.map((artifact) => artifact.path)),
      )
    )
      context.addIssue({ code: 'custom', message: 'Há caminhos conflitantes entre distribuições.' })
  })

export const StudioDependencyLockSchema = z.strictObject({
  lockVersion: z.literal(1),
  target: z.literal('browser'),
  pythonVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  runtimeManifestSha256: StudioSha256Schema,
  requirementsSha256: StudioSha256Schema,
  packages: StudioDependencyResolutionsSchema,
})
export type StudioDependencyLock = z.infer<typeof StudioDependencyLockSchema>

export const StudioPythonProjectConfigSchema = z.strictObject({
  entrypoint: StudioPythonEntrypointSchema,
  dependencyLock: StudioDependencyLockSchema,
})
export type StudioPythonProjectConfig = z.infer<typeof StudioPythonProjectConfigSchema>

const CLASSIC_MODES: readonly StudioProjectMode[] = Object.freeze(['blocks', 'bridge'])
const PRO_MODES: readonly StudioProjectMode[] = Object.freeze(['code'])
export function studioModesForKind(kind: StudioProjectKind): readonly StudioProjectMode[] {
  return kind === 'pro' ? PRO_MODES : CLASSIC_MODES
}
