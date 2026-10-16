import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runSchema, sessionSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { configure } from '../src/application'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { tool } from '../src/tools/definition'

const directory = await mkdtemp(join(tmpdir(), 'zero-F7-')),
  store = new Store(join(directory, 'state.sqlite')),
  supervisor = new Supervisor(directory, store)
await supervisor.initialize()
const app = configure(supervisor)
await app.ready
let calls = 0
app.dispatcher.register(
  tool('fixture_large', 'Return deterministic large output', 'read', z.object({}), async () => {
    calls++
    return { data: 'x'.repeat(60000) }
  }),
)
const signal = AbortSignal.timeout(180000),
  request = (method: string, params: unknown = {}) =>
    supervisor.handle({ id: crypto.randomUUID(), method, params }, signal)
try {
  const session = sessionSchema.parse(await request('session.create', { workspace: directory }))
  const now = new Date().toISOString(),
    parent = runSchema.parse({
      id: 'parent',
      sessionId: session.id,
      input: 'workflow fixture',
      backend: 'openrouter',
      model: 'fixture',
      mode: 'plan',
      state: 'succeeded',
      createdAt: now,
      updatedAt: now,
      maxCost: 1,
      maxSteps: 10,
    })
  await store.call({ op: 'run.put', value: parent, requestId: 'parent', digest: 'parent' })
  const nodes = Array.from({ length: 100 }, (_, i) => ({
    id: 'node' + i,
    kind: 'capability',
    dependsOn: i ? ['node' + (i - 1)] : [],
    tool: 'fixture_large',
    input: {},
    outputSchema: { type: 'object', required: ['data'], properties: { data: { type: 'string' } } },
  }))
  const compileStart = performance.now(),
    definition = await app.workflows.compile({
      version: 1,
      name: 'f7',
      description: '100 sequential nodes, large outputs by artifact reference',
      inputSchema: { type: 'object' },
      nodes,
    }),
    compileMs = performance.now() - compileStart
  const start = performance.now(),
    record = await app.workflows.start(
      'f7',
      definition.digest,
      {},
      { run: parent, workspace: directory, signal, ask: async () => '' },
    )
  let current = await app.workflows.get(record.id)
  while (current.state === 'running') {
    signal.throwIfAborted()
    await Bun.sleep(20)
    current = await app.workflows.get(record.id)
  }
  if (current.state !== 'succeeded' || calls !== 100)
    throw new Error('F7 failed: ' + JSON.stringify(current))
  const result = {
    at: new Date().toISOString(),
    nodes: 100,
    calls,
    compileMs,
    durationMs: performance.now() - start,
    recordBytes: Buffer.byteLength(JSON.stringify(current)),
    artifacts: await store.call({ op: 'artifact.usage' }),
    memory: process.memoryUsage(),
    state: current.state,
  }
  const output = resolve(
    import.meta.dir,
    '../../../.audits/tui-bench/working-tree/win32/F7-workflow.json',
  )
  await mkdir(resolve(output, '..'), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  await supervisor.shutdown()
}
