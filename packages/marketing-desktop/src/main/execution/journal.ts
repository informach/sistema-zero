import { z } from 'zod'
import { hashSchema, idSchema } from '../../../../marketing-contracts/src/common'
import {
  claimRunSchema,
  finishRunSchema,
  outcomeSchema,
} from '../../../../marketing-contracts/src/execution'
export const completedResultSchema = outcomeSchema.options[0]
export const executionJournalSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: idSchema,
    projectId: idSchema,
    contextHash: hashSchema,
    claim: claimRunSchema,
    stage: z.enum([
      'prepared',
      'generating',
      'result',
      'transferring',
      'completing',
      'confirmed',
      'interrupted',
    ]),
    result: completedResultSchema.nullable(),
    previousResults: z.array(completedResultSchema).max(3),
    finish: finishRunSchema.nullable(),
    error: z.string().max(1000).nullable(),
  })
  .strict()
export type ExecutionJournal = z.infer<typeof executionJournalSchema>
export type ProductionResult = z.infer<typeof completedResultSchema>
