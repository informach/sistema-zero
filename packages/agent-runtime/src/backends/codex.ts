import { z } from 'zod'
import type { Processes } from '../process/manager'
import { ProcessRpc } from '../process/rpc'
import {
  type AgentBackend,
  type BackendEvent,
  type BackendRequest,
  type InterruptReceipt,
  Mailbox,
} from './contract'
import { nativeVersion } from './native-process'

const object = z.record(z.string(), z.unknown())
export class CodexBackend implements AgentBackend {
  private active = new Map<string, { rpc: ProcessRpc; threadId: string; turnId: string }>()
  constructor(private processes: Processes) {}
  async connect(workspace: string, signal: AbortSignal, managed = false) {
    const version = await nativeVersion(this.processes, 'codex', workspace, signal)
    const process = await this.processes.open({
      executable: version.executable,
      args: [
        'app-server',
        '--stdio',
        ...[
          'apps',
          'plugins',
          'hooks',
          'multi_agent',
          'browser_use',
          'browser_use_external',
          'remote_plugin',
          ...(managed ? ['shell_tool'] : []),
        ].flatMap((feature) => ['--disable', feature]),
        '-c',
        'web_search="disabled"',
      ],
      cwd: workspace,
    })
    const rpc = new ProcessRpc(process)
    const abort = () => process.cancel()
    signal.addEventListener('abort', abort, { once: true })
    try {
      signal.throwIfAborted()
      await rpc.request('initialize', {
        clientInfo: { name: 'sistema_zero', title: 'Sistema Zero', version: '0.1.0' },
        capabilities: { experimentalApi: false },
      })
      rpc.notify('initialized')
      signal.removeEventListener('abort', abort)
      return {
        rpc,
        version,
        close: async () => {
          signal.removeEventListener('abort', abort)
          await rpc.close()
        },
      }
    } catch (error) {
      signal.removeEventListener('abort', abort)
      await rpc.close()
      throw error
    }
  }
  async account(workspace: string, signal: AbortSignal) {
    const connection = await this.connect(workspace, signal)
    try {
      const response = z
        .object({
          account: z.object({ type: z.string(), planType: z.string().optional() }).nullable(),
          requiresOpenaiAuth: z.boolean(),
        })
        .parse(await connection.rpc.request('account/read', { refreshToken: false }))
      return {
        ...connection.version,
        connected: response.account?.type === 'chatgpt',
        method: response.account?.type ?? 'none',
        subscription: response.account?.planType ?? null,
      }
    } finally {
      await connection.close()
    }
  }
  async models(workspace: string, signal: AbortSignal) {
    const connection = await this.connect(workspace, signal)
    try {
      return await connection.rpc.request('model/list', { limit: 50 })
    } finally {
      await connection.close()
    }
  }
  async *start(request: BackendRequest, signal: AbortSignal): AsyncGenerator<BackendEvent> {
    const connection = await this.connect(request.workspace, signal, Boolean(request.bridge))
    const { rpc, version } = connection
    const mailbox = new Mailbox<{ method: string; params: unknown }>()
    let threadId = ''
    let turnId = ''
    let text = ''
    let steps = 0
    const items = new Map<string, unknown>()
    const itemSizes = new Map<string, number>()
    let itemBytes = 0
    rpc.onNotification = (method, params) => {
      if (method === 'turn/started') {
        const started = z
          .object({ threadId: z.string(), turn: z.object({ id: z.string() }) })
          .parse(params)
        if (started.threadId === threadId) {
          turnId = started.turn.id
          this.active.set(request.run.id, { rpc, threadId, turnId })
        }
      }
      if (method === 'item/started' || method === 'item/completed') {
        const item = z
          .object({
            threadId: z.string(),
            turnId: z.string(),
            item: z.object({ id: z.string() }).passthrough(),
          })
          .parse(params)
        if (item.threadId === threadId && item.turnId === turnId) {
          if (items.size >= 200 && !items.has(item.item.id))
            throw new Error('Native item limit exceeded')
          const size = Buffer.byteLength(JSON.stringify(item.item))
          itemBytes += size - (itemSizes.get(item.item.id) ?? 0)
          if (itemBytes > 4_000_000) throw new Error('Native item cache exceeds 4 MB')
          itemSizes.set(item.item.id, size)
          items.set(item.item.id, item.item)
        }
      }
      mailbox.push({ method, params })
    }
    rpc.onFailure = (error) => mailbox.fail(error)
    try {
      if (!version.certified)
        throw new Error(`Codex ${version.version} is not certified; expected 0.162.1`)
      const account = z
        .object({ account: z.object({ type: z.string() }).nullable() })
        .parse(await rpc.request('account/read', { refreshToken: false }))
      if (account.account?.type !== 'chatgpt')
        throw new Error('Codex subscription login required. Run sistemazero auth codex login.')
      rpc.onRequest = async (method, raw) => {
        const params = object.parse(raw)
        if (params.threadId !== threadId || params.turnId !== turnId)
          throw new Error('Approval does not belong to the active native turn')
        if (method === 'item/tool/requestUserInput') {
          const input = z
            .object({
              questions: z
                .array(
                  z.object({
                    id: z.string(),
                    question: z.string(),
                    options: z
                      .array(z.object({ label: z.string() }))
                      .nullable()
                      .optional(),
                  }),
                )
                .max(10),
            })
            .parse(params)
          const answers: Record<string, { answers: string[] }> = {}
          for (const question of input.questions)
            answers[question.id] = {
              answers: [
                await request.ask(
                  question.question,
                  question.options?.map((option) => option.label) ?? [],
                  'input',
                  signal,
                ),
              ],
            }
          return { answers }
        }
        if (
          method === 'item/commandExecution/requestApproval' ||
          method === 'item/fileChange/requestApproval'
        ) {
          if (request.run.mode === 'plan' || request.bridge) return { decision: 'decline' }
          const change =
            method === 'item/fileChange/requestApproval'
              ? items.get(z.string().parse(params.itemId))
              : undefined
          if (method === 'item/fileChange/requestApproval' && !change)
            return { decision: 'decline' }
          const preview = JSON.stringify(
            { request: params, ...(change ? { change } : {}) },
            null,
            2,
          )
          if (Buffer.byteLength(preview) > 12000) return { decision: 'decline' }
          const answer = await request.ask(
            `Codex · ${method}\n${preview}`,
            ['approve', 'deny'],
            'approval',
            signal,
          )
          return { decision: answer === 'approve' ? 'accept' : 'decline' }
        }
        // Permission expansion and remote elicitation require a separately certified policy.
        if (method === 'item/permissions/requestApproval') return { permissions: {}, scope: 'turn' }
        if (method === 'mcpServer/elicitation/request') return { action: 'decline', content: null }
        throw new Error(`Unsupported native request: ${method}`)
      }
      const configuration = z
        .object({ config: z.object({ mcp_servers: z.record(z.string(), z.unknown()).optional() }) })
        .parse(await rpc.request('config/read', { cwd: request.workspace, includeLayers: false }))
      const disabledServers = Object.fromEntries(
        Object.keys(configuration.config.mcp_servers ?? {}).map((name) => [
          name,
          { enabled: false },
        ]),
      )
      const base = {
        cwd: request.workspace,
        model: request.run.model || undefined,
        approvalPolicy: request.run.mode === 'plan' ? 'never' : 'untrusted',
        approvalsReviewer: 'user',
        sandbox: request.run.mode === 'plan' || request.bridge ? 'read-only' : 'workspace-write',
        developerInstructions: request.instructions,
        config: {
          model_provider: 'openai',
          forced_login_method: 'chatgpt',
          mcp_servers: {
            ...disabledServers,
            ...(request.bridge
              ? {
                  sistemazero: {
                    enabled: true,
                    default_tools_approval_mode: 'approve',
                    tool_timeout_sec: 900,
                    url: request.bridge.url,
                    http_headers: { Authorization: `Bearer ${request.bridge.token}` },
                  },
                }
              : {}),
          },
        },
      }
      const started = z.object({ thread: z.object({ id: z.string() }) }).parse(
        await rpc.request(request.nativeSessionId ? 'thread/resume' : 'thread/start', {
          ...base,
          ...(request.nativeSessionId ? { threadId: request.nativeSessionId } : {}),
        }),
      )
      threadId = started.thread.id
      const servers = z
        .object({
          data: z.array(z.object({ name: z.string(), tools: z.record(z.string(), z.unknown()) })),
        })
        .parse(await rpc.request('mcpServerStatus/list', { threadId, limit: 100 }))
      if (
        servers.data.some(
          (server) =>
            Object.keys(server.tools).length && (!request.bridge || server.name !== 'sistemazero'),
        )
      )
        throw new Error('Native client retained unapproved MCP tools')
      if (
        request.bridge &&
        !servers.data.some(
          (server) => server.name === 'sistemazero' && Object.keys(server.tools).length,
        )
      )
        throw new Error('Sistema Zero MCP bridge did not initialize')
      yield { type: 'session', sessionId: threadId }
      const turn = z.object({ turn: z.object({ id: z.string() }) }).parse(
        await rpc.request('turn/start', {
          threadId,
          input: [{ type: 'text', text: request.run.input, text_elements: [] }],
          clientUserMessageId: request.run.id,
        }),
      )
      turnId = turn.turn.id
      this.active.set(request.run.id, { rpc, threadId, turnId })
      yield { type: 'session', sessionId: threadId, turnId }
      while (true) {
        const event = await mailbox.take(signal)
        const data = object.parse(event.params)
        if (data.threadId !== threadId) continue
        if (typeof data.turnId === 'string' && data.turnId !== turnId) continue
        if (event.method === 'item/agentMessage/delta') {
          const delta = z.string().max(128000).parse(data.delta)
          text += delta
          if (Buffer.byteLength(text) > 128000) throw new Error('Native response exceeds limit')
          yield { type: 'text', text: delta }
        } else if (event.method === 'item/started') {
          const item = z.object({ type: z.string(), id: z.string() }).parse(data.item)
          if (
            ['commandExecution', 'fileChange', 'mcpToolCall', 'dynamicToolCall'].includes(
              item.type,
            ) &&
            ++steps > request.run.maxSteps
          )
            throw new Error('Native step limit exceeded')
          yield { type: 'progress', name: item.type, detail: item.id }
        } else if (event.method === 'item/completed') {
          const item = z
            .object({
              type: z.string(),
              id: z.string(),
              status: z.string().optional(),
              aggregatedOutput: z.string().nullable().optional(),
              exitCode: z.number().nullable().optional(),
            })
            .parse(data.item)
          if (item.type !== 'agentMessage')
            yield {
              type: 'progress',
              name: item.type,
              detail: JSON.stringify(item).slice(0, 16000),
            }
        } else if (event.method === 'thread/tokenUsage/updated')
          yield { type: 'usage', value: { billing: 'subscription', estimate: true, ...data } }
        else if (event.method === 'turn/completed') {
          const completed = z
            .object({ id: z.string(), status: z.string(), error: z.unknown().optional() })
            .parse(data.turn)
          if (completed.id !== turnId) continue
          if (completed.status !== 'completed') throw new Error(`Codex turn ${completed.status}`)
          yield { type: 'completed', text }
          return
        }
      }
    } finally {
      if (signal.aborted) await this.interrupt(request.run.id)
      this.active.delete(request.run.id)
      await connection.close()
    }
  }
  async interrupt(runId: string): Promise<InterruptReceipt> {
    const task = this.active.get(runId)
    if (!task) return { requested: false, acknowledged: false, reason: 'No active native turn' }
    try {
      await task.rpc.request(
        'turn/interrupt',
        { threadId: task.threadId, turnId: task.turnId },
        1500,
      )
      return { requested: true, acknowledged: true }
    } catch (error) {
      task.rpc.process.cancel()
      return {
        requested: true,
        acknowledged: false,
        reason: error instanceof Error ? error.message : 'Interrupt failed',
      }
    }
  }
}
