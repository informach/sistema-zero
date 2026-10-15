import { expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  eventSchema,
  questionSchema,
  runSchema,
  sessionSchema,
  terminalStates,
} from '@sistemazero/agent-core'
import { McpConnection } from '@sistemazero/agent-integrations/mcp'
import { z } from 'zod'
import { configure } from '../src/application'
import { Credentials } from '../src/credentials'
import { listen } from '../src/ipc/server'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { tool } from '../src/tools/definition'

test('stdio MCP uses the runtime dispatcher and exposes only Plan capabilities', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-mcp-parity-'))
  await writeFile(join(directory, 'fixture.txt'), 'paridade')
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const app = configure(supervisor)
  await app.ready
  const host = await listen(directory, (command, signal) => supervisor.handle(command, signal))
  const signal = AbortSignal.timeout(20000)
  let client: McpConnection | undefined
  try {
    const child = await app.processes.open({
      executable: process.execPath,
      args: [resolve('packages/tui/src/cli.ts'), 'mcp', directory, 'plan'],
      cwd: directory,
      env: { SISTEMAZERO_HOME: directory },
    })
    client = await McpConnection.stdio(child, signal)
    const definitions = await client.discover(undefined, signal)
    expect(definitions.tools.some((item) => item.name === 'process_run')).toBe(false)
    const read = definitions.tools.find((item) => item.name === 'file_read')
    if (!read) throw new Error('Read capability missing')
    const result = await client.call(read.name, { path: 'fixture.txt' }, read.digest, signal)
    expect(JSON.stringify(result)).toContain('paridade')
    const runs = z.array(runSchema).parse(await supervisor.store.call({ op: 'run.list' }))
    expect(runs).toHaveLength(1)
    expect(runs[0]?.task.kind).toBe('tool')
    expect(runs[0]?.state).toBe('succeeded')
  } finally {
    await client?.close()
    await host.close()
    await supervisor.shutdown()
    await new Credentials(directory).delete('ipc')
  }
}, 30000)

test('concurrent identical external effects stop at an uncertain outcome until explicit reconciliation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-effect-lock-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const app = configure(supervisor)
  await app.ready
  let calls = 0
  const outcomes: unknown[] = []
  app.dispatcher.register(
    tool('fixture_external', 'External fixture', 'external', z.object({}), async () => {
      calls++
      throw new Error('Connection lost after dispatch')
    }),
  )
  supervisor.executor = async (run, workspace, signal) => {
    outcomes.push(
      ...(await Promise.all(
        ['first', 'second'].map((id) =>
          app.dispatcher.dispatch(run, workspace, id, 'fixture_external', {}, signal),
        ),
      )),
    )
  }
  const signal = AbortSignal.timeout(10000)
  const call = (method: string, params: unknown) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
  try {
    const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
    const run = runSchema.parse(
      await call('run.start', {
        requestId: 'fixture',
        sessionId: session.id,
        input: 'fixture',
        mode: 'build',
      }),
    )
    let cursor = 0
    let done = false
    while (!done) {
      for (const event of z
        .array(eventSchema)
        .parse(await call('events', { runId: run.id, after: cursor, wait: true }))) {
        cursor = event.sequence
        if (event.type === 'question.created')
          await call('question.answer', {
            id: questionSchema.parse(event.payload).id,
            answer: 'approve',
          })
        if (event.type === 'run.state' && terminalStates.has(runSchema.parse(event.payload).state))
          done = true
      }
    }
    expect(calls).toBe(1)
    expect(outcomes).toMatchObject([
      { kind: 'unknown', effectId: 'first' },
      { kind: 'unknown', effectId: 'first' },
    ])
    await call('effects.reconcile', {
      id: 'first',
      resolution: 'confirmed',
      evidence: 'Fixture acknowledged by remote status',
    })
    expect(await supervisor.store.call({ op: 'effect.get', id: 'first' })).toMatchObject({
      state: 'confirmed',
    })
    await expect(
      call('effects.reconcile', {
        id: 'first',
        resolution: 'failed',
        evidence: 'Cannot rewrite resolved effects',
      }),
    ).rejects.toThrow()
  } finally {
    await supervisor.shutdown()
  }
}, 20000)
