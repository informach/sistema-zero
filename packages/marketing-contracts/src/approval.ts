import { z } from 'zod'
import { assetManifestSchema } from './assets'
import { hashSchema, idSchema, timestampSchema } from './common'
import { revisionSchema } from './editorial'

export const editionSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectId: idSchema,
    pieceId: idSchema,
    representationId: idSchema,
    revisions: z.array(revisionSchema).min(3).max(250),
    orderedAssets: z
      .array(
        z
          .object({
            componentId: idSchema,
            revisionId: idSchema,
            asset: assetManifestSchema,
            alt: z.string().max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
export type EditionSnapshot = z.infer<typeof editionSnapshotSchema>
export const approvalPreviewSchema = z
  .object({ snapshot: editionSnapshotSchema, hash: hashSchema })
  .strict()
export const approveEditionSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    representationId: idSchema,
    expectedHash: hashSchema,
    checks: z
      .object({ copy: z.literal(true), visual: z.literal(true), destination: z.literal(true) })
      .strict(),
  })
  .strict()
export type ApproveEdition = z.infer<typeof approveEditionSchema>
export const approvedEditionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    snapshot: editionSnapshotSchema,
    hash: hashSchema,
    approvedBy: idSchema,
    approvedAt: timestampSchema,
    checks: approveEditionSchema.shape.checks,
  })
  .strict()
export type ApprovedEdition = z.infer<typeof approvedEditionSchema>
export const editionDownloadSchema = z
  .object({
    componentId: idSchema,
    editionId: idSchema,
    editionHash: hashSchema,
    manifest: assetManifestSchema,
    filename: z.string().regex(/^\d{3}-[a-f0-9-]{36}\.(png|jpg|webp|mp4)$/),
    url: z.string().url(),
  })
  .strict()
export const editionExportRequestSchema = z
  .object({
    projectId: idSchema,
    editionId: idSchema,
    componentId: idSchema,
    assetId: idSchema,
    expectedHash: hashSchema,
  })
  .strict()
export type EditionExportRequest = z.infer<typeof editionExportRequestSchema>
export const editionSummarySchema = approvedEditionSchema
  .pick({ id: true, hash: true, approvedBy: true, approvedAt: true })
  .extend({ assetCount: z.number().int().min(1).max(100) })
  .strict()
export type EditionSummary = z.infer<typeof editionSummarySchema>
export const editionPageSchema = z
  .object({ items: z.array(editionSummarySchema).max(25), nextCursor: idSchema.nullable() })
  .strict()
