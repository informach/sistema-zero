import { artifactSchema, id } from '@sistemazero/agent-core'
import { z } from 'zod'
export const artifactRecordSchema = z.object({
  reference: artifactSchema,
  state: z.enum(['prepared', 'ready', 'deleting', 'deleted']),
  pinned: z.boolean(),
  createdAt: z.number(),
  usedAt: z.number(),
})
export const artifactCommand = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('artifact.reserve'),
    reference: artifactSchema,
    owner: id.optional(),
    pinned: z.boolean(),
    quota: z.number().int().positive(),
    now: z.number(),
  }),
  z.object({ op: z.literal('artifact.commit'), id }),
  z.object({ op: z.literal('artifact.read'), id, now: z.number() }),
  z.object({ op: z.literal('artifact.get'), id }),
  z.object({ op: z.literal('artifact.pin'), id, pinned: z.boolean() }),
  z.object({ op: z.literal('artifact.usage') }),
  z.object({ op: z.literal('artifact.gc'), before: z.number(), preparedBefore: z.number() }),
  z.object({ op: z.literal('artifact.deleted'), id }),
])
export type ArtifactCommand = z.infer<typeof artifactCommand>
