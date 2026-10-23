import { randomBytes, timingSafeEqual } from 'node:crypto'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import {
  CallToolRequestSchema,
  isInitializeRequest,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { Capability, ToolOutcome } from '@sistemazero/agent-core'
export interface McpBinding {
  tools: Capability[]
  signal: AbortSignal
  invoke: (
    name: string,
    input: unknown,
    requestId: string,
    signal: AbortSignal,
  ) => Promise<ToolOutcome>
}
export async function startMcpServer(binding: McpBinding) {
  const token = randomBytes(32).toString('hex')
  const definitions = new Map(binding.tools.map((tool) => [tool.name, tool]))
  const tasks = new Set<Promise<unknown>>()
  const controller = new AbortController()
  const sessions = new Map<
    string,
    { rpc: Server; transport: WebStandardStreamableHTTPServerTransport }
  >()
  async function session() {
    if (sessions.size >= 4) throw new Error('MCP session capacity reached')
    const identity = crypto.randomUUID()
    const rpc = new Server(
      { name: 'sistema-zero', version: '0.1.0' },
      { capabilities: { tools: {} } },
    )
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => identity,
      enableJsonResponse: true,
      onsessionclosed: () => {
        sessions.delete(identity)
      },
    })
    sessions.set(identity, { rpc, transport })
    transport.onclose = () => sessions.delete(identity)
    rpc.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [...definitions.values()].map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: { ...tool.input, type: 'object' as const },
        annotations: {
          readOnlyHint: tool.effect === 'read',
          destructiveHint: tool.effect !== 'read',
          openWorldHint: tool.effect === 'external',
        },
      })),
    }))
    rpc.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      if (!definitions.has(request.params.name))
        throw new Error('Capability is not exposed by this binding')
      if (tasks.size >= 8) throw new Error('MCP invocation capacity reached')
      const task = (async () => {
        const outcome = await binding.invoke(
          request.params.name,
          request.params.arguments ?? {},
          `${identity}:${extra.requestId}`,
          AbortSignal.any([binding.signal, controller.signal, extra.signal]),
        )
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(outcome) }],
          isError: outcome.kind !== 'ok',
        }
      })()
      tasks.add(task)
      try {
        return await task
      } finally {
        tasks.delete(task)
      }
    })
    try {
      await rpc.connect(transport)
    } catch (error) {
      sessions.delete(identity)
      await rpc.close()
      throw error
    }
    return { rpc, transport, identity }
  }
  let requests = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    maxRequestBodySize: 1_000_000,
    idleTimeout: 0,
    async fetch(request) {
      const url = new URL(request.url)
      if (url.pathname !== '/mcp') return new Response('Not found', { status: 404 })
      if (
        request.headers.get('host') !== `127.0.0.1:${server.port}` ||
        request.headers.has('origin')
      )
        return new Response('Forbidden origin', { status: 403 })
      const bearer = request.headers.get('authorization') ?? ''
      const expected = `Bearer ${token}`
      if (
        Buffer.byteLength(bearer) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(bearer), Buffer.from(expected))
      )
        return new Response('Unauthorized', { status: 401 })
      if (requests >= 16) return new Response('Too many requests', { status: 429 })
      requests++
      try {
        const id = request.headers.get('mcp-session-id')
        if (id) {
          const existing = sessions.get(id)
          return existing
            ? await existing.transport.handleRequest(request)
            : new Response('Session expired', { status: 404 })
        }
        if (request.method !== 'POST')
          return new Response('Initialize a session first', { status: 400 })
        const body: unknown = await request.json()
        if (!isInitializeRequest(body))
          return new Response('Initialize a session first', { status: 400 })
        const created = await session()
        try {
          return await created.transport.handleRequest(request, { parsedBody: body })
        } finally {
          if (!created.transport.sessionId) {
            sessions.delete(created.identity)
            await created.rpc.close()
          }
        }
      } catch {
        return new Response('MCP request failed', { status: 400 })
      } finally {
        requests--
      }
    },
  })
  const close = async () => {
    controller.abort(new Error('MCP binding closed'))
    server.stop(true)
    await Promise.allSettled([...sessions.values()].map((session) => session.rpc.close()))
    await Promise.allSettled(tasks)
    sessions.clear()
  }
  return { url: `http://127.0.0.1:${server.port}/mcp`, token, close }
}
