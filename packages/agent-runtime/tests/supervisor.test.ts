import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eventSchema, runSchema, sessionSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { JournalDriver } from '../src/execution/journal-driver'
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

test('concurrent submissions respect capacity and rejected admission cannot leave an executable run', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-admission-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const session = sessionSchema.parse(
    await supervisor.handle(
      { id: 'session', method: 'session.create', params: { workspace: directory } },
      new AbortController().signal,
    ),
  )
  supervisor.executor = async (_run, _workspace, signal) => {
    await new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true })
      if (signal.aborted) resolve()
    })
  }
  try {
    const rejected = { requestId: 'rejected', sessionId: session.id, input: 'no admission' }
    await expect(
      supervisor.submit(rejected, async () => {
        throw new Error('Admission revoked')
      }),
    ).rejects.toThrow('Admission revoked')
    expect((await supervisor.submit(rejected)).state).toBe('canceled')
    const results = await Promise.allSettled(
      Array.from({ length: 110 }, (_, index) =>
        supervisor.submit({ requestId: `capacity-${index}`, sessionId: session.id, input: 'wait' }),
      ),
    )
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(102)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(8)
  } finally {
    await supervisor.shutdown()
  }
})

test('shutdown cancels active and queued runs and closes every resource even if hooks fail', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-shutdown-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const session = sessionSchema.parse(
    await supervisor.handle(
      { id: 'session', method: 'session.create', params: { workspace: directory } },
      new AbortController().signal,
    ),
  )
  supervisor.executor = async (_run, _workspace, signal) => {
    await new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true })
      if (signal.aborted) resolve()
    })
  }
  const runs = await Promise.all(
    Array.from({ length: 3 }, (_, index) =>
      supervisor.submit({ requestId: `shutdown-${index}`, sessionId: session.id, input: 'wait' }),
    ),
  )
  let cleaned = 0
  supervisor.beforeShutdown.add(() => {
    throw new Error('Driver cleanup failed')
  })
  supervisor.cleanup.add(() => {
    throw new Error('Resource cleanup failed')
  })
  supervisor.cleanup.add(() => {
    cleaned++
  })
  const outcomes = await Promise.allSettled([supervisor.shutdown(), supervisor.shutdown()])
  expect(outcomes.every((result) => result.status === 'rejected')).toBe(true)
  expect(cleaned).toBe(1)
  expect(supervisor.active.size).toBe(0)
  await expect(supervisor.store.call({ op: 'run.get', id: runs[0]?.id ?? '' })).rejects.toThrow(
    'closed',
  )
  const reopened = new Store(join(directory, 'state.sqlite'))
  try {
    for (const run of runs)
      expect(runSchema.parse(await reopened.call({ op: 'run.get', id: run.id })).state).toBe(
        'canceled',
      )
  } finally {
    await reopened.close()
  }
})

test('storage failure revokes active execution and rejects further admissions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-store-failure-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const session = sessionSchema.parse(
    await supervisor.handle(
      { id: 'session', method: 'session.create', params: { workspace: directory } },
      new AbortController().signal,
    ),
  )
  let entered!: () => void
  const running = new Promise<void>((resolve) => {
    entered = resolve
  })
  let aborted = false
  supervisor.executor = async (_run, _workspace, signal) => {
    entered()
    await new Promise<void>((resolve) =>
      signal.addEventListener(
        'abort',
        () => {
          aborted = true
          resolve()
        },
        { once: true },
      ),
    )
  }
  try {
    await supervisor.submit({ requestId: 'storage-failure', sessionId: session.id, input: 'wait' })
    await running
    supervisor.store.emit('failure', new Error('Storage acknowledgment lost'))
    expect(aborted).toBe(true)
    expect(supervisor.readiness).toBe('failed')
    await expect(
      supervisor.submit({ requestId: 'blocked', sessionId: session.id, input: 'wait' }),
    ).rejects.toThrow('Storage acknowledgment lost')
  } finally {
    await supervisor.shutdown()
  }
})

test('a failed coordinator becomes visible and cannot leave an apparently ready runtime stalled', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-driver-failure-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const driver = new JournalDriver(supervisor, async () => {
    throw new Error('Invalid durable record')
  })
  try {
    const changed = new Promise<void>((resolve) => supervisor.changes.once('projection', resolve))
    driver.start()
    await changed
    expect(supervisor.readiness).toBe('failed')
    expect(supervisor.recoveryError).toContain('Invalid durable record')
  } finally {
    await driver.close()
    await supervisor.shutdown()
  }
})

test('concurrent repeated cancellation drains both starting executors and queued tasks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-cancel-race-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const signal = AbortSignal.timeout(10000)
  const session = sessionSchema.parse(
    await supervisor.handle(
      { id: 'session', method: 'session.create', params: { workspace: directory } },
      signal,
    ),
  )
  supervisor.executor = async (_run, _workspace, signal) => {
    await new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true })
      if (signal.aborted) resolve()
    })
  }
  try {
    const runs = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        supervisor.submit({ requestId: `race-${index}`, sessionId: session.id, input: 'wait' }),
      ),
    )
    await Promise.all(
      runs.flatMap((run) =>
        Array.from({ length: 2 }, () =>
          supervisor.handle(
            { id: crypto.randomUUID(), method: 'run.cancel', params: { id: run.id } },
            signal,
          ),
        ),
      ),
    )
    for (const run of runs)
      expect((await supervisor.waitRun(run.id, signal)).state).toBe('canceled')
    expect(supervisor.active.size).toBe(0)
  } finally {
    await supervisor.shutdown()
  }
})

test('idempotent terminal receipts still associate with coordinators without executing again', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-receipt-'))
  const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
  await supervisor.initialize()
  const signal = AbortSignal.timeout(10000)
  const session = sessionSchema.parse(
    await supervisor.handle(
      { id: 'session', method: 'session.create', params: { workspace: directory } },
      signal,
    ),
  )
  let executions = 0
  supervisor.executor = async () => {
    executions++
  }
  try {
    const input = { requestId: 'receipt', sessionId: session.id, input: 'once' }
    const run = await supervisor.submit(input)
    await supervisor.waitRun(run.id, signal)
    let receipt: string | undefined
    const repeated = await supervisor.submit(input, async (saved) => {
      receipt = saved.id
    })
    expect(repeated.state).toBe('succeeded')
    expect(receipt).toBe(run.id)
    expect(executions).toBe(1)
  } finally {
    await supervisor.shutdown()
  }
})
