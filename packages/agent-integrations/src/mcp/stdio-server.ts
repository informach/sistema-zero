import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Capability, ToolOutcome } from '@sistemazero/agent-core'
import { JsonLineTransport } from './stdio'

export interface StdioInvocation {
  signal: AbortSignal
  ask?: (prompt: string, options: string[]) => Promise<string>
}
export async function serveMcpStdio(
  tools: Capability[],
  invoke: (
    name: string,
    input: unknown,
    id: string,
    context: StdioInvocation,
  ) => Promise<ToolOutcome>,
) {
  const definitions = new Map(tools.map((tool) => [tool.name, tool]))
  const rpc = new Server(
    { name: 'sistema-zero', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )
  const controller = new AbortController()
  const tasks = new Set<Promise<unknown>>()
  const identity = crypto.randomUUID()
  const transport = new JsonLineTransport({
    input: process.stdin,
    write: (data) =>
      new Promise<void>((resolve, reject) => {
        process.stdout.write(data, (error) => (error ? reject(error) : resolve()))
      }),
    close: async () => {
      process.stdin.pause()
    },
  })
  rpc.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: { ...tool.input, type: 'object' as const },
      annotations: { readOnlyHint: tool.effect === 'read' },
    })),
  }))
  rpc.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (!definitions.has(request.params.name)) throw new Error('Capability is not exposed')
    if (tasks.size >= 4) throw new Error('MCP invocation capacity reached')
    const signal = AbortSignal.any([controller.signal, extra.signal])
    const ask = rpc.getClientCapabilities()?.elicitation
      ? async (prompt: string, options: string[]) => {
          const result = await rpc.elicitInput(
            {
              mode: 'form',
              message: prompt,
              requestedSchema: {
                type: 'object',
                properties: {
                  answer: options.length ? { type: 'string', enum: options } : { type: 'string' },
                },
                required: ['answer'],
              },
            },
            { signal, timeout: 600000, maxTotalTimeout: 600000 },
          )
          if (result.action !== 'accept' || typeof result.content?.answer !== 'string')
            throw new Error('MCP input declined')
          return result.content.answer
        }
      : undefined
    const task = invoke(
      request.params.name,
      request.params.arguments ?? {},
      `${identity}:${extra.requestId}`,
      { signal, ask },
    )
    tasks.add(task)
    try {
      const outcome = await task
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(outcome) }],
        isError: outcome.kind !== 'ok',
      }
    } finally {
      tasks.delete(task)
    }
  })
  let ended!: () => void
  const closed = new Promise<void>((resolve) => {
    ended = resolve
  })
  rpc.onclose = () => {
    controller.abort(new Error('MCP input closed'))
    ended()
  }
  rpc.onerror = (error) => {
    console.error(error.message)
    void rpc.close()
  }
  try {
    await rpc.connect(transport)
    await closed
  } finally {
    controller.abort(new Error('MCP server stopped'))
    await rpc.close()
    await Promise.allSettled(tasks)
  }
}
