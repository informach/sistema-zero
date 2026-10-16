import { expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canonical, runSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { configure } from '../src/application'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { tool } from '../src/tools/definition'
import { hash } from '../src/tools/paths'
import { recipes } from '../src/workflows/recipes'

test('workflow preserves confirmed steps across restart and runs condition, durable wait and bounded foreach on the shared dispatcher', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-workflow-'))
  let calls = 0
  async function open() {
    const store = new Store(join(directory, 'state.sqlite'))
    const supervisor = new Supervisor(directory, store)
    await supervisor.initialize()
    const app = configure(supervisor)
    await app.ready
    app.dispatcher.register(
      tool(
        'fixture_echo',
        'Return fixture input',
        'read',
        z.object({ value: z.number() }),
        async (input) => {
          calls++
          return input
        },
      ),
    )
    return { supervisor, store, app }
  }
  let runtime = await open()
  const now = new Date().toISOString()
  const parent = runSchema.parse({
    id: 'parent',
    sessionId: 'session',
    input: 'fixture',
    backend: 'openrouter',
    model: '',
    mode: 'build',
    state: 'succeeded',
    createdAt: now,
    updatedAt: now,
    maxCost: 1,
    maxSteps: 10,
  })
  await runtime.store.call({
    op: 'session.put',
    value: {
      id: 'session',
      workspace: directory,
      title: 'fixture',
      createdAt: now,
      archived: false,
    },
  })
  await runtime.store.call({ op: 'run.put', value: parent, requestId: 'parent', digest: 'parent' })
  const context = {
    run: parent,
    workspace: directory,
    signal: AbortSignal.timeout(20000),
    ask: async () => 'deny',
  }
  const output = {
    type: 'object',
    required: ['value'],
    properties: { value: { type: 'number' } },
    additionalProperties: false,
  }
  const recipe = {
    version: 1,
    name: 'fixture',
    description: 'durable fixture',
    inputSchema: {
      type: 'object',
      required: ['items'],
      properties: { items: { type: 'array', items: { type: 'number' } } },
    },
    nodes: [
      {
        id: 'first',
        kind: 'capability',
        tool: 'fixture_echo',
        input: { value: 1 },
        outputSchema: output,
      },
      {
        id: 'gate',
        kind: 'condition',
        dependsOn: ['first'],
        left: { $ref: 'nodes.first.value' },
        operator: 'equals',
        right: 1,
      },
      { id: 'wait', kind: 'wait', dependsOn: ['gate'], milliseconds: 600 },
      {
        id: 'each',
        kind: 'foreach',
        dependsOn: ['wait', 'gate'],
        when: { node: 'gate', equals: true },
        items: { $ref: 'inputs.items' },
        tool: 'fixture_echo',
        input: { value: { $ref: 'item' } },
        itemOutputSchema: output,
      },
    ],
  }
  try {
    const definition = await runtime.app.workflows.compile(recipe)
    const record = await runtime.app.workflows.start(
      'one',
      definition.digest,
      { items: [2, 3, 4] },
      context,
    )
    let current = await runtime.app.workflows.get(record.id)
    while (
      current.nodes.find((node) => node.id === 'wait')?.state !== 'waiting' &&
      current.state === 'running'
    ) {
      context.signal.throwIfAborted()
      await Bun.sleep(20)
      current = await runtime.app.workflows.get(record.id)
    }
    expect(current.error).toBeUndefined()
    expect(calls).toBe(1)
    await runtime.supervisor.shutdown()
    runtime = await open()
    expect((await runtime.app.workflows.get(record.id)).state).toBe('paused')
    recipe.nodes[0] = {
      id: 'replacement',
      kind: 'capability',
      tool: 'fixture_echo',
      input: { value: 999 },
      outputSchema: output,
    }
    await runtime.app.workflows.resume(record.id, context)
    current = await runtime.app.workflows.get(record.id)
    while (current.state === 'running') {
      context.signal.throwIfAborted()
      await Bun.sleep(20)
      current = await runtime.app.workflows.get(record.id)
    }
    expect(current.error).toBeUndefined()
    expect(current.state).toBe('succeeded')
    expect(calls).toBe(4)
    expect(current.nodes.find((node) => node.id === 'each')?.results).toHaveLength(3)
  } finally {
    await runtime.supervisor.shutdown()
  }
}, 25000)

