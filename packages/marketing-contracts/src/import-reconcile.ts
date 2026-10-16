import { z } from 'zod'
import { hashSchema, idSchema } from './common'

export const importReconcileApplySchema = z
  .object({
    operationId: idSchema,
    previousId: idSchema,
    previousDigest: hashSchema,
    currentDigest: hashSchema,
  })
  .strict()
export type ImportReconcileApply = z.infer<typeof importReconcileApplySchema>
export const importReconcileResultSchema = z
  .object({
    projectId: idSchema,
    inventoryId: idSchema,
    previousId: idSchema,
    sources: z.number().int().nonnegative(),
    decisions: z.number().int().nonnegative(),
    reports: z.number().int().nonnegative(),
    links: z.number().int().nonnegative(),
    reportsPending: z.number().int().nonnegative(),
  })
  .strict()
export type ImportReconcileResult = z.infer<typeof importReconcileResultSchema>
