import { z } from 'zod'
import { itemSchema } from '../../../marketing-contracts/src/editorial'
import { projectViewSchema } from '../../../marketing-contracts/src/sync'

/** Local change clock is independent of the server cursor: mutation receipts
 * can reach SQLite before older remote revisions do. */
export const itemProjectionSchema = z
  .object({
    projectId: z.string().uuid(),
    version: z.number().int().nonnegative().safe(),
    reset: z.boolean(),
    items: z.array(itemSchema),
    removed: z.array(z.string().uuid()),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.items.some((item) => item.projectId !== value.projectId) ||
      new Set(value.items.map((item) => item.id)).size !== value.items.length ||
      new Set(value.removed).size !== value.removed.length ||
      value.items.some((item) => value.removed.includes(item.id)) ||
      (value.reset && value.removed.length)
    )
      ctx.addIssue({ code: 'custom', message: 'Projeção com identidades divergentes' })
  })
export type ItemProjection = z.infer<typeof itemProjectionSchema>
export const projectProjectionSchema = projectViewSchema
  .omit({ items: true })
  .extend({
    changes: itemProjectionSchema,
  })
  .strict()
export type ProjectProjection = z.infer<typeof projectProjectionSchema>
