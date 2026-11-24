import { z } from 'zod'
import { STUDIO_PRO_PUBLICATION_LIMITS } from './pro-publication'
import { isStudioPublicationId } from './project-format'

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/)

/**
 * A classic JavaScript game runs from its own source in the public sandbox player, so a
 * revision keeps only the exact source bytes (no compiled artifact, no runtime approval).
 * `artifactHash` covers the canonical receipt stored beside the source.
 */
export const StudioClassicPublishedRevisionSchema = z.object({
  id: Sha256,
  sourceHash: Sha256,
  artifactHash: Sha256,
  createdAt: z.number().int().nonnegative(),
  classic: z.literal(true),
})
export type StudioClassicPublishedRevision = z.infer<typeof StudioClassicPublishedRevisionSchema>

export const StudioClassicPublicationSchema = z
  .object({
    publicationVersion: z.literal(1),
    programmingLanguage: z.literal('javascript'),
    kind: z.literal('classic'),
    playId: z.string().refine(isStudioPublicationId),
    version: z.number().int().positive(),
    activeRevision: Sha256,
    disabled: z.boolean(),
    revisions: z
      .array(StudioClassicPublishedRevisionSchema)
      .min(1)
      .max(STUDIO_PRO_PUBLICATION_LIMITS.maxRevisions),
  })
  .superRefine((publication, context) => {
    const ids = new Set<string>()
    for (const revision of publication.revisions) {
      if (ids.has(revision.id))
        context.addIssue({ code: 'custom', message: 'Há revisões repetidas na publicação.' })
      ids.add(revision.id)
    }
    if (!ids.has(publication.activeRevision))
      context.addIssue({ code: 'custom', message: 'A revisão ativa não pertence à publicação.' })
  })
export type StudioClassicPublication = z.infer<typeof StudioClassicPublicationSchema>

export function isStudioClassicPublication(value: unknown): value is StudioClassicPublication {
  return StudioClassicPublicationSchema.safeParse(value).success
}

/** The exact receipt bytes stored and hashed for a classic revision. */
export function studioClassicPublicationReceiptText(input: {
  projectId: string
  sourceHash: string
}) {
  return JSON.stringify({ version: 1, kind: 'javascript-classic', ...input })
}
