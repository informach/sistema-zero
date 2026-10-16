import { z } from 'zod'
import { idSchema } from './common'
import { editorialFormatSchema, mediumSchema } from './editorial'

export const learningPieceSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    analysisId: idSchema,
    expectedRevisionId: idSchema,
    title: z.string().trim().min(1).max(300),
    brief: z.string().trim().min(1).max(80000),
    hypothesis: z.string().trim().min(1).max(6000),
    criterion: z.string().trim().min(1).max(2000),
    objective: z.string().trim().min(1).max(2000),
    format: editorialFormatSchema,
    medium: mediumSchema,
  })
  .strict()
export type LearningPiece = z.infer<typeof learningPieceSchema>
