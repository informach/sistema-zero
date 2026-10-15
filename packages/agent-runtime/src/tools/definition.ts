import type { Capability, ToolContext, ToolDefinition } from '@sistemazero/agent-core'
import { z } from 'zod'

export function tool<S extends z.ZodType>(
  name: string,
  description: string,
  effect: Capability['effect'],
  schema: S,
  execute: (input: z.output<S>, context: ToolContext) => Promise<unknown>,
): ToolDefinition {
  return {
    // Zod attaches a non-enumerable Standard Schema adapter containing functions.
    // Persist the actual JSON Schema wire representation, not library metadata.
    definition: {
      name,
      description,
      effect,
      input: z
        .record(z.string(), z.unknown())
        .parse(JSON.parse(JSON.stringify(z.toJSONSchema(schema, { io: 'input' })))),
    },
    validate: (input) => {
      schema.parse(input)
    },
    execute: (input, context) => execute(schema.parse(input), context),
  }
}
