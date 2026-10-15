import {
  artifactSchema,
  environmentLeaseSchema,
  teamHandoffSchema,
  teamPlanSchema,
} from '@sistemazero/agent-core'
import { z } from 'zod'

export const teamRecordSchema = z.object({
  id: z.string(),
  intentDigest: z.string(),
  parentRunId: z.string(),
  sessionId: z.string(),
  workspace: z.string(),
  plan: teamPlanSchema,
  state: z.enum([
    'preparing',
    'running',
    'blocked',
    'interrupted',
    'canceled',
    'ready',
    'applying',
    'applied',
  ]),
  generation: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  error: z.string().optional(),
  baseSnapshotId: z.string().optional(),
  baseSourceDigest: z.string().optional(),
  integration: environmentLeaseSchema.optional(),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        state: z.enum([
          'pending',
          'preparing',
          'running',
          'integrating',
          'succeeded',
          'failed',
          'blocked',
        ]),
        sessionId: z.string().optional(),
        runId: z.string().optional(),
        lease: environmentLeaseSchema.optional(),
        snapshotId: z.string().optional(),
        handoff: teamHandoffSchema.optional(),
        export: artifactSchema.optional(),
        error: z.string().optional(),
      }),
    )
    .max(6),
  result: artifactSchema.optional(),
  reviewedDigest: z.string().optional(),
})
export type TeamRecord = z.infer<typeof teamRecordSchema>
