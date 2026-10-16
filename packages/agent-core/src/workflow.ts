import { z } from 'zod'

const jsonSchema = z.record(z.string(), z.unknown())
const base = {
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/),
  dependsOn: z.array(z.string()).max(100).default([]),
  when: z.object({ node: z.string(), equals: z.boolean() }).optional(),
  attempts: z.number().int().min(1).max(3).default(1),
}
export const workflowNodeSchema = z.discriminatedUnion('kind', [
  z.object({
    ...base,
    kind: z.literal('capability'),
    tool: z.string(),
    input: jsonSchema,
    outputSchema: jsonSchema,
  }),
  z.object({
    ...base,
    kind: z.literal('agent'),
    prompt: z.unknown(),
    mode: z.enum(['plan', 'build']).optional(),
    context: z.array(z.unknown()).max(10).default([]),
    outputSchema: jsonSchema,
  }),
  z.object({
    ...base,
    kind: z.literal('wait'),
    milliseconds: z.number().int().min(0).max(86400000),
  }),
  z.object({
    ...base,
    kind: z.literal('condition'),
    left: z.unknown(),
    operator: z.enum(['equals', 'not_equals', 'exists']),
    right: z.unknown().optional(),
  }),
  z.object({
    ...base,
    kind: z.literal('foreach'),
    items: z.unknown(),
    maxItems: z.number().int().min(1).max(20).default(10),
    tool: z.string(),
    input: jsonSchema,
    itemOutputSchema: jsonSchema,
  }),
])
export const workflowDocumentSchema = z.object({
  version: z.literal(1),
  name: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/),
  description: z.string().max(2000),
  inputSchema: jsonSchema,
  nodes: z.array(workflowNodeSchema).min(1).max(100),
  maxDurationMs: z
    .number()
    .int()
    .min(1000)
    .max(7 * 86400000)
    .default(3600000),
})
export type WorkflowDocument = z.infer<typeof workflowDocumentSchema>
export type WorkflowNode = z.infer<typeof workflowNodeSchema>
export const compiledWorkflowSchema = z.object({
  version: z.literal(1),
  digest: z.string(),
  document: workflowDocumentSchema,
  capabilities: z.record(
    z.string(),
    z.object({
      digest: z.string(),
      effect: z.enum(['read', 'workspace', 'process', 'external']),
      input: jsonSchema,
    }),
  ),
  outputs: z.record(z.string(), jsonSchema),
})
export type CompiledWorkflow = z.infer<typeof compiledWorkflowSchema>

export const scheduleSpecSchema = z.object({
  timezone: z.string().min(1).max(100),
  time: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7).default([1, 2, 3, 4, 5, 6, 7]),
  repeatedTime: z.enum(['earlier', 'later']).default('earlier'),
  missed: z.enum(['skip', 'coalesce', 'catch_up']).default('coalesce'),
  maxCatchUp: z.number().int().min(1).max(10).default(3),
  overlap: z.enum(['skip', 'queue_one', 'queue']).default('skip'),
})
export type ScheduleSpec = z.infer<typeof scheduleSpecSchema>
