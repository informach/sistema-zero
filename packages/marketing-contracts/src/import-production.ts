import { z } from 'zod'
import { hashSchema, idSchema, timestampSchema } from './common'
import { relativeSourcePathSchema } from './import-inventory'

export const productionFolderSchema = z
  .object({
    path: relativeSourcePathSchema,
    key: z.string().regex(/^(?:[PF]\d{2}|highlight:[a-z0-9]+(?:-[a-z0-9]+)*)$/),
    product: z.string().min(1).max(100),
  })
  .strict()
export type ProductionFolder = z.infer<typeof productionFolderSchema>
export const productionAlternativeSchema = z
  .object({
    position: z.number().int().min(1).max(20),
    short: z.string().min(1).max(4000),
    long: z.string().min(1).max(10000),
  })
  .strict()
export type ProductionAlternative = z.infer<typeof productionAlternativeSchema>
export const productionReviewSchema = z
  .object({
    parserVersion: z.enum(['editorial-production-v1', 'editorial-production-v2']),
    folder: productionFolderSchema,
    copySourcePath: relativeSourcePathSchema.nullable(),
    state: z.enum(['incomplete', 'divergent', 'ready-for-review']),
    files: z
      .array(
        z
          .object({
            path: relativeSourcePathSchema,
            sha256: hashSchema,
            position: z.number().int().min(0).max(99),
            alt: productionAlternativeSchema.nullable(),
          })
          .strict(),
      )
      .max(100),
    matchingCopies: z.array(relativeSourcePathSchema).max(100),
    otherCopies: z.array(relativeSourcePathSchema).max(100),
    issues: z
      .array(z.object({ path: relativeSourcePathSchema, message: z.string().max(1000) }).strict())
      .max(200),
  })
  .strict()
export type ProductionReview = z.infer<typeof productionReviewSchema>
export type ProductionIssue = ProductionReview['issues'][number]
export const importProductionPreviewSchema = z
  .object({
    inventoryId: idSchema,
    inventoryDigest: hashSchema,
    reviewedAt: timestampSchema,
    review: productionReviewSchema,
  })
  .strict()
export type ImportProductionPreview = z.infer<typeof importProductionPreviewSchema>
export const importProductionShareSchema = z
  .object({ operationId: idSchema, folderPath: relativeSourcePathSchema })
  .strict()
export type ImportProductionShare = z.infer<typeof importProductionShareSchema>
export const productionReportSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    inventoryId: idSchema,
    inventoryDigest: hashSchema,
    createdBy: idSchema,
    createdAt: timestampSchema,
    inheritedFrom: z.object({ inventoryId: idSchema, reportId: idSchema }).strict().optional(),
    review: productionReviewSchema,
    sources: z
      .array(
        z
          .object({
            path: relativeSourcePathSchema,
            sourceVersionId: idSchema,
            sha256: hashSchema,
            assetId: idSchema.nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict()
export type ProductionReport = z.infer<typeof productionReportSchema>
export const productionReportPageSchema = z
  .object({ items: z.array(productionReportSchema).max(50), nextCursor: idSchema.nullable() })
  .strict()
export type ProductionReportPage = z.infer<typeof productionReportPageSchema>
export const productionShareResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('shared'), report: productionReportSchema }).strict(),
  z.object({ status: z.literal('verifying'), pending: z.number().int().min(1).max(100) }).strict(),
])
export type ProductionShareResult = z.infer<typeof productionShareResultSchema>

export const productionLinkSchema = z
  .object({
    reportId: idSchema,
    inheritedFrom: idSchema.optional(),
    pieceId: idSchema,
    representationId: idSchema,
    planHash: hashSchema,
    createdBy: idSchema,
    createdAt: timestampSchema,
    components: z
      .array(
        z
          .object({
            componentId: idSchema,
            revisionId: idSchema,
            assetId: idSchema,
            originalAssetId: idSchema,
            sha256: hashSchema,
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
export type ProductionLink = z.infer<typeof productionLinkSchema>
export const productionLinkPreviewSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('ready'),
      reportId: idSchema,
      pieceId: idSchema,
      representationId: idSchema,
      planHash: hashSchema,
      components: z
        .array(
          z
            .object({
              componentId: idSchema,
              revisionId: idSchema,
              originalAssetId: idSchema,
              sha256: hashSchema,
              position: z.number().int().min(1).max(20),
              path: relativeSourcePathSchema,
              alt: z.string().min(1).max(4000),
            })
            .strict(),
        )
        .min(1)
        .max(20),
    })
    .strict(),
  z.object({ status: z.literal('linked'), link: productionLinkSchema }).strict(),
  z
    .object({
      status: z.literal('blocked'),
      reportId: idSchema,
      reasons: z.array(z.string().min(1).max(1000)).min(1).max(100),
    })
    .strict(),
])
export type ProductionLinkPreview = z.infer<typeof productionLinkPreviewSchema>
export const productionLinkApplySchema = z
  .object({
    operationId: idSchema,
    planHash: hashSchema,
    assets: z
      .array(z.object({ componentId: idSchema, assetId: idSchema }).strict())
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new Set(value.assets.map((item) => item.componentId)).size !== value.assets.length ||
      new Set(value.assets.map((item) => item.assetId)).size !== value.assets.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Cada componente e arquivo deve aparecer uma única vez',
      })
  })
export type ProductionLinkApply = z.infer<typeof productionLinkApplySchema>
export const productionLinkResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('linked'), link: productionLinkSchema }).strict(),
  z.object({ status: z.literal('verifying'), pending: z.number().int().min(1).max(20) }).strict(),
])
export type ProductionLinkResult = z.infer<typeof productionLinkResultSchema>
