import { canonical, capabilitySchema } from '@sistemazero/agent-core'
import type { McpConnection, McpOAuth, SchemaValidator } from '@sistemazero/agent-integrations/mcp'
import { z } from 'zod'
import { Credentials } from '../credentials'
import type { Dispatcher } from '../execution/dispatcher'
import { Locks } from '../execution/locks'
import type { Processes } from '../process/manager'
import type { Supervisor } from '../supervisor'
import { hash } from '../tools/paths'

const name = z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/)
const configuration = z.discriminatedUnion('transport', [
  z.object({
    name,
    transport: z.literal('stdio'),
    executable: z.string().min(1),
    args: z.array(z.string()).max(100),
    cwd: z.string(),
    credentials: z.record(z.string().regex(/^[A-Z_][A-Z0-9_]*$/), name).default({}),
  }),
  z.object({
    name,
    transport: z.literal('http'),
    url: z.url(),
    auth: z.enum(['none', 'token', 'oauth']).default('none'),
    authorizationOrigins: z.array(z.url()).max(10).default([]),
  }),
])
type Configuration = z.infer<typeof configuration>
const selected = z.object({
  server: name,
  configurationDigest: z.string(),
  remoteName: z.string(),
  remoteDigest: z.string(),
  definition: capabilitySchema,
})
export class McpRegistry {
  private credentials: Credentials
  private connections = new Map<string, { client: McpConnection; used: number }>()
  private oauth = new Map<string, McpOAuth>()
  private locks = new Locks()
  private active = new Map<string, number>()
  private mutating = new Set<string>()
  private registered = new Map<string, Set<string>>()
  private validator: SchemaValidator | undefined
  constructor(
    private supervisor: Supervisor,
    private dispatcher: Dispatcher,
    private processes: Processes,
  ) {
    this.credentials = new Credentials(supervisor.directory)
  }
  private async config(server: string) {
    return configuration.parse(
      await this.supervisor.store.call({ op: 'document.get', namespace: 'mcp.config', id: server }),
    )
  }
  private secretPrefix(config: Configuration) {
    return `mcp.${hash(canonical(config)).slice(0, 32)}.`
  }
  private async authorization(config: Extract<Configuration, { transport: 'http' }>) {
    let provider = this.oauth.get(config.name)
    if (!provider) {
      const { McpOAuth } = await import('@sistemazero/agent-integrations/mcp')
      const prefix = `${this.secretPrefix(config)}oauth.`
      provider = await McpOAuth.create(
        config.url,
        {
          get: (key) => this.credentials.get(prefix + key),
          set: (key, value) => this.credentials.set(prefix + key, value),
          delete: (key) => this.credentials.delete(prefix + key),
        },
        config.authorizationOrigins,
      )
      this.oauth.set(config.name, provider)
    }
    return provider
  }
  private async connection(config: Configuration, signal: AbortSignal) {
    return this.locks.with('connections', async () => {
      const cached = this.connections.get(config.name)
      if (cached?.client.connected) {
        cached.used = Date.now()
        return cached.client
      }
      if (cached) {
        await cached.client.close()
        this.connections.delete(config.name)
      }
      if (this.connections.size >= 4) {
        const idle = [...this.connections]
          .filter(([name]) => !this.active.get(name) && !this.mutating.has(name))
          .sort((left, right) => left[1].used - right[1].used)[0]
        if (!idle) throw new Error('All MCP connections are busy')
        await idle[1].client.close()
        this.connections.delete(idle[0])
      }
      const { McpConnection } = await import('@sistemazero/agent-integrations/mcp')
      let client: McpConnection
      if (config.transport === 'stdio') {
        const env: Record<string, string> = {}
        for (const [key, reference] of Object.entries(config.credentials)) {
          const value = await this.credentials.get(this.secretPrefix(config) + reference)
          if (!value) throw new Error(`MCP credential is missing: ${reference}`)
          env[key] = value
        }
        client = await McpConnection.stdio(
          await this.processes.open({
            executable: config.executable,
            args: config.args,
            cwd: config.cwd,
            env,
          }),
          signal,
        )
      } else {
        const token =
          config.auth === 'token'
            ? await this.credentials.get(`${this.secretPrefix(config)}token`)
            : undefined
        if (config.auth === 'token' && !token) throw new Error('MCP bearer token is missing')
        client = await McpConnection.http(config.url, signal, {
          token: token ?? undefined,
          oauth: config.auth === 'oauth' ? await this.authorization(config) : undefined,
          authorizationOrigins: config.authorizationOrigins,
        })
      }
      this.connections.set(config.name, { client, used: Date.now() })
      return client
    })
  }
  private async operation<T>(server: string, handler: () => Promise<T>) {
    this.active.set(server, (this.active.get(server) ?? 0) + 1)
    try {
      return await this.locks.with(`server:${server}`, handler)
    } finally {
      const count = (this.active.get(server) ?? 1) - 1
      if (count) this.active.set(server, count)
      else this.active.delete(server)
    }
  }
  private unregister(server: string) {
    for (const name of this.registered.get(server) ?? []) this.dispatcher.tools.delete(name)
    this.registered.delete(server)
  }
  private register(value: z.infer<typeof selected>) {
    this.dispatcher.register({
      definition: value.definition,
      validate: async (raw) => {
        this.validator ??= new (
          await import('@sistemazero/agent-integrations/mcp')
        ).SchemaValidator()
        await this.validator.validate(value.definition.input, raw)
      },
      execute: async (raw, context) =>
        this.operation(value.server, async () => {
          const config = await this.config(value.server)
          if (hash(canonical(config)) !== value.configurationDigest)
            throw new Error('MCP configuration changed; enable the tool again')
          const connection = await this.connection(config, context.signal)
          let cursor: string | undefined
          let found = false
          for (let page = 0; page < 10; page++) {
            const result = await connection.discover(cursor, context.signal)
            const current = result.tools.find((tool) => tool.name === value.remoteName)
            if (current) {
              if (current.digest !== value.remoteDigest)
                throw new Error('MCP schema changed; review and enable the new definition')
              found = true
              break
            }
            cursor = result.nextCursor
            if (!cursor) break
          }
          if (!found) throw new Error('MCP tool no longer exists in the bounded catalog')
          const result = await connection.call(
            value.remoteName,
            z.record(z.string(), z.unknown()).parse(raw),
            value.remoteDigest,
            context.signal,
          )
          if (result.isError)
            throw new Error(
              `Remote MCP tool reported failure: ${JSON.stringify(result.content).slice(0, 8000)}`,
            )
          return result
        }),
    })
    const names = this.registered.get(value.server) ?? new Set<string>()
    names.add(value.definition.name)
    this.registered.set(value.server, names)
  }
  async initialize() {
    const documents = z
      .array(z.array(selected))
      .parse(await this.supervisor.store.call({ op: 'document.list', namespace: 'mcp.selected' }))
    for (const entries of documents) for (const entry of entries) this.register(entry)
    this.supervisor.cleanup.add(() => this.close())
    const commands = this.supervisor.commands
    commands.set('mcp.list', async () =>
      this.supervisor.store.call({ op: 'document.list', namespace: 'mcp.config' }),
    )
    commands.set('mcp.configure', async (raw) => {
      const config = configuration.parse(raw)
      if (this.active.get(config.name))
        throw new Error('Finish active MCP calls before changing this server')
      const all = z
        .array(configuration)
        .parse(await this.supervisor.store.call({ op: 'document.list', namespace: 'mcp.config' }))
      if (all.length >= 20 && !all.some((item) => item.name === config.name))
        throw new Error('MCP configuration limit reached')
      if (config.transport === 'http') {
        const { endpointUrl } = await import('@sistemazero/agent-integrations/mcp')
        endpointUrl(config.url)
        for (const origin of config.authorizationOrigins) endpointUrl(origin)
      }
      await this.disconnect(config.name)
      await this.supervisor.store.call({
        op: 'document.batch',
        documents: [
          { namespace: 'mcp.config', id: config.name, value: config },
          { namespace: 'mcp.selected', id: config.name, value: [] },
        ],
      })
      this.unregister(config.name)
      return { configured: true, name: config.name }
    })
    commands.set('mcp.secret', async (raw) => {
      const input = z
        .object({ server: name, reference: name, value: z.string().min(1).max(4096) })
        .parse(raw)
      const config = await this.config(input.server)
      await this.credentials.set(this.secretPrefix(config) + input.reference, input.value)
      await this.disconnect(input.server)
      return { stored: true }
    })
    commands.set('mcp.discover', async (raw, signal) => {
      const input = z.object({ server: name, cursor: z.string().max(500).optional() }).parse(raw)
      return this.operation(input.server, async () => {
        const client = await this.connection(await this.config(input.server), signal)
        const result = await client.discover(input.cursor, signal)
        return {
          ...result,
          tools: result.tools.map((tool) => ({
            name: tool.name,
            description: tool.description?.slice(0, 1000),
            digest: tool.digest,
            readOnlyHint: tool.annotations?.readOnlyHint ?? false,
          })),
        }
      })
    })
    commands.set('mcp.enable', async (raw, signal) => {
      const input = z
        .object({
          server: name,
          tool: z.string(),
          digest: z.string(),
          effect: z.enum(['read', 'external']).default('external'),
        })
        .parse(raw)
      if (this.active.get(input.server))
        throw new Error('Finish active MCP calls before changing tool permissions')
      const config = await this.config(input.server)
      const client = await this.connection(config, signal)
      let cursor: string | undefined
      for (let page = 0; page < 10; page++) {
        const result = await client.discover(cursor, signal)
        const remote = result.tools.find((tool) => tool.name === input.tool)
        if (remote) {
          if (remote.digest !== input.digest) throw new Error('MCP definition changed since review')
          const definition = capabilitySchema.parse({
            name: `mcp_${config.name}_${hash(remote.name).slice(0, 12)}`,
            description: `${remote.name}: ${(remote.description ?? 'MCP tool').slice(0, 2000)}`,
            effect: input.effect,
            input: remote.inputSchema,
          })
          const value = selected.parse({
            server: config.name,
            configurationDigest: hash(canonical(config)),
            remoteName: remote.name,
            remoteDigest: remote.digest,
            definition,
          })
          const old = await this.supervisor.store.call({
            op: 'document.get',
            namespace: 'mcp.selected',
            id: config.name,
          })
          const entries = [
            ...z
              .array(selected)
              .parse(old ?? [])
              .filter((item) => item.remoteName !== remote.name),
            value,
          ]
          if (entries.length > 20 || Buffer.byteLength(JSON.stringify(entries)) > 128000)
            throw new Error('Selected MCP tools exceed schema budget')
          await this.supervisor.store.call({
            op: 'document.put',
            namespace: 'mcp.selected',
            id: config.name,
            value: entries,
          })
          this.unregister(config.name)
          for (const entry of entries) this.register(entry)
          return definition
        }
        cursor = result.nextCursor
        if (!cursor) break
      }
      throw new Error('MCP tool not found in the bounded catalog')
    })
    commands.set('mcp.disconnect', async (raw) => {
      const input = z.object({ server: name }).parse(raw)
      if (this.active.get(input.server)) throw new Error('MCP server has active calls')
      await this.disconnect(input.server)
      return { disconnected: true }
    })
    commands.set('mcp.disable', async (raw) => {
      const input = z.object({ server: name, tool: z.string().optional() }).parse(raw)
      const previous = z.array(selected).parse(
        (await this.supervisor.store.call({
          op: 'document.get',
          namespace: 'mcp.selected',
          id: input.server,
        })) ?? [],
      )
      const entries = input.tool ? previous.filter((entry) => entry.remoteName !== input.tool) : []
      await this.supervisor.store.call({
        op: 'document.put',
        namespace: 'mcp.selected',
        id: input.server,
        value: entries,
      })
      this.unregister(input.server)
      for (const entry of entries) this.register(entry)
      await this.disconnect(input.server)
      return { enabled: entries.map((entry) => entry.remoteName) }
    })
    commands.set('mcp.logout', async (raw) => {
      const config = await this.config(z.object({ server: name }).parse(raw).server)
      await this.disconnect(config.name)
      const references =
        config.transport === 'stdio'
          ? [...new Set(Object.values(config.credentials))]
          : ['token', 'oauth.tokens', 'oauth.client']
      for (const reference of references)
        await this.credentials.delete(this.secretPrefix(config) + reference)
      return { connected: false, credentialsRemoved: true }
    })
    commands.set('mcp.login', async (raw) => {
      const config = await this.config(z.object({ server: name }).parse(raw).server)
      if (config.transport !== 'http' || config.auth !== 'oauth')
        throw new Error('OAuth is not configured for this server')
      return (await this.authorization(config)).begin()
    })
    commands.set(
      'mcp.auth.status',
      async (raw) =>
        this.oauth.get(z.object({ server: name }).parse(raw).server)?.inspect() ?? {
          status: 'idle',
        },
    )
    for (const method of [
      'mcp.configure',
      'mcp.enable',
      'mcp.secret',
      'mcp.disconnect',
      'mcp.disable',
      'mcp.logout',
      'mcp.login',
    ]) {
      const handler = commands.get(method)
      if (!handler) throw new Error('Missing MCP command handler')
      commands.set(method, async (raw, signal) => {
        const server =
          method === 'mcp.configure'
            ? configuration.parse(raw).name
            : z.object({ server: name }).parse(raw).server
        return this.locks.with(`server:${server}`, async () => {
          if (this.active.get(server))
            throw new Error('Finish active MCP calls before changing this server')
          this.mutating.add(server)
          try {
            return await handler(raw, signal)
          } finally {
            this.mutating.delete(server)
          }
        })
      })
    }
  }
  private async disconnect(server: string) {
    const connection = this.connections.get(server)
    if (connection) {
      await connection.client.close()
      this.connections.delete(server)
    }
    this.oauth.get(server)?.close()
    this.oauth.delete(server)
  }
  async close() {
    this.validator?.close()
    for (const server of new Set([...this.connections.keys(), ...this.oauth.keys()]))
      await this.disconnect(server)
  }
}
