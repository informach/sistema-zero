import { z } from 'zod'
import {
  isStudioProPublication,
  isStudioPublicationId,
  STUDIO_PRO_PUBLICATION_LIMITS,
  type StudioProPublication,
} from './pro-publication'
import {
  StudioProjectKindSchema,
  StudioRuntimeSelectionSchema,
  StudioSha256Schema,
} from './project-environment'

export const StudioPythonPublicationApprovalSchema = z.strictObject({
  kind: z.literal('python-browser'),
  runtime: StudioRuntimeSelectionSchema,
  snapshotSha256: StudioSha256Schema,
})

/** Retained recipe contains no runtime URL or executable downloaded from the author. */
export const StudioPythonPublicationManifestSchema = z.strictObject({
  version: z.literal(1),
  sourceHash: StudioSha256Schema,
  approval: StudioPythonPublicationApprovalSchema,
})

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
