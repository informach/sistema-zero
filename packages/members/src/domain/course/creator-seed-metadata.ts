import { z } from 'zod'
import { InvalidContentCommandError } from './course.errors'

/** Seeded outlines are a reviewed production contract, not permission to publish their first lesson. */
export const CreatorSeedMetadataSchema = z.strictObject({
  key: z.string().min(1).max(200),
  version: z.string().min(1).max(100),
  outlineHash: z.string().regex(/^[a-f0-9]{64}$/),
  requiredLessonIds: z
    .array(z.uuid())
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length),
})

export function creatorSeedRequiredLessonIds(
  metadata: Record<string, unknown> | null,
): readonly string[] | null {
  if (!metadata || !Object.hasOwn(metadata, 'creatorSeed')) return null
  const parsed = CreatorSeedMetadataSchema.safeParse(metadata.creatorSeed)
  if (!parsed.success)
    throw new InvalidContentCommandError(
      'O planejamento deste curso está inconsistente. Revise o cadastro da Jornada antes de publicar.',
    )
  return parsed.data.requiredLessonIds
}

/** Deleting an outlined identity would leave an unrepairable publication requirement in metadata. */
export function assertCreatorPlannedLessonsKept(
  metadata: Record<string, unknown> | null,
  removedIds: readonly string[],
): void {
  const required = creatorSeedRequiredLessonIds(metadata)
  if (required?.some((id) => removedIds.includes(id)))
    throw new InvalidContentCommandError(
      'Esta aula faz parte do planejamento obrigatório e não pode ser excluída, mesmo em rascunho. Edite seu título e conteúdo mantendo a aula; assim o planejamento continua válido.',
    )
}
