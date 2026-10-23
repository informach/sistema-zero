import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runSchema, sessionSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { configure } from '../src/application'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'

const directory = await mkdtemp(join(tmpdir(), 'zero-lifecycle-'))
await writeFile(join(directory, 'fixture.txt'), 'lifecycle evidence')
const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
await supervisor.initialize()
const app = configure(supervisor)
await app.ready
const signal = AbortSignal.timeout(180000)
const call = (method: string, params: unknown = {}) =>
  supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
const stats = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    p99: sorted[Math.ceil(sorted.length * 0.99) - 1],
    samples: values,
  }
}
try {
  const session = sessionSchema.parse(await call('session.create', { workspace: directory }))
  let invocation = 0
  supervisor.executor = async (run, workspace, abort) => {
    if (run.input === 'cancel')
      await supervisor.ask(run, 'Wait for cancel', [], 'input', undefined, abort)
    else {
      const result = await app.dispatcher.dispatch(
        run,
        workspace,
        `${run.id}:${invocation++}`,
        'file_read',
        { path: 'fixture.txt' },
        abort,
      )
      if (result.kind !== 'ok') throw new Error('Fixture failed')
      await supervisor.emit(run.id, 'assistant.final', 'lifecycle evidence')
    }
  }
  const start = async (input: string) =>
    runSchema.parse(
      await call('run.start', {
        requestId: crypto.randomUUID(),
        sessionId: session.id,
        input,
        mode: 'plan',
      }),
    )
  for (let i = 0; i < 3; i++) {
    const run = await start('read')
    await supervisor.waitRun(run.id, signal)
  }
  await Bun.sleep(1000)
  Bun.gc(true)
  const before = process.memoryUsage(),
    memory = []
  for (let i = 0; i < 100; i++) {
    const run = await start('read')
    await supervisor.waitRun(run.id, signal)
    if (runSchema.parse(await call('run.get', { id: run.id })).state !== 'succeeded')
      throw new Error('Read task failed')
    if ((i + 1) % 10 === 0) memory.push({ tasks: i + 1, memory: process.memoryUsage() })
  }
  await Bun.sleep(1000)
  Bun.gc(true)
  const after = process.memoryUsage(),
    cancelAck: number[] = [],
    cancelDrained: number[] = []
  for (let i = -3; i < 1000; i++) {
    const run = await start('cancel')
    while (runSchema.parse(await call('run.get', { id: run.id })).state !== 'waiting_input') {
      signal.throwIfAborted()
      await Bun.sleep(1)
    }
    const t = performance.now()
    await call('run.cancel', { id: run.id })
    const ack = performance.now() - t
    await supervisor.waitRun(run.id, signal)
    if (runSchema.parse(await call('run.get', { id: run.id })).state !== 'canceled')
      throw new Error('Canceled task did not drain')
    if (i >= 0) {
      cancelAck.push(ack)
      cancelDrained.push(performance.now() - t)
    }
  }
  const parent = await start('read')
  await supervisor.waitRun(parent.id, signal)
  const intent: number[] = []
  for (let i = -3; i < 1000; i++) {
    await app.dispatcher.dispatch(
      parent,
      directory,
      `dispatch-${i}`,
      'file_read',
      { path: 'fixture.txt' },
      signal,
    )
    const metric = z
      .object({ intentMs: z.number() })
      .parse(
        await supervisor.store.call({ op: 'event.last', runId: parent.id, type: 'metric.tool' }),
      )
    if (i >= 0) intent.push(metric.intentMs)
  }
  const result = {
    at: new Date().toISOString(),
    notes:
      'Synthetic executors; real scheduler, SQLite FULL journal, dispatcher and filesystem. Cancel waits for a pending input, not a process. GC before/after provides a retained-heap diagnostic; RSS is reported separately and is not forced-GC production behavior.',
    tasks: 100,
    before,
    after,
    growth: { rss: after.rss - before.rss, heapUsed: after.heapUsed - before.heapUsed },
    memory,
    cancelAck: stats(cancelAck),
    cancelDrained: stats(cancelDrained),
    intentCommit: stats(intent),
  }
  const output = resolve(
    import.meta.dir,
    '../../../.audits/tui-bench/working-tree/win32/lifecycle.json',
  )
  await mkdir(resolve(output, '..'), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2))
  console.log(
    JSON.stringify({
      output,
      growth: result.growth,
      cancelAckP95: result.cancelAck.p95,
      intentP95: result.intentCommit.p95,
    }),
  )
} finally {
  await supervisor.shutdown()
}
