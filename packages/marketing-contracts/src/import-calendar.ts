import { z } from 'zod'
import { hashSchema, idSchema } from './common'

export const importCalendarApplySchema = z
  .object({
    operationId: idSchema,
    sourceVersionId: idSchema,
    parserVersion: z.string().min(1).max(100),
    key: z.string().min(1).max(200),
    pieceId: idSchema,
    expectedRevisionId: idSchema,
    expectedMappingId: idSchema.nullable(),
  })
  .strict()
export type ImportCalendarApply = z.infer<typeof importCalendarApplySchema>
export const importCalendarPreviewSchema = z
  .object({
    sourceVersionId: idSchema,
    sourceHash: hashSchema,
    sourcePath: z.string().max(1500),
    parserVersion: z.string().max(100),
    historical: z.boolean(),
    entries: z
      .array(
        z
          .object({
            key: z.string(),
            title: z.string(),
            week: z.number().int(),
            position: z.number().int(),
            sourceKey: z.string(),
            pieceId: idSchema.nullable(),
            revisionId: idSchema.nullable(),
            currentWeek: z.number().int().nullable(),
            currentPosition: z.number().int().nullable(),
            mappingId: idSchema.nullable(),
            state: z.enum([
              'new',
              'imported',
              'update',
              'conflict',
              'missing',
              'ambiguous',
              'historical',
            ]),
            message: z.string(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
export type ImportCalendarPreview = z.infer<typeof importCalendarPreviewSchema>
export const importCalendarResultSchema = z
  .object({
    status: z.enum(['applied', 'reused', 'conflict']),
    pieceId: idSchema,
    mappingId: idSchema.nullable(),
    message: z.string(),
  })
  .strict()
export type ImportCalendarResult = z.infer<typeof importCalendarResultSchema>
