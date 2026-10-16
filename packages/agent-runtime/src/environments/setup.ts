import { environmentRequestSchema, leaseRefSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Dispatcher } from '../execution/dispatcher'
import type { Processes } from '../process/manager'
import type { Supervisor } from '../supervisor'
import { tool } from '../tools/definition'
import { Environments } from './manager'
import { discoverTemplates, inspectImage } from './templates'

export function setupEnvironments(
  supervisor: Supervisor,
  dispatcher: Dispatcher,
  processes: Processes,
) {
  const environments = new Environments(supervisor.store, processes, supervisor.directory)
  dispatcher.register(
    tool(
      'environment_list',
      'List environment leases and current lifecycle states for this session.',
      'read',
      z.object({ after: z.string().default('') }),
      async (input, context) => {
        const page = await environments.list(input.after)
        return {
          ...page,
          values: page.values.filter(
            (lease) =>
              lease.owner === context.run.sessionId && lease.workspace === context.workspace,
          ),
        }
      },
    ),
  )
  dispatcher.register(
    tool(
      'environment_templates',
      'Discover explicit environment manifests and project scripts without running them.',
      'read',
      z.object({}),
      (_input, context) => discoverTemplates(context.workspace),
    ),
  )
  dispatcher.register(
    tool(
      'environment_image',
      'Inspect an already installed Docker image to obtain its immutable digest. Does not pull images.',
      'read',
      z.object({ image: z.string() }),
      (input, context) => inspectImage(processes, context.workspace, input.image, context.signal),
    ),
  )
  dispatcher.register(
    tool(
      'environment_acquire',
      'Create an owned local workspace, WIP worktree or constrained container. Requires a snapshot for isolation and a pinned image for containers. Network is disabled by default. The writable container workspace has no physical disk quota; do not use this adapter when that containment is required.',
      'process',
      environmentRequestSchema,
      (input, context) => environments.acquire(input, context),
    ),
  )
  dispatcher.register(
    tool(
      'environment_run',
      'Execute structured arguments within a valid owned environment. Interruption revokes the container lease and stops its process tree.',
      'process',
      leaseRefSchema.extend({
        executable: z.string().min(1),
        args: z.array(z.string()).max(100),
        timeoutMs: z.number().int().min(100).max(600000).default(120000),
      }),
      (input, context) =>
        environments.execute(input, input.executable, input.args, input.timeoutMs, context),
    ),
  )
  for (const action of ['stop', 'export', 'destroy'] as const) {
    dispatcher.register(
      tool(
        'environment_' + action,
        'Environment ' +
          action +
          '. Destruction requires stopping, draining and exporting changes first.',
        'process',
        leaseRefSchema,
        async (input, context) => {
          const lease = await environments.get(input.id)
          if (lease.workspace !== context.workspace || lease.owner !== context.run.sessionId)
            throw new Error('Environment ownership mismatch')
          if (action === 'stop') return environments.stop(input.id, input.generation)
          return environments[action](input.id, input.generation, context.signal)
        },
      ),
    )
  }
  supervisor.commands.set('environments.list', async (raw) => {
    const { after, states } = z
      .object({ after: z.string().default(''), states: z.array(z.string()).optional() })
      .parse(raw)
    return environments.list(after, states)
  })
  supervisor.commands.set('environments.reconcile', async () => {
    if (supervisor.active.size)
      throw new Error('Finish active tasks before reconciling environments')
    return environments.reconcile()
  })
  supervisor.cleanup.add(() => environments.close().then(() => undefined))
  return { environments, ready: environments.reconcile() }
}
