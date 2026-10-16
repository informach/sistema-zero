import { expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eventSchema, runSchema, sessionSchema, terminalStates } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Dispatcher } from '../src/execution/dispatcher'
import { AgentLoop } from '../src/models/loop'
import type { ModelProvider, ModelRequest } from '../src/models/openrouter'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { readTool } from '../src/tools/read'

test('agent reads a real file, journals effects and reaches a durable terminal result', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-loop-'))
  await writeFile(join(directory, 'fixture.txt'), 'observable evidence')
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const requests: ModelRequest[] = []
  const provider: ModelProvider = {
    async *stream(request) {
      requests.push(structuredClone(request))
      if (requests.length === 1) {
        yield {
          type: 'complete',
          text: '',
          calls: [
            {
              id: 'read',
              type: 'function',
              function: { name: 'file_read', arguments: '{"path":"fixture.txt"}' },
            },
          ],
          model: 'fixture',
          generationId: 'one',
          usage: { cost: 0 },
          finish: 'tool_calls',
        }
      } else {
        yield { type: 'text', text: 'observable evidence' }
        yield {
          type: 'complete',
          text: 'observable evidence',
          calls: [],
          model: 'fixture',
          generationId: 'two',
          usage: { cost: 0 },
          finish: 'stop',
        }
      }
    },
  }
  const dispatcher = new Dispatcher(supervisor)
  dispatcher.register(readTool)
  const loop = new AgentLoop(supervisor, dispatcher, provider)
  supervisor.executor = (...args) => loop.execute(...args)
  await supervisor.store.call({
    op: 'document.put',
    namespace: 'models',
    id: 'catalog',
    value: [
      {
        id: 'fixture',
        name: 'fixture',
        context_length: 128000,
        supported_parameters: ['tools'],
        pricing: { prompt: '0', completion: '0' },
      },
    ],
  })
  const signal = new AbortController().signal
  const call = (method: string, params: unknown) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
  try {
    const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
    const run = runSchema.parse(
      await call('run.start', {
        requestId: 'fixture',
        sessionId: session.id,
        input: 'Read fixture.txt',
        model: 'fixture',
      }),
    )
    let cursor = 0
    let terminal = false
    while (!terminal) {
      const events = z
        .array(eventSchema)
        .parse(await call('events', { runId: run.id, after: cursor, wait: true }))
      for (const event of events) {
        cursor = event.sequence
        if (event.type === 'run.state' && terminalStates.has(runSchema.parse(event.payload).state))
          terminal = true
      }
    }
    expect(runSchema.parse(await call('run.get', { id: run.id })).state).toBe('succeeded')
    expect(requests[1]?.messages.at(-1)?.content).toContain('observable evidence')
    expect(
      await supervisor.store.call({ op: 'event.last', runId: run.id, type: 'assistant.final' }),
    ).toBe('observable evidence')
  } finally {
    await supervisor.shutdown()
  }
})

test('a truncated generation retains its identity and budget without retrying inference', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-loop-truncated-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  let requests = 0
  const provider: ModelProvider = {
    async *stream() {
      requests++
      yield { type: 'metadata', generationId: 'accepted-generation', model: 'fixture' }
      yield { type: 'text', text: 'partial' }
      throw new Error('Connection lost after acceptance')
    },
  }
  const loop = new AgentLoop(supervisor, new Dispatcher(supervisor), provider)
  supervisor.executor = (...args) => loop.execute(...args)
  await supervisor.store.call({
    op: 'document.put',
    namespace: 'models',
    id: 'catalog',
    value: [
      {
        id: 'fixture',
        name: 'fixture',
        context_length: 128000,
        supported_parameters: ['tools'],
        pricing: { prompt: '0.000001', completion: '0.000002' },
      },
    ],
  })
  const call = (method: string, params: unknown) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, AbortSignal.timeout(10000))
  try {
    const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
    const run = runSchema.parse(
      await call('run.start', {
        requestId: 'truncated',
        sessionId: session.id,
        input: 'Read',
        model: 'fixture',
      }),
    )
    await supervisor.waitRun(run.id, AbortSignal.timeout(10000))
    expect(runSchema.parse(await call('run.get', { id: run.id })).state).toBe('failed')
    expect(requests).toBe(1)
    const budget = z
      .object({ state: z.string(), generationId: z.string(), amount: z.number() })
      .parse(
        await supervisor.store.call({
          op: 'document.get',
          namespace: 'budgets',
          id: `${run.id}:0`,
        }),
      )
    expect(budget.state).toBe('unknown')
    expect(budget.generationId).toBe('accepted-generation')
    expect(budget.amount).toBeGreaterThan(0)
  } finally {
    await supervisor.shutdown()
  }
})
