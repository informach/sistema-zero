import { z } from 'zod'

export const actionReceiptSchema = z.discriminatedUnion('found', [
  z.object({ found: z.literal(false) }).strict(),
  z.object({ found: z.literal(true), result: z.unknown() }).strict(),
])
export type ActionReceipt = z.infer<typeof actionReceiptSchema>

import { uploadStartSchema } from './assets'
import { idSchema, permissionSchema, timestampSchema } from './common'
import {
  batchOperationSchema,
  batchResultSchema,
  itemSchema,
  operationResultSchema,
  operationSchema,
} from './editorial'
export const syncStateSchema = z.enum(['local', 'sending', 'confirmed', 'conflict', 'blocked'])
export const changeEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectId: idSchema,
    sequence: z.number().int().positive(),
    type: z.enum([
      'project',
      'member',
      'revision',
      'archive',
      'asset',
      'execution',
      'approval',
      'import',
      'observation',
    ]),
    entityId: idSchema.nullable(),
    revisionId: idSchema.nullable(),
    actorId: idSchema,
    createdAt: timestampSchema,
  })
  .strict()
export type ChangeEvent = z.infer<typeof changeEventSchema>
export const changePageSchema = z
  .object({
    events: z.array(changeEventSchema).max(200),
    items: z.array(itemSchema.safeExtend({ sequence: z.number().int().positive() })).max(200),
    cursor: z.number().int().nonnegative(),
    hasMore: z.boolean(),
    resetRequired: z.boolean(),
    permissions: z.array(permissionSchema),
  })
  .strict()
export type ChangePage = z.infer<typeof changePageSchema>
export const enqueueSchema = z
  .object({ operation: operationSchema, dependsOnOperationId: idSchema.nullable() })
  .strict()
export const pendingOperationSchema = z
  .object({
    operation: operationSchema,
    state: syncStateSchema,
    dependsOnOperationId: idSchema.nullable(),
    result: operationResultSchema.nullable(),
    error: z.string().nullable(),
    createdAt: timestampSchema,
  })
  .strict()
export type PendingOperation = z.infer<typeof pendingOperationSchema>
export const pendingBatchSchema = z
  .object({
    operation: batchOperationSchema,
    state: syncStateSchema,
    result: batchResultSchema.nullable(),
    error: z.string().nullable(),
    createdAt: timestampSchema,
  })
  .strict()
export type PendingBatch = z.infer<typeof pendingBatchSchema>
export const syncReportSchema = z
  .object({
    phase: z.enum(['idle', 'syncing', 'offline', 'blocked']),
    message: z.string(),
    pending: z.number().int().nonnegative(),
    confirmedAt: timestampSchema.nullable(),
  })
  .strict()
export type SyncReport = z.infer<typeof syncReportSchema>
export const resolvedDraftSchema = z
  .object({
    operation: z.union([operationSchema, batchOperationSchema]),
    resolvedAt: timestampSchema,
    replacementId: idSchema.nullable(),
  })
  .strict()
export const projectViewSchema = z.object({
  transfers: z
    .array(
      z
        .object({
          input: uploadStartSchema,
          state: z.enum(['local', 'uploading', 'verifying', 'confirmed', 'failed']),
          error: z.string().nullable(),
          uploadedBytes: z.number().int().nonnegative(),
        })
        .strict(),
    )
    .optional(),
  items: z.array(itemSchema),
  pending: z.array(pendingOperationSchema),
  pendingBatches: z.array(pendingBatchSchema),
  resolvedDrafts: z.array(resolvedDraftSchema).optional(),
  report: syncReportSchema,
})
export type ProjectView = z.infer<typeof projectViewSchema>
export const draftResolutionSchema = z
  .object({
    projectId: idSchema,
    operationIds: z.array(idSchema).min(1).max(100),
    replacement: batchOperationSchema.nullable(),
  })
  .strict()
  .refine(
    (value) => !value.replacement || value.replacement.projectId === value.projectId,
    'A resolução pertence a outro projeto',
  )
export type DraftResolution = z.infer<typeof draftResolutionSchema>
export const importRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    importRunId: idSchema,
    sourceKey: z.string().min(1).max(1500),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    entityId: idSchema.nullable(),
    classification: z.enum([
      'current',
      'historical',
      'reference',
      'incomplete',
      'excluded',
      'ambiguous',
    ]),
    reason: z.string().max(2000),
    state: z.enum(['staged', 'confirmed', 'conflict', 'excluded']),
  })
  .strict()
