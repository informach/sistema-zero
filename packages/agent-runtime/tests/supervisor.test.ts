import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eventSchema, runSchema, sessionSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'

test('waiting approval survives in journal and repeated cancel does not become success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-supervisor-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const signal = new AbortController().signal
  const call = (method: string, params: unknown) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
  supervisor.executor = async (run, _workspace, signal) => {
    await supervisor.ask(run, 'Approve?', [], 'approval', 'fixture', signal)
  }
  const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
  const run = runSchema.parse(
    await call('run.start', { requestId: 'once', sessionId: session.id, input: 'fixture' }),
  )
  let cursor = 0
  let found = false
  while (!found) {
    const events = z
      .array(eventSchema)
      .parse(await call('events', { runId: run.id, after: cursor, wait: true }))
    cursor = events.at(-1)?.sequence ?? cursor
    found = events.some((event) => event.type === 'question.created')
  }
  await call('run.cancel', { id: run.id })
  await supervisor.shutdown()
  const reopened = new Store(join(directory, 'state.sqlite'))
  expect(runSchema.parse(await reopened.call({ op: 'run.get', id: run.id })).state).toBe('canceled')
  await reopened.close()
})
