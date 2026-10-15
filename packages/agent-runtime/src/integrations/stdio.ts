import { realpath } from 'node:fs/promises'
import {
  capabilitySchema,
  eventSchema,
  outcomeSchema,
  questionSchema,
  runSchema,
  sessionSchema,
  terminalStates,
} from '@sistemazero/agent-core'
import { serveMcpStdio } from '@sistemazero/agent-integrations/mcp'
import { z } from 'zod'
import { connectRuntime } from '../client'

export async function serveTools(workspace: string, mode: 'plan' | 'build') {
  const client = await connectRuntime()
  try {
    const session = sessionSchema.parse(
      await client.request('session.create', {
        workspace: await realpath(workspace),
        title: 'MCP',
      }),
    )
    const tools = z
      .array(capabilitySchema)
      .parse(await client.request('capabilities'))
      .filter((tool) => mode === 'build' || tool.effect === 'read')
    await serveMcpStdio(tools, async (name, input, id, context) => {
      context.signal.throwIfAborted()
      const run = runSchema.parse(
        await client.request('run.start', {
          requestId: id,
          sessionId: session.id,
          input: name,
          mode,
          task: { kind: 'tool', name, arguments: input },
        }),
      )
      const cancel = () => {
        void client
          .request('run.cancel', { id: run.id })
          .catch((error) => console.error(String(error)))
      }
      context.signal.addEventListener('abort', cancel, { once: true })
      let cursor = 0
      let outcome: z.infer<typeof outcomeSchema> | undefined
      try {
        while (true) {
          context.signal.throwIfAborted()
          const events = z
            .array(eventSchema)
            .parse(await client.request('events', { runId: run.id, after: cursor, wait: true }))
          for (const event of events) {
            cursor = event.sequence
            if (event.type === 'tool.result') outcome = outcomeSchema.parse(event.payload)
            if (event.type === 'question.created' && context.ask) {
              const question = questionSchema.parse(event.payload)
              const answer = await context.ask(question.prompt, question.options)
              await client.request('question.answer', { id: question.id, answer })
            }
            if (event.type === 'run.state') {
              const state = runSchema.parse(event.payload)
              if (terminalStates.has(state.state))
                return (
                  outcome ?? {
                    kind: 'failed',
                    code: state.state,
                    message: state.error ?? state.state,
                    retry: 'never',
                  }
                )
            }
          }
        }
      } catch (error) {
        await client.request('run.cancel', { id: run.id })
        throw error
      } finally {
        context.signal.removeEventListener('abort', cancel)
      }
    })
  } finally {
    client.close()
  }
}
