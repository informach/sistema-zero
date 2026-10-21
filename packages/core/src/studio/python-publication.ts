import { z } from 'zod'
import { canonicalJson } from '../creations/content-fingerprint'
import {
  isStudioProPublication,
  isStudioPublicationId,
  STUDIO_PRO_PUBLICATION_LIMITS,
  type StudioProPublication,
} from './pro-publication'
import type { StudioPythonClassicDocument, StudioPythonProDocument } from './project-document'
import {
  StudioDependencyLockSchema,
  StudioExtensionReferenceSchema,
  StudioProjectKindSchema,
  StudioPythonEntrypointSchema,
  StudioRuntimeSelectionSchema,
  StudioSha256Schema,
} from './project-environment'

export const StudioPythonPublicationApprovalSchema = z.strictObject({
  kind: z.literal('python-browser'),
  runtime: StudioRuntimeSelectionSchema,
  snapshotSha256: StudioSha256Schema,
})

/**
 * Legacy retained recipe. Already published revisions keep these exact stored bytes
 * (hashed as written, `JSON.stringify` key order); they are read, never rewritten.
 */
export const StudioPythonPublicationManifestV1Schema = z.strictObject({
  version: z.literal(1),
  sourceHash: StudioSha256Schema,
  approval: StudioPythonPublicationApprovalSchema,
})

/** Bytes, not semantics: v2 recipes are stored as canonical JSON and hashed as stored. */
export const STUDIO_PYTHON_PUBLICATION_RECIPE_LIMITS = { v1Bytes: 4096, v2Bytes: 65_536 } as const

/**
 * Reproducible recipe written for new Python revisions. It contains no runtime URL or
 * executable from the author. The transitive closure is pinned by identity, never copied:
 * `approval.runtime.manifestSha256` fixes the release manifest (artifacts, provided modules
 * and supported extension versions), `extensions` the versions the project actually
 * enables, `dependencyLock` the resolved packages, and `sourceHash`/`snapshotSha256` the
 * exact retained file set and execution snapshot. A catalog update cannot change it.
 */
export const StudioPythonPublicationManifestV2Schema = z
  .strictObject({
    version: z.literal(2),
    programmingLanguage: z.literal('python'),
    kind: StudioProjectKindSchema,
    sourceHash: StudioSha256Schema,
    approval: StudioPythonPublicationApprovalSchema,
    entrypoint: StudioPythonEntrypointSchema,
    extensions: z.array(StudioExtensionReferenceSchema).max(100),
    dependencyLock: StudioDependencyLockSchema,
  })
  .superRefine((recipe, context) => {
    for (const [index, extension] of recipe.extensions.entries()) {
      const previous = recipe.extensions[index - 1]
      // One canonical order: the same project always produces the same recipe bytes.
      if (previous && previous.id >= extension.id)
        context.addIssue({
          code: 'custom',
          path: ['extensions', index],
          message: 'As extensões precisam estar em ordem e sem repetição.',
        })
    }
    if (recipe.dependencyLock.runtimeManifestSha256 !== recipe.approval.runtime.manifestSha256)
      context.addIssue({
        code: 'custom',
        path: ['dependencyLock', 'runtimeManifestSha256'],
        message: 'O lock pertence a outro ambiente Python.',
      })
  })
export type StudioPythonPublicationManifestV2 = z.infer<
  typeof StudioPythonPublicationManifestV2Schema
>

/** Both versions stay readable; only v2 is produced for new revisions. */
export const StudioPythonPublicationManifestSchema = z.discriminatedUnion('version', [
  StudioPythonPublicationManifestV1Schema,
  StudioPythonPublicationManifestV2Schema,
])
export type StudioPythonPublicationManifest = z.infer<typeof StudioPythonPublicationManifestSchema>

type PythonPublicationProject = StudioPythonClassicDocument | StudioPythonProDocument

