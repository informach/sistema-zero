import { z } from 'zod'
import { idSchema } from './common'
import { importRunSchema, inventoryEntrySchema, relativeSourcePathSchema } from './import-inventory'

export const importDeltaStateSchema = z.enum([
  'added',
  'removed',
  'changed',
  'reclassified',
  'unchanged',
])
export type ImportDeltaState = z.infer<typeof importDeltaStateSchema>
export const importDeltaQuerySchema = z
  .object({
    previousId: idSchema,
    state: z.union([z.literal('all'), importDeltaStateSchema]).default('all'),
    cursor: z.coerce.number().int().min(0).max(200000).default(0),
  })
  .strict()
export type ImportDeltaQuery = z.infer<typeof importDeltaQuerySchema>
export const importDeltaSchema = z
  .object({
    previous: importRunSchema,
    current: importRunSchema,
    summary: z
      .array(
        z.object({ state: importDeltaStateSchema, count: z.number().int().nonnegative() }).strict(),
      )
      .max(5),
    entries: z
      .array(
        z
          .object({
            ordinal: z.number().int().nonnegative(),
            path: relativeSourcePathSchema,
            state: importDeltaStateSchema,
            previous: inventoryEntrySchema.nullable(),
            current: inventoryEntrySchema.nullable(),
          })
          .strict(),
      )
      .max(100),
    nextCursor: z.number().int().nonnegative().nullable(),
  })
  .strict()
export type ImportDelta = z.infer<typeof importDeltaSchema>