test('workflow holds uncertain external outcome until explicit reconciliation and rejects success:false', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-workflow-unknown-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  const app = configure(supervisor)
  await app.ready
  let dispatches = 0
  const external = tool(
    'fixture_send',
    'Ambiguous fixture mutation',
    'external',
    z.object({ destination: z.string() }),
    async () => {
      dispatches++
      await writeFile(join(directory, 'accepted.txt'), 'accepted')
      throw new Error('response was lost')
    },
  )
  app.dispatcher.register(external)
  app.dispatcher.register(
    tool('fixture_false', 'Explicit failure fixture', 'read', z.object({}), async () => ({
      success: false,
    })),
  )
  const now = new Date().toISOString()
  const parent = runSchema.parse({
    id: 'parent',
    sessionId: 'session',
    input: 'fixture',
    backend: 'openrouter',
    model: '',
    mode: 'build',
    state: 'succeeded',
    createdAt: now,
    updatedAt: now,
    maxCost: 1,
    maxSteps: 10,
  })
  await store.call({
    op: 'session.put',
    value: {
      id: 'session',
      workspace: directory,
      title: 'fixture',
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
  const input = { destination: 'fixture' }
  await app.dispatcher.grants.issue(
    parent,
    directory,
    'fixture_send',
    hash(canonical({ capability: external.definition, input, workspace: directory })),
  )
  const wait = async (id: string) => {
    let record = await app.workflows.get(id)
    while (record.state === 'running') {
      context.signal.throwIfAborted()
      await Bun.sleep(20)
      record = await app.workflows.get(id)
    }
    return record
  }
  try {
    for (const recipe of recipes)
      expect((await app.workflows.compile(recipe)).digest).toHaveLength(64)
    const definition = await app.workflows.compile({
      version: 1,
      name: 'uncertain',
      description: '',
      inputSchema: { type: 'object' },
      nodes: [
        {
          id: 'send',
          kind: 'capability',
          tool: 'fixture_send',
          input,
          outputSchema: {
            type: 'object',
            required: ['accepted'],
            properties: { accepted: { type: 'boolean' } },
          },
        },
      ],
    })
    const started = await app.workflows.start('send', definition.digest, {}, context)
    const blocked = await wait(started.id)
    expect(blocked.state).toBe('blocked')
    expect(dispatches).toBe(1)
    await expect(app.workflows.resume(started.id, context)).rejects.toThrow('paused')
    await expect(
      app.workflows.reconcile(
        started.id,
        'send',
        {
          action: 'complete',
          output: { accepted: true },
          evidence: 'Fixture file proves acceptance',
        },
        context,
      ),
    ).rejects.toThrow('confirmed first')
    const runId = blocked.nodes[0]?.runId
    if (!runId) throw new Error('Missing effect owner')
    await store.call({
      op: 'effect.reconcile',
      id: `${runId}:tool`,
      resolution: 'confirmed',
      evidence: 'Fixture file accepted.txt exists with acceptance receipt',
    })
    await app.workflows.reconcile(
      started.id,
      'send',
      {
        action: 'complete',
        output: { accepted: true },
        evidence: 'Fixture file proves acceptance',
      },
      context,
    )
    await app.workflows.resume(started.id, context)
    expect((await wait(started.id)).state).toBe('succeeded')
    expect(dispatches).toBe(1)
    const failure = await app.workflows.compile({
      version: 1,
      name: 'failure',
      description: '',
      inputSchema: { type: 'object' },
      nodes: [
        {
          id: 'fail',
          kind: 'capability',
          tool: 'fixture_false',
          input: {},
          outputSchema: { type: 'object' },
        },
      ],
    })
    expect(
      (await wait((await app.workflows.start('false', failure.digest, {}, context)).id)).state,
    ).toBe('failed')
    const executor = supervisor.executor
    supervisor.executor = async (run, workspace, signal) => {
      if (run.task.kind !== 'agent') return executor?.(run, workspace, signal)
      await app.dispatcher.dispatch(
        run,
        workspace,
        `${run.id}:uncertain`,
        'fixture_send',
        input,
        signal,
      )
      await supervisor.emit(run.id, 'assistant.final', JSON.stringify({ accepted: true }))
    }
    const agentDefinition = await app.workflows.compile({
      version: 1,
      name: 'uncertain-agent',
      description: '',
      inputSchema: { type: 'object' },
      nodes: [
        {
          id: 'agent',
          kind: 'agent',
          prompt: 'fixture',
          outputSchema: {
            type: 'object',
            required: ['accepted'],
            properties: { accepted: { type: 'boolean' } },
          },
        },
      ],
    })
    const agent = await wait(
      (await app.workflows.start('agent', agentDefinition.digest, {}, context)).id,
    )
    expect(agent.state).toBe('blocked')
    const agentRun = agent.nodes[0]?.runId
    if (!agentRun) throw new Error('Missing agent child')
    expect(runSchema.parse(await store.call({ op: 'run.get', id: agentRun })).state).toBe('failed')
    await expect(
      app.workflows.reconcile(
        agent.id,
        'agent',
        {
          action: 'complete',
          output: { accepted: true },
          evidence: 'Fixture file proves acceptance',
        },
        context,
      ),
    ).rejects.toThrow('every underlying agent effect')
    await store.call({
      op: 'effect.reconcile',
      id: `${agentRun}:uncertain`,
      resolution: 'confirmed',
      evidence: 'Fixture file accepted.txt contains the receipt',
    })
    await app.workflows.reconcile(
      agent.id,
      'agent',
      {
        action: 'complete',
        output: { accepted: true },
        evidence: 'Fixture file proves acceptance',
      },
      context,
    )
    await app.workflows.resume(agent.id, context)
    expect((await wait(agent.id)).state).toBe('succeeded')
    expect(dispatches).toBe(2)
    supervisor.executor = executor
  } finally {
    await supervisor.shutdown()
  }
}, 20000)
