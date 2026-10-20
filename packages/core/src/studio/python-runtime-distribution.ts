import { z } from 'zod'
import { canonicalJson, sha256Hex } from '../creations/content-fingerprint'
import { StudioDependencyArtifactSchema, studioPortableFileConflict } from './project-environment'
import {
  StudioPythonProvidedModulesSchema,
  studioPythonProvidedModuleArtifactIssue,
} from './python-provided-modules'
import {
  createStudioRuntimeRelease,
  StudioRuntimeReleaseSchema,
  StudioRuntimeReleaseStatusSchema,
} from './runtime-catalog'

/** Distribution limits are independent of learner project/storage quotas. */
export const STUDIO_PYTHON_DISTRIBUTION_LIMITS = {
  files: 512,
  fileBytes: 128 * 1024 * 1024,
  totalBytes: 256 * 1024 * 1024,
} as const

/** Internal storage artifacts are negotiated for a logical URL, never imported by this path. */
export const STUDIO_PYTHON_HTTP_GZIP_PREFIX = '_http/gzip/'

export const StudioPythonDistributionSchema = z
  .strictObject({
    version: z.literal(1),
    pyodideVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    pythonVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    providedModules: StudioPythonProvidedModulesSchema.optional(),
    /** Trusted launcher can wait for and enforce the editor's host audio preference. */
    previewHostAudioVersion: z.literal(1).optional(),
    files: z
      .array(
        z.strictObject({
          ...StudioDependencyArtifactSchema.shape,
          bytes: z.number().int().nonnegative().max(STUDIO_PYTHON_DISTRIBUTION_LIMITS.fileBytes),
        }),
      )
      .min(1)
      .max(STUDIO_PYTHON_DISTRIBUTION_LIMITS.files),
    httpRepresentations: z
      .array(
        z.strictObject({
          path: StudioDependencyArtifactSchema.shape.path,
          encoding: z.literal('gzip'),
          artifactPath: StudioDependencyArtifactSchema.shape.path,
        }),
      )
      .min(1)
      .max(STUDIO_PYTHON_DISTRIBUTION_LIMITS.files)
      .optional(),
  })
  .superRefine((value, context) => {
    if (studioPortableFileConflict(value.files.map((file) => file.path)))
      context.addIssue({
        code: 'custom',
        path: ['files'],
        message: 'Caminhos conflitantes na distribuição.',
      })
    if (
      value.files.reduce((sum, file) => sum + file.bytes, 0) >
      STUDIO_PYTHON_DISTRIBUTION_LIMITS.totalBytes
    )
      context.addIssue({
        code: 'custom',
        path: ['files'],
        message: 'A distribuição excede o limite de bytes.',
      })
    const paths = new Set(value.files.map((file) => file.path))
    const files = new Map(value.files.map((file) => [file.path, file]))
    for (const [index, module] of (value.providedModules ?? []).entries()) {
      const issue = studioPythonProvidedModuleArtifactIssue(module, value.files)
      if (issue)
        context.addIssue({ code: 'custom', path: ['providedModules', index], message: issue })
    }
    const represented = new Set<string>()
    const compressed = new Set<string>()
    const decoded = new Map<string, { sha256: string; bytes: number }>()
    for (const representation of value.httpRepresentations ?? []) {
      const logical = files.get(representation.path)
      const artifact = files.get(representation.artifactPath)
      const previous = decoded.get(representation.artifactPath)
      if (
        !logical ||
        !artifact ||
        logical.path.startsWith(STUDIO_PYTHON_HTTP_GZIP_PREFIX) ||
        artifact.path !== `${STUDIO_PYTHON_HTTP_GZIP_PREFIX}${artifact.sha256}.gz` ||
        artifact.bytes === 0 ||
        represented.has(logical.path) ||
        (previous &&
          logical &&
          (previous.sha256 !== logical.sha256 || previous.bytes !== logical.bytes))
      )
        context.addIssue({
          code: 'custom',
          path: ['httpRepresentations'],
          message: 'Representação HTTP inválida ou ambígua.',
        })
      represented.add(representation.path)
      compressed.add(representation.artifactPath)
      if (logical) decoded.set(representation.artifactPath, logical)
    }
    if (
      value.files.some(
        (file) =>
          file.path.startsWith(STUDIO_PYTHON_HTTP_GZIP_PREFIX) && !compressed.has(file.path),
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['httpRepresentations'],
        message: 'Artefato HTTP sem representação declarada.',
      })
    for (const path of [
      'frame.html',
      'frame.mjs',
      'worker.mjs',
      'pyodide.mjs',
      'pyodide.asm.mjs',
      'pyodide.asm.wasm',
      'python_stdlib.zip',
      'pyodide-lock.json',
      'LICENSE-pyodide.txt',
      'LICENSE-python.txt',
      'SOURCES.txt',
    ]) {
      if (!paths.has(path))
        context.addIssue({
          code: 'custom',
          path: ['files'],
          message: `Artefato obrigatório ausente: ${path}.`,
        })
    }
  })
