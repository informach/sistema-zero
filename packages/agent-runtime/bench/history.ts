import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { cpus, platform, release, tmpdir, totalmem } from 'node:os'
import { join, resolve } from 'node:path'
import { canonical, runSchema } from '@sistemazero/agent-core'
import { RuntimeClient } from '../src/client'
import { Credentials } from '../src/credentials'
import { listen } from '../src/ipc/server'
import { Store } from '../src/store/client'
import { Journal } from '../src/store/database'
import { Supervisor } from '../src/supervisor'

const seed = 'sistemazero-f3-v1'
const now = '2026-10-15T00:00:00.000Z'
const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex')
const percentile = (values: number[], fraction: number) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)
  ]
async function sample(operation: () => Promise<unknown>, iterations = 1000) {
  for (let i = 0; i < 3; i++) await operation()
  const milliseconds: number[] = []
  let value: unknown
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    value = await operation()
    milliseconds.push(performance.now() - start)
  }
  return {
    p50: percentile(milliseconds, 0.5),
    p95: percentile(milliseconds, 0.95),
    p99: percentile(milliseconds, 0.99),
    milliseconds,
    last: value,
  }
}
async function fixture(sessions: number, turns: number, eventsPerTurn: number) {
  const directory = await mkdtemp(join(tmpdir(), 'zero-F3-'))
  const journal = new Journal(join(directory, 'state.sqlite'))
  const start = performance.now()
  journal.db.transaction(() => {
    for (let session = 0; session < sessions; session++) {
      const sessionId = `session-${String(session).padStart(4, '0')}`
      journal.put('sessions', sessionId, {
        id: sessionId,
        workspace: directory,
        title: `Sessão ${session}`,
        createdAt: now,
        archived: false,
      })
      for (let turn = 0; turn < turns; turn++) {
        const id = `${sessionId}-turn-${turn}`
        journal.put(
          'runs',
          id,
          runSchema.parse({
            id,
            sessionId,
            input: `Mensagem ${turn} — ação 日本語`,
            model: 'fixture',
            backend: 'openrouter',
            mode: 'plan',
            state: 'succeeded',
            maxCost: 1,
            maxSteps: 10,
            createdAt: now,
            updatedAt: now,
          }),
        )
        for (let event = 0; event < eventsPerTurn; event++)
          journal.append(
            id,
            event === eventsPerTurn - 1 ? 'assistant.final' : 'assistant.delta',
            `Resposta ${turn}: parte ${event}`,
          )
      }
    }
  })()
  const generateMs = performance.now() - start
  const schemaPlan = journal.db
    .query(
      'EXPLAIN QUERY PLAN SELECT * FROM events WHERE run_id=? AND sequence>? ORDER BY sequence LIMIT ?',
    )
    .all('session-0000-turn-0', 0, 100)
  journal.close()
  const store = new Store(join(directory, 'state.sqlite'))
  const supervisor = new Supervisor(directory, store)
  await supervisor.initialize()
  const host = await listen(directory, (command, signal) => supervisor.handle(command, signal))
  const client = await RuntimeClient.connect(directory)
  try {
    const history = await sample(() =>
      client.request('history.page', { namespace: 'sessions', limit: 100 }),
    )
    const snapshot = await sample(() =>
      client.request('session.snapshot', { sessionId: 'session-0000' }),
    )
    const tail = await sample(() =>
      client.request('events.tail', { runId: 'session-0000-turn-0', limit: 100 }),
    )
    const reconnect = await sample(async () => {
      const reconnect = await RuntimeClient.connect(directory)
      try {
        return await reconnect.request('session.snapshot', { sessionId: 'session-0000' })
      } finally {
        reconnect.close()
      }
    }, 30)
    return {
      fixture: {
        seed,
        sessions,
        messages: sessions * turns * 2,
        events: sessions * turns * eventsPerTurn,
        checksum: hash({ seed, sessions, turns, eventsPerTurn, now }),
        directory,
      },
      generateMs,
      schemaPlan,
      memory: process.memoryUsage(),
      history: { ...history, last: undefined },
      snapshot: { ...snapshot, last: undefined },
      tail: { ...tail, last: undefined },
      reconnect: { ...reconnect, last: undefined },
    }
  } finally {
    client.close()
    await host.close()
    await supervisor.shutdown()
    await new Credentials(directory).delete('ipc')
  }
}
const hardware = {
  cpu: cpus()[0]?.model,
  cores: cpus().length,
  memoryBytes: totalmem(),
  os: platform(),
  release: release(),
  bun: Bun.version,
}
const small = await fixture(50, 2, 10)
const full = await fixture(500, 10, 20)
const directory = resolve(import.meta.dir, '../../../.audits/tui-bench/working-tree/win32')
await mkdir(directory, { recursive: true })
const report = {
  at: new Date().toISOString(),
  hardware,
  notes:
    'Warm storage; source build; all timings include authenticated IPC and worker. No browser or native clients.',
  small,
  full,
}
await writeFile(join(directory, 'F3-history-baseline.json'), JSON.stringify(report, null, 2))
console.log(
  JSON.stringify(
    {
      file: join(directory, 'F3-history-baseline.json'),
      hardware,
      small: { history: small.history.p95, snapshot: small.snapshot.p95, tail: small.tail.p95 },
      full: {
        history: full.history.p95,
        snapshot: full.snapshot.p95,
        tail: full.tail.p95,
        reconnect: full.reconnect.p95,
        rss: full.memory.rss,
      },
    },
    null,
    2,
  ),
)
