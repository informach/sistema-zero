import { z } from 'zod'

const completedItemSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('agentMessage'), text: z.string() }),
  z.object({
    type: z.literal('webSearch'),
    action: z.unknown().optional(),
    results: z.unknown().optional(),
  }),
  z.object({
    type: z.literal('imageGeneration'),
    result: z.string(),
    savedPath: z.string().nullish(),
    failure: z.unknown().optional(),
  }),
])
/** Ignore unrelated item kinds, validating every field the executor consumes.
 * The installed official schema permits a null savedPath for inline images. */
export function completedCodexItem(value: unknown) {
  const { type } = z.object({ type: z.string() }).parse(value)
  return ['agentMessage', 'webSearch', 'imageGeneration'].includes(type)
    ? completedItemSchema.parse(value)
    : null
}
