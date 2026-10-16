import { runSchema, scheduleSpecSchema, workflowDocumentSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Dispatcher } from '../execution/dispatcher'
import type { Supervisor } from '../supervisor'
import { tool } from '../tools/definition'
import { recipes } from './recipes'
import { Workflows } from './runner'
import { Schedules } from './schedules'

export function setupWorkflows(supervisor: Supervisor, dispatcher: Dispatcher) {
  const workflows = new Workflows(supervisor, dispatcher)
  const schedules = new Schedules(supervisor, workflows)
  dispatcher.register(
    tool(
      'workflow_compile',
      'Validate a versioned workflow without executing nodes. Freezes capability contracts, input/output schemas, references and bounded retries.',
      'read',
      workflowDocumentSchema,
      (input) => workflows.compile(input),
    ),
  )
  dispatcher.register(
    tool(
      'workflow_start',
      'Start an immutable compiled workflow on the existing scheduler. Returns immediately; node effects use the same dispatcher and approvals.',
      'workspace',
      z.object({
        intentId: z.string().min(1).max(100),
        digest: z.string().regex(/^[a-f0-9]{64}$/),
        inputs: z.unknown(),
      }),
      (input, context) => workflows.start(input.intentId, input.digest, input.inputs, context),
    ),
  )
  const identity = z.object({ id: z.string() })
  dispatcher.register(
    tool(
      'workflow_status',
      'Read persisted workflow and per-node states, child run references, wait deadlines and output artifacts.',
      'read',
      identity,
      (input, context) => workflows.status(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'workflow_cancel',
      'Cancel pending workflow nodes and owned active tasks without undoing confirmed external effects.',
      'read',
      identity,
      (input, context) => workflows.cancel(input.id, context),
    ),
  )
  dispatcher.register(
    tool(
      'workflow_resume',
      'Resume a paused workflow using its fixed version and completed node checkpoints. Unknown effects remain blocked.',
      'workspace',
      identity,
      (input, context) => workflows.resume(input.id, context),
    ),
  )
  supervisor.commands.set('workflows.list', async (raw) =>
    workflows.list(z.object({ after: z.string().default('') }).parse(raw).after),
  )
  supervisor.commands.set('workflow.compile', (raw) => workflows.compile(raw))
  for (const action of ['cancel', 'resume'] as const)
    supervisor.commands.set('workflow.' + action, async (raw, signal) => {
      const { id } = identity.parse(raw)
      const record = await workflows.get(id)
      const run = runSchema.parse(
        await supervisor.store.call({ op: 'run.get', id: record.parentRunId }),
      )
      return workflows[action](id, {
        run,
        workspace: record.workspace,
        signal,
        ask: async () => {
          throw new Error('Control operation does not ask questions')
        },
      })
    })
  dispatcher.register(
    tool(
      'workflow_recipes',
      'Read bundled, versioned workflow recipes. Discovery does not compile or execute them.',
      'read',
      z.object({ name: z.string().optional() }),
      async (input) =>
        input.name
          ? (recipes.find((recipe) => recipe.name === input.name) ?? { error: 'Recipe not found' })
          : recipes.map((recipe) => ({
              name: recipe.name,
              description: recipe.description,
              inputSchema: recipe.inputSchema,
            })),
    ),
  )
  supervisor.commands.set('workflow.recipes', async () => recipes)
  dispatcher.register(
    tool(
      'schedule_create',
      'Persist an explicitly selected local schedule. Runs only while this supervisor is running. Fixes recipe, inputs, timezone, missed-run/overlap policy and current budgets; child effects still require their normal approvals.',
      'process',
      z.object({
        intentId: z.string().min(1).max(100),
        digest: z.string().regex(/^[a-f0-9]{64}$/),
        inputs: z.unknown(),
        spec: scheduleSpecSchema,
        execution: z.literal('while_supervisor_running'),
      }),
      (input, context) => schedules.create(input, context),
    ),
  )
  dispatcher.register(
    tool(
      'schedule_disable',
      'Disable future occurrences and revoke pending occurrences. Existing workflows remain visible and can be canceled independently.',
      'read',
      identity,
      (input, context) => schedules.disable(input.id, context),
    ),
  )
  supervisor.commands.set('schedules.list', async (raw) =>
    schedules.list(z.object({ after: z.string().default('') }).parse(raw).after),
  )
  supervisor.commands.set('schedule.disable', async (raw) =>
    schedules.disable(identity.parse(raw).id),
  )
  supervisor.commands.set('workflow.reconcile', async (raw, signal) => {
    const input = z
      .object({
        id: z.string(),
        nodeId: z.string(),
        resolution: z.discriminatedUnion('action', [
          z.object({
            action: z.literal('complete'),
            output: z.unknown(),
            evidence: z.string().min(10).max(8000),
          }),
          z.object({
            action: z.literal('retry_not_applied'),
            evidence: z.string().min(10).max(8000),
          }),
        ]),
      })
      .parse(raw)
    const record = await workflows.get(input.id)
    const run = runSchema.parse(
      await supervisor.store.call({ op: 'run.get', id: record.parentRunId }),
    )
    return workflows.reconcile(input.id, input.nodeId, input.resolution, {
      run,
      workspace: record.workspace,
      signal,
      ask: async () => {
        throw new Error('Use the authenticated approval interface')
      },
    })
  })
  supervisor.beforeShutdown.add(() => schedules.close())
  supervisor.beforeShutdown.add(() => workflows.close())
  return { workflows, schedules, ready: workflows.initialize().then(() => schedules.initialize()) }
}
