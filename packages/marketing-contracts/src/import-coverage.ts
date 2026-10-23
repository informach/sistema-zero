import { z } from 'zod'
import { importDecisionSchema } from './import-decision'
import { importRunSchema, importSourceResultSchema, inventoryEntrySchema } from './import-inventory'
import { importProductBindingSchema } from './import-product'

export const importCoverageStateSchema = z.enum([
  'loaded',
  'pending',
  'review',
  'blocked',
  'excluded',
  'other-product',
  'unbound',
  'deferred',
  'omitted',
])
export type ImportCoverageState = z.infer<typeof importCoverageStateSchema>
export const importCoverageQuerySchema = z
  .object({
    state: z.union([z.literal('all'), importCoverageStateSchema]).default('all'),
    cursor: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict()
export type ImportCoverageQuery = z.infer<typeof importCoverageQuerySchema>
export const importCoverageSchema = z
  .object({
    run: importRunSchema,
    binding: importProductBindingSchema.nullable(),
    countedAt: z.string().datetime(),
    summary: z
      .array(
        z
          .object({
            state: importCoverageStateSchema,
            count: z.number().int().nonnegative(),
            bytes: z.number().int().nonnegative().safe(),
          })
          .strict(),
      )
      .max(9),
    entries: z
      .array(
        z
          .object({
            ordinal: z.number().int().nonnegative(),
            source: inventoryEntrySchema,
            result: importSourceResultSchema.nullable(),
            state: importCoverageStateSchema,
            decision: importDecisionSchema.nullable().default(null),
          })
          .strict(),
      )
      .max(100),
    nextCursor: z.number().int().nonnegative().nullable(),
  })
  .strict()
export type ImportCoverage = z.infer<typeof importCoverageSchema>
