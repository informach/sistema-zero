import { createHash } from 'node:crypto'
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  type Tool,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { canonical } from '@sistemazero/agent-core'
import { boundedFetch, endpointUrl } from './http'
import { SchemaValidator } from './schema'
import { type ManagedProcess, ManagedStdioTransport } from './stdio'
export function toolDigest(tool: Tool) {
  return createHash('sha256')
    .update(
      canonical({
        name: tool.name,
        description: tool.description ?? '',
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema ?? null,
      }),
    )
    .digest('hex')
}
export class McpConnection {
  private client = new Client({ name: 'sistema-zero', version: '0.1.0' }, { capabilities: {} })
  private catalog = new Map<string, Tool>()
  private validator = new SchemaValidator()
  private active = 0
  private closed = false
  private terminate: (() => Promise<void>) | undefined
  private closing: Promise<void> | undefined
  generation = 0
  private constructor() {
    this.client.onclose = () => {
      this.closed = true
      this.validator.close(new Error('MCP disconnected'))
    }
    this.client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
      this.catalog.clear()
      this.generation++
    })
  }
  get connected() {
    return !this.closed
  }
  static async connect(transport: Transport, signal: AbortSignal) {
    const connection = new McpConnection()
    try {
      await connection.client.connect(transport, { signal, timeout: 15000, maxTotalTimeout: 15000 })
      return connection
    } catch (error) {
      await connection.close()
      throw error
    }
  }
  static stdio(process: ManagedProcess, signal: AbortSignal) {
    return McpConnection.connect(new ManagedStdioTransport(process), signal)
  }
  static async http(
    url: string,
    signal: AbortSignal,
    options: { token?: string; oauth?: OAuthClientProvider; authorizationOrigins?: string[] } = {},
  ) {
    const lifetime = new AbortController()
    const fetcher = boundedFetch(url, options.authorizationOrigins)
    const transport = new StreamableHTTPClientTransport(endpointUrl(url), {
      fetch: (target, init = {}) =>
        fetcher(target, {
          ...init,
          signal: AbortSignal.any([...(init.signal ? [init.signal] : []), lifetime.signal]),
        }),
      authProvider: options.oauth,
      requestInit: options.token
        ? { headers: { authorization: `Bearer ${options.token}` } }
        : undefined,
      reconnectionOptions: {
        initialReconnectionDelay: 1000,
        maxReconnectionDelay: 5000,
        reconnectionDelayGrowFactor: 2,
        maxRetries: 2,
      },
    })
    const connection = await McpConnection.connect(transport, signal)
    connection.terminate = async () => {
      const timer = setTimeout(
        () => lifetime.abort(new Error('MCP session cleanup deadline exceeded')),
        2000,
      )
      try {
        await transport.terminateSession()
      } finally {
        clearTimeout(timer)
        lifetime.abort()
      }
    }
    return connection
  }
  async discover(cursor: string | undefined, signal: AbortSignal) {
    if (this.closed) throw new Error('MCP connection closed')
    // Use the SDK request API; untrusted schema compilation and regex evaluation stay in our worker.
    const result = await this.client.request(
      { method: 'tools/list', params: cursor ? { cursor } : {} },
      ListToolsResultSchema,
      { signal, timeout: 15000, maxTotalTimeout: 15000 },
    )
    if (
      result.tools.length > 200 ||
      this.catalog.size + result.tools.filter((tool) => !this.catalog.has(tool.name)).length > 500
    )
      throw new Error('MCP catalog exceeds limit; configure a narrower server')
    for (const tool of result.tools) {
      if (Buffer.byteLength(JSON.stringify(tool)) > 64000)
        throw new Error('MCP tool schema exceeds 64 KB')
      this.catalog.set(tool.name, tool)
    }
    return {
      tools: result.tools.map((tool) => ({ ...tool, digest: toolDigest(tool) })),
      nextCursor: result.nextCursor,
      generation: this.generation,
    }
  }
  async call(
    name: string,
    args: Record<string, unknown>,
    expectedDigest: string,
    signal: AbortSignal,
  ) {
    if (this.closed) throw new Error('MCP connection closed')
    if (this.active >= 4) throw new Error('MCP server invocation capacity reached')
    const tool = this.catalog.get(name)
    if (!tool || toolDigest(tool) !== expectedDigest)
      throw new Error(
        'MCP schema changed or was not discovered; refresh and approve the current capability',
      )
    this.active++
    try {
      await this.validator.validate(tool.inputSchema, args)
      signal.throwIfAborted()
      const result = await this.client.request(
        { method: 'tools/call', params: { name, arguments: args } },
        CallToolResultSchema,
        { signal, timeout: 120000, maxTotalTimeout: 120000 },
      )
      if (tool.outputSchema && !result.isError) {
        if (result.structuredContent === undefined)
          throw new Error('MCP tool omitted declared structured output')
        await this.validator.validate(tool.outputSchema, result.structuredContent)
      }
      return result
    } finally {
      this.active--
    }
  }
  async close() {
    if (this.closing) return this.closing
    if (this.closed) return
    this.closed = true
    this.validator.close()
    this.closing = (async () => {
      try {
        await this.terminate?.()
      } finally {
        await this.client.close()
      }
    })()
    return this.closing
  }
}
