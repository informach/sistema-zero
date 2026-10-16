import { z } from 'zod'
import { hashSchema, idSchema } from './common'
import { editorialFormatSchema } from './editorial'

export const importStructureApplySchema = z
  .object({
    operationId: idSchema,
    sourceVersionId: idSchema,
    parserVersion: z.string().min(1).max(100),
    key: z.string().min(1).max(200),
    expectedMappingId: idSchema.nullable(),
  })
  .strict()
export type ImportStructureApply = z.infer<typeof importStructureApplySchema>
export const importStructurePreviewSchema = z
  .object({
    sourceVersionId: idSchema,
    sourceHash: hashSchema,
    sourcePath: z.string().max(1500),
    parserVersion: z.string().max(100),
    pieces: z
      .array(
        z
          .object({
            key: z.string(),
            title: z.string(),
            format: editorialFormatSchema,
            components: z.number().int().nonnegative(),
            directMessages: z.number().int().nonnegative(),
            pieceId: idSchema,
            mappingId: idSchema.nullable(),
            state: z.enum(['new', 'imported', 'update', 'conflict']),
          })
          .strict(),
      )
      .max(100),
    issues: z.array(z.object({ key: z.string(), message: z.string() }).strict()).max(100),
  })
  .strict()
export type ImportStructurePreview = z.infer<typeof importStructurePreviewSchema>
export const importStructureResultSchema = z
  .object({
    status: z.enum(['applied', 'reused', 'conflict']),
    pieceId: idSchema,
    mappingId: idSchema.nullable(),
    message: z.string(),
  })
  .strict()
export type ImportStructureResult = z.infer<typeof importStructureResultSchema>
