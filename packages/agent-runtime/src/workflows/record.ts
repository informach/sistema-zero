import { artifactSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
export const workflowRecordSchema = z.object({
  id: z.string(),
  digest: z.string(),
  intentDigest: z.string(),
  parentRunId: z.string(),
  sessionId: z.string(),
  workspace: z.string(),
  inputs: artifactSchema,
  state: z.enum(['running', 'paused', 'blocked', 'failed', 'canceled', 'succeeded']),
  generation: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deadlineAt: z.number(),
  error: z.string().optional(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        state: z.enum([
          'pending',
          'waiting',
          'running',
          'completed',
          'skipped',
          'failed',
          'unknown',
          'canceled',
        ]),
        attempt: z.number().int().nonnegative().default(0),
        runId: z.string().optional(),
        wakeAt: z.number().optional(),
        output: artifactSchema.optional(),
        index: z.number().int().nonnegative().default(0),
        items: artifactSchema.optional(),
        results: z.array(artifactSchema).max(20).default([]),
        error: z.string().optional(),
      }),
    )
    .max(100),
})
export type WorkflowRecord = z.infer<typeof workflowRecordSchema>
export type WorkflowStep = WorkflowRecord['nodes'][number]