/** Derives the v2 recipe from an already validated Python document and its approval. */
export function createStudioPythonPublicationRecipe(input: {
  project: PythonPublicationProject
  sourceHash: string
  approval: z.infer<typeof StudioPythonPublicationApprovalSchema>
}): StudioPythonPublicationManifestV2 {
  return StudioPythonPublicationManifestV2Schema.parse({
    version: 2,
    programmingLanguage: 'python',
    kind: input.project.kind,
    sourceHash: input.sourceHash,
    approval: input.approval,
    entrypoint: input.project.python.entrypoint,
    // installedAt is authoring history, not an execution dependency.
    extensions: input.project.installedExtensions
      .map(({ id, version }) => ({ id, version }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    dependencyLock: input.project.python.dependencyLock,
  })
}

/** The exact bytes stored and hashed for a v2 recipe. */
export function studioPythonPublicationRecipeText(recipe: StudioPythonPublicationManifestV2) {
  return canonicalJson(recipe)
}

/** The exact legacy bytes a v1 revision stored for the same input (lost-response replay). */
export function studioPythonPublicationLegacyRecipeText(input: {
  sourceHash: string
  approval: z.infer<typeof StudioPythonPublicationApprovalSchema>
}) {
  return JSON.stringify(
    StudioPythonPublicationManifestV1Schema.parse({
      version: 1,
      sourceHash: input.sourceHash,
      approval: input.approval,
    }),
  )
}

/**
 * True when the stored recipe was produced from this document. A v1 recipe predates
 * these fields: its document remains bound only by sourceHash and the approval.
 */
export function studioPythonRecipeMatchesProject(
  recipe: StudioPythonPublicationManifest,
  project: PythonPublicationProject,
) {
  if (recipe.version === 1) return true
  const expected = createStudioPythonPublicationRecipe({
    project,
    sourceHash: recipe.sourceHash,
    approval: recipe.approval,
  })
  return canonicalJson(expected) === canonicalJson(recipe)
}

/** A Python source bundle is approved for a pinned runtime, not validated by the JS compiler. */
export const StudioPythonPublishedRevisionSchema = z.object({
  id: StudioSha256Schema,
  sourceHash: StudioSha256Schema,
  artifactHash: StudioSha256Schema,
  validation: z.never().optional(),
  createdAt: z.number().int().nonnegative(),
  approval: StudioPythonPublicationApprovalSchema,
})
export type StudioPythonPublishedRevision = z.infer<typeof StudioPythonPublishedRevisionSchema>

export const StudioPythonPublicationSchema = z
  .object({
    publicationVersion: z.literal(2),
    programmingLanguage: z.literal('python'),
    kind: StudioProjectKindSchema,
    runtime: StudioRuntimeSelectionSchema,
    playId: z.string().refine(isStudioPublicationId),
    version: z.number().int().positive(),
    activeRevision: StudioSha256Schema,
    disabled: z.boolean(),
    revisions: z
      .array(StudioPythonPublishedRevisionSchema)
      .min(1)
      .max(STUDIO_PRO_PUBLICATION_LIMITS.maxRevisions),
  })
  .superRefine((publication, context) => {
    const ids = new Set<string>()
    for (const revision of publication.revisions) {
      if (ids.has(revision.id))
        context.addIssue({ code: 'custom', message: 'Há revisões repetidas na publicação.' })
      ids.add(revision.id)
      if (
        revision.approval.runtime.profileId !== publication.runtime.profileId ||
        revision.approval.runtime.releaseId !== publication.runtime.releaseId ||
        revision.approval.runtime.manifestSha256 !== publication.runtime.manifestSha256
      )
        context.addIssue({
          code: 'custom',
          message: 'Uma revisão pertence a outro ambiente Python.',
        })
    }
    if (!ids.has(publication.activeRevision))
      context.addIssue({ code: 'custom', message: 'A revisão ativa não pertence à publicação.' })
  })
export type StudioPythonPublication = z.infer<typeof StudioPythonPublicationSchema>
export type StudioPublication = StudioProPublication | StudioPythonPublication
export type StudioPublishedRevision =
  | StudioProPublication['revisions'][number]
  | StudioPythonPublishedRevision

export function isStudioPythonPublication(value: unknown): value is StudioPythonPublication {
  return StudioPythonPublicationSchema.safeParse(value).success
}
export function isStudioPublication(value: unknown): value is StudioPublication {
  return isStudioProPublication(value) || isStudioPythonPublication(value)
}