export type StudioPythonDistribution = z.infer<typeof StudioPythonDistributionSchema>

/**
 * Complete executable/package file set of a verified distribution. HTTP artifacts
 * remain bound by its full manifest/pin but are storage representations, not modules
 * or dependencies to materialize in a standalone export or isolated SDK workspace.
 */
export function studioPythonLogicalFiles(distribution: StudioPythonDistribution) {
  const transport = new Set(distribution.httpRepresentations?.map((item) => item.artifactPath))
  return distribution.files.filter((file) => !transport.has(file.path))
}

const deploymentSchema = z.strictObject({
  release: StudioRuntimeReleaseSchema,
  distribution: StudioPythonDistributionSchema,
})

/** Deployment-owned approval; never loaded from a learner project or an upload marker. */
export const StudioPythonRuntimeConfigurationSchema = z.strictObject({
  version: z.literal(1),
  parentOrigins: z.array(z.string().min(1).max(2048)).min(1).max(32),
  deployments: z
    .array(
      z.strictObject({
        status: StudioRuntimeReleaseStatusSchema,
        deployment: deploymentSchema,
      }),
    )
    .min(1)
    .max(64),
})

/** Validates bytes metadata against a release. This does NOT grant catalog approval. */
export async function verifyStudioPythonDeployment(input: unknown) {
  // Parse/copy before awaiting: callers cannot swap a manifest during digest verification.
  const { release: candidate, distribution } = deploymentSchema.parse(input)
  const releaseModules = candidate.manifest.python?.providedModules
  if (
    (releaseModules === undefined) !== (distribution.providedModules === undefined) ||
    canonicalJson(releaseModules ?? null) !== canonicalJson(distribution.providedModules ?? null)
  )
    throw new Error('Os módulos fornecidos da distribuição diferem da release.')
  const release = await createStudioRuntimeRelease(candidate.manifest)
  if (
    release.manifestSha256 !== candidate.manifestSha256 ||
    release.manifest.programmingLanguage !== 'python' ||
    release.manifest.python?.version !== distribution.pythonVersion
  )
    throw new Error('A distribuição não corresponde à release Python.')
  const artifacts = new Map(release.manifest.artifacts.map((file) => [file.path, file.sha256]))
  if (
    artifacts.size !== distribution.files.length ||
    distribution.files.some((file) => artifacts.get(file.path) !== file.sha256)
  )
    throw new Error('Os artefatos da distribuição diferem da release.')
  const distributionSha256 = await sha256Hex(canonicalJson(distribution))
  const marker = canonicalJson({
    version: 1,
    runtimeManifestSha256: release.manifestSha256,
    distributionSha256,
  })
  const markerSha256 = await sha256Hex(marker)
  for (const file of distribution.files) Object.freeze(file)
  Object.freeze(distribution.files)
  if (distribution.httpRepresentations) {
    for (const representation of distribution.httpRepresentations) Object.freeze(representation)
    Object.freeze(distribution.httpRepresentations)
  }
  Object.freeze(distribution)
  return Object.freeze({ release, distribution, distributionSha256, marker, markerSha256 })
}
export type StudioPythonDeployment = Awaited<ReturnType<typeof verifyStudioPythonDeployment>>

export const studioPythonRuntimePrefix = (manifestSha256: string) => `runtimes/${manifestSha256}/`
export const studioPythonRuntimeRoute = (manifestSha256: string) =>
  `/v1/runtimes/${manifestSha256}/`
/** Metadata has a separate route, so no distribution file can shadow its manifest. */
export const studioPythonDeploymentRoute = (manifestSha256: string) =>
  `/v1/runtime-deployments/${manifestSha256}`
