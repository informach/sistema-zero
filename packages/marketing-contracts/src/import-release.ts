import { z } from 'zod'
import { hashSchema, idSchema, timestampSchema } from './common'
import { importRunSchema } from './import-inventory'

export const importReleaseSummarySchema = z
  .object({
    preserved: z.number().int().nonnegative(),
    deferred: z.number().int().nonnegative(),
    omitted: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    excluded: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    otherProduct: z.number().int().nonnegative(),
    productionFolders: z.number().int().nonnegative(),
    productionReports: z.number().int().nonnegative(),
    productionLinked: z.number().int().nonnegative(),
    productionPending: z.number().int().nonnegative(),
    structuredGroups: z.number().int().nonnegative(),
    calendars: z.number().int().nonnegative(),
  })
  .strict()
export const importReleaseSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    inventoryId: idSchema,
    verifiedInventoryId: idSchema,
    planHash: hashSchema,
    summary: importReleaseSummarySchema,
    createdBy: idSchema,
    createdAt: timestampSchema,
  })
  .strict()
export type ImportRelease = z.infer<typeof importReleaseSchema>
export const importReleasePreviewSchema = z
  .object({
    run: importRunSchema,
    verification: importRunSchema,
    state: z.enum(['preparing', 'current', 'changed', 'retired']),
    summary: importReleaseSummarySchema,
    planHash: hashSchema,
    blockers: z.array(z.string().max(500)).max(20),
    latest: importReleaseSchema.nullable(),
  })
  .strict()
export type ImportReleasePreview = z.infer<typeof importReleasePreviewSchema>
export const importReleaseApplySchema = z
  .object({
    operationId: idSchema,
    expectedPlanHash: hashSchema,
  })
  .strict()
export type ImportReleaseApply = z.infer<typeof importReleaseApplySchema>
