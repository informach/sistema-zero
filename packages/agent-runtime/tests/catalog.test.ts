import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSchema, sessionSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Dispatcher } from '../src/execution/dispatcher'
import { AgentLoop } from '../src/models/loop'
import type { ModelProvider, ModelRequest } from '../src/models/openrouter'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { registerCatalog } from '../src/tools/catalog'
import { tool } from '../src/tools/definition'

test('progressive schemas discover a deferred capability without exposing Plan mutations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-catalog-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const dispatcher = new Dispatcher(supervisor)
  registerCatalog(dispatcher)
  for (let index = 0; index < 40; index++)
    dispatcher.register(
      tool(
        `fixture_${String(index).padStart(2, '0')}`,
        'Read fixture evidence',
        'read',
        z.object({}),
        async () => ({ evidence: index }),
      ),
    )
  dispatcher.register(
    tool('forbidden_mutation', 'Mutate fixture', 'external', z.object({}), async () => {
      throw new Error('Plan mutation executed')
    }),
  )
  const requests: ModelRequest[] = []
  const provider: ModelProvider = {
    async *stream(request) {
      requests.push(structuredClone(request))
      const call =
        requests.length === 1
          ? { name: 'capability_search', arguments: '{"query":"fixture_39"}' }
          : requests.length === 2
            ? { name: 'fixture_39', arguments: '{}' }
            : undefined
      yield {
        type: 'complete',
        text: call ? '' : 'verified',
        calls: call ? [{ id: String(requests.length), type: 'function', function: call }] : [],
        model: 'fixture',
        generationId: String(requests.length),
        usage: { cost: 0 },
        finish: call ? 'tool_calls' : 'stop',
      }
    },
  }
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
  const call = (method: string, params: unknown) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, AbortSignal.timeout(10000))
  try {
    const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
    const run = runSchema.parse(
      await call('run.start', {
        requestId: 'catalog',
        sessionId: session.id,
        input: 'Inspect evidence',
        mode: 'plan',
        model: 'fixture',
      }),
    )
    await supervisor.waitRun(run.id, AbortSignal.timeout(10000))
    expect(runSchema.parse(await call('run.get', { id: run.id })).state).toBe('succeeded')
    expect(requests).toHaveLength(3)
    expect(requests.every((request) => request.tools.length <= 24)).toBe(true)
    expect(
      requests
        .flatMap((request) => request.tools)
        .some((item) => item.function.name === 'forbidden_mutation'),
    ).toBe(false)
    expect(requests[0]?.tools.some((item) => item.function.name === 'fixture_39')).toBe(false)
    expect(requests[1]?.tools.some((item) => item.function.name === 'fixture_39')).toBe(true)
    expect(requests[2]?.messages.at(-1)?.content).toContain('39')
  } finally {
    await supervisor.shutdown()
  }
})
