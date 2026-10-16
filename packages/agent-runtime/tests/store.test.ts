import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSchema } from '@sistemazero/agent-core'
import { Store } from '../src/store/client'

test('commits before ack, deduplicates and recovers dispatched effects', async () => {
  const file = join(await mkdtemp(join(tmpdir(), 'zero-store-')), 'state.sqlite')
  let store = new Store(file)
  const now = new Date().toISOString()
  await store.call({
    op: 'session.put',
    value: {
      id: 'session',
      title: 'fixture',
      workspace: process.cwd(),
      createdAt: now,
      archived: false,
    },
  })
  const run = runSchema.parse({
    id: 'run',
    sessionId: 'session',
    input: 'fixture',
    backend: 'openrouter',
    model: 'fixture',
    mode: 'build',
    state: 'queued',
    createdAt: now,
    updatedAt: now,
    maxCost: 1,
    maxSteps: 10,
  })
  await store.call({ op: 'run.put', value: run, requestId: 'request', digest: 'one' })
  expect(
    await store.call({ op: 'run.put', value: run, requestId: 'request', digest: 'one' }),
  ).toEqual(run)
  await expect(
    store.call({ op: 'run.put', value: run, requestId: 'request', digest: 'other' }),
  ).rejects.toThrow('different arguments')
  await store.call({ op: 'run.state', id: 'run', state: 'running' })
  await store.call({
    op: 'effect.put',
    value: {
      id: 'effect',
      runId: 'run',
      capability: 'fixture',
      digest: 'digest',
      state: 'prepared',
    },
  })
  await store.call({
    op: 'effect.put',
    value: {
      id: 'effect',
      runId: 'run',
      capability: 'fixture',
      digest: 'digest',
      state: 'dispatched',
    },
  })
  await store.close()
  store = new Store(file)
  expect(await store.call({ op: 'recover' })).toEqual({ interrupted: 1, unknown: 1 })
  expect(runSchema.parse(await store.call({ op: 'run.get', id: 'run' })).state).toBe('interrupted')
  await expect(store.call({ op: 'run.state', id: 'run', state: 'running' })).rejects.toThrow(
    'Invalid run transition',
  )
  await store.close()
})
