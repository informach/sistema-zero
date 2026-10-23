import { z } from 'zod'
import { canonicalJson, sha256Hex } from '../creations/content-fingerprint'
import { StudioProjectIdSchema, StudioProjectNameSchema } from './project-document'
import {
  StudioCatalogIdSchema,
  StudioExactVersionSchema,
  StudioPortablePathSchema,
  StudioPythonProjectConfigSchema,
  StudioRuntimeSelectionSchema,
  StudioSha256Schema,
  studioPortableFileConflict,
} from './project-environment'
import { STUDIO_PYTHON_MATERIAL_LIMITS } from './python-material-policy'

/** Metadata for the existing execution digest; no URLs, grants or source text. */
export const StudioPythonExecutionContentSchema = z
  .strictObject({
    version: z.literal(1),
    configuration: z.strictObject({
      runtime: StudioRuntimeSelectionSchema,
      extensions: z
        .array(z.strictObject({ id: StudioCatalogIdSchema, version: StudioExactVersionSchema }))
        .max(100),
      python: StudioPythonProjectConfigSchema,
    }),
    directories: z.array(StudioPortablePathSchema).max(160),
    files: z
      .array(
        z.strictObject({
          path: StudioPortablePathSchema,
          kind: z.enum(['source', 'asset']),
          sha256: StudioSha256Schema,
          byteLength: z
            .number()
            .int()
            .nonnegative()
            .max(STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes),
        }),
      )
      .min(1)
      .max(208),
  })
  .superRefine((content, context) => {
    if (
      content.configuration.runtime.manifestSha256 !==
      content.configuration.python.dependencyLock.runtimeManifestSha256
    )
      context.addIssue({
        code: 'custom',
        message: 'O lock não corresponde ao runtime do conteúdo.',
      })
    if (
      new Set(content.configuration.extensions.map((extension) => extension.id)).size !==
      content.configuration.extensions.length
    )
      context.addIssue({ code: 'custom', message: 'Há extensões repetidas no conteúdo.' })
    if (
      new Set(content.directories).size !== content.directories.length ||
      studioPortableFileConflict(
        content.files.map((file) => file.path),
        content.directories,
      )
    )
      context.addIssue({ code: 'custom', message: 'Há caminhos conflitantes no conteúdo.' })
    if (
      !content.files.some(
        (file) => file.kind === 'source' && file.path === content.configuration.python.entrypoint,
      )
    )
      context.addIssue({ code: 'custom', message: 'O arquivo inicial não existe no conteúdo.' })
    if (
      content.files.reduce((total, file) => total + file.byteLength, 0) >
      STUDIO_PYTHON_MATERIAL_LIMITS.snapshotBytes
    )
      context.addIssue({ code: 'custom', message: 'O conteúdo excede a cota de execução.' })
  })
export type StudioPythonExecutionContent = z.infer<typeof StudioPythonExecutionContentSchema>

/** Keep the original tuple/order: changing the recipe would invalidate saved execution identities. */
export async function studioPythonExecutionRevision(raw: unknown) {
  const content = StudioPythonExecutionContentSchema.parse(raw)
  return sha256Hex(canonicalJson(content))
}

export const StudioPythonExecutionMetadataSchema = StudioPythonExecutionContentSchema.safeExtend({
  projectId: StudioProjectIdSchema,
  revision: StudioSha256Schema,
})
export type StudioPythonExecutionMetadata = z.infer<typeof StudioPythonExecutionMetadataSchema>

export const StudioPythonWebPayloadSchema = z.strictObject({
  version: z.literal(1),
  name: StudioProjectNameSchema,
  snapshot: StudioPythonExecutionMetadataSchema,
})
export type StudioPythonWebPayload = z.infer<typeof StudioPythonWebPayloadSchema>

/** Verifies the detached snapshot metadata before fetching any project file. */
export async function verifyStudioPythonWebPayload(raw: unknown): Promise<StudioPythonWebPayload> {
  const payload = StudioPythonWebPayloadSchema.parse(raw)
  await verifyMetadataDigest(payload.snapshot)
  return payload
}

export async function verifyStudioPythonExecutionMetadata(
  raw: unknown,
): Promise<StudioPythonExecutionMetadata> {
  const snapshot = StudioPythonExecutionMetadataSchema.parse(raw)
  await verifyMetadataDigest(snapshot)
  return snapshot
}

async function verifyMetadataDigest(snapshot: StudioPythonExecutionMetadata) {
  const { projectId: _projectId, revision, ...content } = snapshot
  if (revision !== (await sha256Hex(canonicalJson(content))))
    throw new Error('O pacote não corresponde à revisão Python declarada.')
}
