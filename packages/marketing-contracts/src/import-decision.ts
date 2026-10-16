import { z } from 'zod'
import { idSchema, timestampSchema } from './common'

/** A disposition is a review decision about an immutable origin, never an
 * approval of its content or permission to execute a preserved attachment. */
export const importDecisionStateSchema = z.enum(['deferred', 'omitted', 'pending'])
export const importDecisionSchema = z
  .object({
    inventoryId: idSchema,
    ordinal: z.number().int().min(0).max(99999),
    revisionId: idSchema,
    inheritedFrom: z
      .object({
        inventoryId: idSchema,
        ordinal: z.number().int().nonnegative(),
        revisionId: idSchema,
      })
      .strict()
      .optional(),
    state: importDecisionStateSchema,
    reason: z.string().trim().min(10).max(1000),
    decidedBy: idSchema,
    decidedAt: timestampSchema,
  })
  .strict()
export type ImportDecision = z.infer<typeof importDecisionSchema>
export const importDecisionApplySchema = z
  .object({
    operationId: idSchema,
    ordinal: z.number().int().min(0).max(99999),
    expectedRevisionId: idSchema.nullable(),
    state: importDecisionStateSchema,
    reason: z.string().trim().min(10).max(1000),
  })
  .strict()
export type ImportDecisionApply = z.infer<typeof importDecisionApplySchema>
