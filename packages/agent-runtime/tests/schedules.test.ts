import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { configure } from '../src/application'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { tool } from '../src/tools/definition'
import { Schedules } from '../src/workflows/schedules'

test('schedule occurrence ledger deduplicates catch-up and disabling prevents future dispatch', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-schedules-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  const app = configure(supervisor)
  await app.ready
  // Replace only the clock-owning scheduler; workflows and tools remain the real application.
  await app.schedules.close()
  let clock = Date.parse('2026-10-15T11:59:00Z')
  const schedules = new Schedules(supervisor, app.workflows, () => clock)
  let executions = 0
  app.dispatcher.register(
    tool('fixture_scheduled', 'Count scheduled invocation', 'read', z.object({}), async () => {
      executions++
      return { success: true }
    }),
  )
  const now = new Date().toISOString()
  const parent = runSchema.parse({
    id: 'parent',
    sessionId: 'session',
    input: 'schedule',
    backend: 'openrouter',
    model: '',
    mode: 'build',
    state: 'succeeded',
    createdAt: now,
    updatedAt: now,
    maxCost: 0.5,
    maxSteps: 10,
  })
  await store.call({
    op: 'session.put',
    value: {
      id: 'session',
      workspace: directory,
      title: 'schedule',
      createdAt: now,
      archived: false,
    },
  })
  await store.call({ op: 'run.put', value: parent, requestId: 'parent', digest: 'parent' })
  const context = {
    run: parent,
    workspace: directory,
    signal: AbortSignal.timeout(15000),
    ask: async () => 'deny',
  }
  try {
    const definition = await app.workflows.compile({
      version: 1,
      name: 'scheduled',
      description: '',
      inputSchema: { type: 'object' },
      nodes: [
        {
          id: 'count',
          kind: 'capability',
          tool: 'fixture_scheduled',
          input: {},
          outputSchema: { type: 'object' },
        },
      ],
    })
    const input = {
      intentId: 'daily',
      digest: definition.digest,
      inputs: {},
      spec: { timezone: 'UTC', time: '12:00', missed: 'catch_up', maxCatchUp: 3, overlap: 'queue' },
      execution: 'while_supervisor_running' as const,
    }
    const schedule = await schedules.create(input, context)
    expect((await schedules.create(input, context)).id).toBe(schedule.id)
    clock = Date.parse('2026-10-17T12:01:00Z')
    while (executions < 3) {
      context.signal.throwIfAborted()
      await schedules.tick()
      await Bun.sleep(25)
    }
    await schedules.tick()
    await schedules.tick()
    expect(executions).toBe(3)
    const ledger = z
      .object({ values: z.array(z.object({ state: z.string(), runId: z.string().optional() })) })
      .parse(
        await store.call({
          op: 'document.page',
          namespace: 'schedule-occurrences',
          after: '',
          limit: 100,
        }),
      )
    expect(ledger.values).toHaveLength(3)
    expect(new Set(ledger.values.map((item) => item.runId)).size).toBe(3)
    await schedules.disable(schedule.id, context)
    clock = Date.parse('2026-10-18T12:01:00Z')
    await schedules.tick()
    expect(executions).toBe(3)
  } finally {
    await schedules.close()
    await supervisor.shutdown()
  }
}, 20000)
