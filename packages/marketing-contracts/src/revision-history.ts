import { z } from 'zod'
import { idSchema } from './common'
import { revisionSchema } from './editorial'

export const revisionHistoryQuerySchema = z.object({ before: idSchema.optional() }).strict()
export const revisionHistoryPageSchema = z
  .object({
    projectId: idSchema,
    entityId: idSchema,
    items: z.array(revisionSchema).max(50),
    nextBefore: idSchema.nullable(),
  })
  .strict()
export type RevisionHistoryPage = z.infer<typeof revisionHistoryPageSchema>

export function parseRevisionHistoryPage(
  raw: unknown,
  projectId: string,
  entityId: string,
  before: string | null,
) {
  const page = revisionHistoryPageSchema.parse(raw)
  const ids = new Set(page.items.map((item) => item.id))
  if (
    page.projectId !== projectId ||
    page.entityId !== entityId ||
    ids.size !== page.items.length ||
    (before && ids.has(before)) ||
    page.items.some((item) => item.projectId !== projectId || item.entityId !== entityId) ||
    (page.nextBefore && page.nextBefore !== page.items.at(-1)?.id)
  )
    throw new Error('A página do histórico pertence a outro contexto ou não avançou')
  return page
}
