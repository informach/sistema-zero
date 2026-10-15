import {
  effectSchema,
  id,
  memorySchema,
  questionSchema,
  runSchema,
  sessionSchema,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { artifactCommand } from './artifact-schema'
export const storeCommand = z.discriminatedUnion('op', [
  ...artifactCommand.options,
  z.object({ op: z.literal('memory.put'), value: memorySchema }),
  z.object({
    op: z.literal('memory.update'),
    id,
    workspace: z.string(),
    expectedUpdatedAt: z.string(),
    body: memorySchema.shape.body,
    evidence: memorySchema.shape.evidence,
  }),
  z.object({
    op: z.literal('memory.page'),
    workspace: z.string(),
    offset: z.number().int().nonnegative().default(0),
  }),
  z.object({
    op: z.literal('memory.search'),
    workspace: z.string(),
    sessionId: z.string().optional(),
    query: z.string().max(1000),
    offset: z.number().int().nonnegative().default(0),
  }),
  z.object({ op: z.literal('memory.delete'), id, workspace: z.string() }),
  z.object({ op: z.literal('session.put'), value: sessionSchema }),
  z.object({
    op: z.literal('session.fork'),
    value: sessionSchema,
    context: z.object({
      workspace: z.string(),
      sourceSessionId: z.string(),
      throughRunId: z.string().optional(),
      text: z.string().max(64000),
      sha256: z.string(),
      archive: z.unknown(),
    }),
  }),
  z.object({ op: z.literal('session.get'), id }),
  z.object({ op: z.literal('session.list'), offset: z.number().int().min(0).default(0) }),
  z.object({ op: z.literal('run.put'), value: runSchema, requestId: id, digest: z.string() }),
  z.object({ op: z.literal('run.get'), id }),
  z.object({ op: z.literal('run.cursor'), id }),
  z.object({ op: z.literal('run.list'), sessionId: id.optional() }),
  z.object({
    op: z.literal('history.page'),
    namespace: z.enum(['sessions', 'runs']),
    sessionId: id.optional(),
    workspace: z.string().optional(),
    before: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100),
  }),
  z.object({ op: z.literal('session.snapshot'), sessionId: id }),
  z.object({
    op: z.literal('run.state'),
    id,
    state: runSchema.shape.state,
    error: z.string().optional(),
  }),
  z.object({ op: z.literal('event.append'), runId: id, type: z.string(), payload: z.unknown() }),
  z.object({
    op: z.literal('event.list'),
    runId: id,
    after: z.number().int().nonnegative().default(0),
    limit: z.number().int().min(1).max(100).default(100),
  }),
  z.object({ op: z.literal('event.last'), runId: id, type: z.string() }),
  z.object({
    op: z.literal('event.tail'),
    runId: id,
    before: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100),
  }),
  z.object({
    op: z.literal('budget.reserve'),
    runId: id,
    id,
    amount: z.number().finite().nonnegative(),
    limit: z.number().finite().positive(),
  }),
  z.object({
    op: z.literal('budget.settle'),
    runId: id,
    id,
    cost: z.number().finite().nonnegative().optional(),
    generationId: z.string(),
  }),
  z.object({ op: z.literal('budget.list'), runId: id }),
  z.object({ op: z.literal('question.put'), value: questionSchema }),
  z.object({ op: z.literal('question.list'), runId: id }),
  z.object({ op: z.literal('question.answer'), id, answer: z.string().max(128000) }),
  z.object({ op: z.literal('effect.put'), value: effectSchema }),
  z.object({ op: z.literal('effect.get'), id }),
  z.object({ op: z.literal('effect.pending'), runId: id }),
  z.object({ op: z.literal('effect.uncertain'), operationDigest: z.string() }),
  z.object({
    op: z.literal('effect.reconcile'),
    id,
    resolution: z.enum(['confirmed', 'failed']),
    evidence: z.string().min(10).max(8000),
  }),
  z.object({
    op: z.literal('document.batch'),
    documents: z
      .array(z.object({ namespace: z.string(), id, value: z.unknown() }))
      .min(1)
      .max(50),
  }),
  z.object({
    op: z.literal('document.guarded'),
    guards: z
      .array(
        z.object({
          namespace: z.string(),
          id,
          field: z.enum(['generation', 'state']),
          equals: z.union([z.string(), z.number()]),
        }),
      )
      .min(1)
      .max(4),
    documents: z
      .array(z.object({ namespace: z.string(), id, value: z.unknown() }))
      .min(1)
      .max(50),
  }),
  z.object({ op: z.literal('document.put'), namespace: z.string(), id, value: z.unknown() }),
  z.object({ op: z.literal('document.get'), namespace: z.string(), id }),
  z.object({ op: z.literal('document.list'), namespace: z.string() }),
  z.object({
    op: z.literal('document.page'),
    namespace: z.string(),
    after: z.string().default(''),
    states: z.array(z.string()).max(20).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  z.object({ op: z.literal('recover') }),
  z.object({ op: z.literal('close') }),
])
export type StoreCommand = z.infer<typeof storeCommand>
