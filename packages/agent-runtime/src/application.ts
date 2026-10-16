import { runSchema, terminalStates } from '@sistemazero/agent-core'
import { z } from 'zod'
import { NativeBackends } from './backends/service'
import { setupBrowser } from './browser/setup'
import { setupContext } from './context/setup'
import { Credentials } from './credentials'
import { setupEnvironments } from './environments/setup'
import { Dispatcher } from './execution/dispatcher'
import { McpRegistry } from './integrations/mcp'
import { setupNotifications } from './integrations/notifications'
import { setupStaff } from './integrations/staff'
import { AgentLoop } from './models/loop'
import { modelCatalog, OpenRouter } from './models/openrouter'
import { Processes } from './process/manager'
import { setupServices } from './services/setup'
import { setupSessions } from './sessions'
import { Artifacts } from './store/artifacts'
import type { Supervisor } from './supervisor'
import { setupTeams } from './team/setup'
import { registerCatalog } from './tools/catalog'
import { checkTools } from './tools/checks'
import { codingTools } from './tools/coding'
import { contextTools } from './tools/context'
import { tool } from './tools/definition'
import { listTool, questionTool, readTool } from './tools/read'
import { searchTool } from './tools/search'
import { setupWorkflows } from './workflows/setup'
import { Patches } from './workspace/patch'
import { Workspaces } from './workspace/snapshot'

export function configure(supervisor: Supervisor) {
  const credentials = new Credentials(supervisor.directory)
  const dispatcher = new Dispatcher(supervisor)
  registerCatalog(dispatcher)
  const processes = new Processes(supervisor.directory)
  const native = new NativeBackends(supervisor, processes, dispatcher)
  const patches = new Patches(supervisor.store, supervisor.directory)
  const workspaces = new Workspaces(supervisor.store, processes, supervisor.directory)
  setupSessions(supervisor)
  const artifacts = new Artifacts(supervisor.directory)
  supervisor.commands.set('storage.status', async () => ({
    quotaBytes: 5 * 1024 ** 3,
    retentionDays: 30,
    usage: await supervisor.store.call({ op: 'artifact.usage' }),
  }))
  supervisor.commands.set('storage.collect', async () => artifacts.collect())
  supervisor.commands.set('storage.pin', async (raw) =>
    supervisor.store.call({
      op: 'artifact.pin',
      ...z.object({ id: z.string(), pinned: z.boolean() }).parse(raw),
    }),
  )
  const collection = setInterval(() => {
    void Promise.all([artifacts.collect(), processes.collect()]).catch((error) => {
      supervisor.recoveryError = `Artifact collection: ${error instanceof Error ? error.message : 'failed'}`
    })
  }, 3600000)
  collection.unref()
  supervisor.beforeShutdown.add(() => clearInterval(collection))
  dispatcher.register(
    tool(
      'workspace_snapshot',
      'Capture HEAD and current tracked/untracked non-ignored files, preserving user WIP. Does not change the original workspace.',
      'read',
      z.object({}),
      async (_input, context) => {
        const snapshot = await workspaces.capture(context.workspace, context.signal)
        return {
          id: snapshot.id,
          digest: snapshot.digest,
          head: snapshot.head,
          files: snapshot.files.length,
        }
      },
    ),
  )
  dispatcher.register(
    tool(
      'workspace_fork',
      'Create an isolated Git worktree from a captured workspace, including WIP.',
      'workspace',
      z.object({ snapshotId: z.string() }),
      async (input, context) => workspaces.branch(input.snapshotId, context.run.id, context.signal),
    ),
  )
  for (const tool of [
    readTool,
    listTool,
    questionTool,
    searchTool(processes),
    ...codingTools(processes, patches),
    ...checkTools(processes),
    ...contextTools(supervisor.store, supervisor.directory),
  ])
    dispatcher.register(tool)
  setupContext(supervisor, dispatcher, processes)
  setupStaff(supervisor, dispatcher)
  setupNotifications(supervisor, dispatcher)
  const provider = new OpenRouter(async () => {
    const key = await credentials.get('openrouter')
    if (!key)
      throw new Error(
        'OpenRouter disconnected. Use sistemazero auth openrouter with the key through stdin.',
      )
    return key
  })
  const loop = new AgentLoop(supervisor, dispatcher, provider)
  supervisor.commands.set('usage.reconcile', async (raw, signal) => {
    const { id } = z.object({ id: z.string() }).parse(raw)
    const budget = z
      .object({
        id: z.string(),
        runId: z.string(),
        generationId: z.string().min(1).optional(),
        state: z.enum(['reserved', 'unknown', 'settled']),
      })
      .parse(await supervisor.store.call({ op: 'document.get', namespace: 'budgets', id }))
    const run = runSchema.parse(await supervisor.store.call({ op: 'run.get', id: budget.runId }))
    if (run.backend !== 'openrouter' || !terminalStates.has(run.state))
      throw new Error('Reconcile an ended OpenRouter attempt')
    if (budget.state === 'settled') return budget
    if (!budget.generationId)
      throw new Error('Provider never supplied a generation ID; reservation remains unknown')
    const usage = await provider.generation(budget.generationId, signal)
    return supervisor.store.call({
      op: 'budget.settle',
      id: budget.id,
      runId: budget.runId,
      generationId: budget.generationId,
      cost: usage.total_cost,
    })
  })
  supervisor.executor = async (run, workspace, signal) => {
    if (run.task.kind === 'tool') {
      const outcome = await dispatcher.dispatch(
        run,
        workspace,
        `${run.id}:tool`,
        run.task.name,
        run.task.arguments,
        signal,
      )
      await supervisor.emit(run.id, 'tool.result', outcome)
      if (outcome.kind !== 'ok')
        throw new Error(outcome.kind === 'failed' ? outcome.message : outcome.reason)
      await supervisor.emit(run.id, 'assistant.final', JSON.stringify(outcome))
    } else if (run.backend === 'openrouter') await loop.execute(run, workspace, signal)
    else await native.execute(run, workspace, signal)
  }
  supervisor.commands.set('connections', async (_raw, signal) => ({
    openrouter: Boolean(await credentials.get('openrouter')),
    brave: Boolean(await credentials.get('brave')),
    claude: await native.status('claude', signal),
    codex: await native.status('codex', signal),
  }))
  supervisor.commands.set('native.models', async (raw, signal) => {
    const { workspace } = z.object({ workspace: z.string() }).parse(raw)
    return native.codex.models(workspace, signal)
  })
  supervisor.commands.set('models.catalog', async (raw, signal) => {
    const input = z
      .object({
        backend: z.enum(['openrouter', 'claude', 'codex']),
        workspace: z.string(),
        filter: z.string().max(200).default(''),
      })
      .parse(raw)
    if (input.backend === 'claude')
      return (await native.claude.models(input.workspace, signal)).map((model) => ({
        id: model.value,
        name: model.displayName,
        description: model.description,
      }))
    if (input.backend === 'codex') {
      const result = z
        .object({
          data: z.array(
            z.object({
              id: z.string(),
              displayName: z.string(),
              description: z.string().optional(),
            }),
          ),
        })
        .parse(await native.codex.models(input.workspace, signal))
      return result.data.map((model) => ({
        id: model.id,
        name: model.displayName,
        description: model.description,
      }))
    }
    const catalog = z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          context_length: z.number(),
          pricing: z.unknown(),
          supported_parameters: z.array(z.string()).optional(),
        }),
      )
      .parse(
        await supervisor.handle({ id: crypto.randomUUID(), method: 'models', params: {} }, signal),
      )
    return catalog
      .filter(
        (model) => model.id.includes(input.filter) && model.supported_parameters?.includes('tools'),
      )
      .slice(0, 100)
  })
  supervisor.commands.set('inspector.list', async (raw) => {
    const input = z
      .object({
        namespace: z.enum(['effects', 'preview-evidence', 'checkpoints', 'grants']),
        after: z.string().default(''),
      })
      .parse(raw)
    return supervisor.store.call({ op: 'document.page', ...input, limit: 30 })
  })
  supervisor.commands.set('auth.set', async (raw) => {
    const input = z
      .object({ provider: z.enum(['openrouter', 'brave']), key: z.string().min(10).max(4096) })
      .parse(raw)
    await credentials.set(input.provider, input.key)
    return { connected: true }
  })
  supervisor.commands.set('auth.delete', async (raw) => {
    const { provider } = z.object({ provider: z.enum(['openrouter', 'brave']) }).parse(raw)
    await credentials.delete(provider)
    return { connected: false }
  })
  supervisor.commands.set('models', async (raw, signal) => {
    const { refresh } = z.object({ refresh: z.boolean().default(false) }).parse(raw)
    const cached = await supervisor.store.call({
      op: 'document.get',
      namespace: 'models',
      id: 'catalog',
    })
    if (!refresh && cached) return cached
    const models = await modelCatalog(signal)
    await supervisor.store.call({
      op: 'document.put',
      namespace: 'models',
      id: 'catalog',
      value: models,
    })
    return models
  })
  supervisor.commands.set('capabilities', async () =>
    [...dispatcher.tools.values()].map((tool) => tool.definition),
  )
  supervisor.commands.set('grants.list', async () =>
    supervisor.store.call({ op: 'document.list', namespace: 'grants' }),
  )
  supervisor.commands.set('grants.revoke', async (raw) =>
    dispatcher.grants.revoke(z.object({ id: z.string() }).parse(raw).id),
  )
  supervisor.commands.set('checkpoints', async () =>
    supervisor.store.call({ op: 'document.list', namespace: 'checkpoints' }),
  )
  const mcp = new McpRegistry(supervisor, dispatcher, processes)
  supervisor.commands.set('effects.reconcile', async (raw) =>
    supervisor.store.call({
      op: 'effect.reconcile',
      ...z
        .object({
          id: z.string(),
          resolution: z.enum(['confirmed', 'failed']),
          evidence: z.string().min(10).max(8000),
        })
        .parse(raw),
    }),
  )
  const environment = setupEnvironments(supervisor, dispatcher, processes)
  const services = setupServices(supervisor, dispatcher, environment.environments)
  const browser = setupBrowser(supervisor, dispatcher, processes, services.services)
  const team = setupTeams(supervisor, dispatcher, environment.environments, patches)
  const workflow = setupWorkflows(supervisor, dispatcher)
  const ready = Promise.all([
    artifacts
      .initialize()
      .then(() => patches.reconcile())
      .then(() => artifacts.collect()),
    mcp.initialize(),
    environment.ready,
    services.ready,
    browser.ready,
    team.ready,
    workflow.ready,
  ])
  return {
    dispatcher,
    processes,
    loop,
    ready,
    environments: environment.environments,
    services: services.services,
    browsers: browser.browsers,
    previews: browser.previews,
    teams: team.teams,
    workflows: workflow.workflows,
    schedules: workflow.schedules,
  }
}
