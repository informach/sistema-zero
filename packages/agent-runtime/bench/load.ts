import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { canonical, runSchema, sessionSchema } from '@sistemazero/agent-core'
import { browserOpenSchema, browserSnapshotSchema } from '@sistemazero/agent-integrations/browser'
import { z } from 'zod'
import { configure } from '../src/application'
import { startBrowserWorker } from '../src/browser/worker'
import { RuntimeClient } from '../src/client'
import { Credentials } from '../src/credentials'
import { listen } from '../src/ipc/server'
import { ProcessRpc } from '../src/process/rpc'
import { Store } from '../src/store/client'
import { Supervisor } from '../src/supervisor'
import { hash } from '../src/tools/paths'

const directory = await mkdtemp(join(tmpdir(), 'zero-F4-F5-'))
const supervisor = new Supervisor(directory, new Store(join(directory, 'state.sqlite')))
await supervisor.initialize()
const app = configure(supervisor)
await app.ready
const host = await listen(directory, (command, signal) => supervisor.handle(command, signal)),
  client = await RuntimeClient.connect(directory)
const signal = AbortSignal.timeout(360000),
  percentile = (values: number[], p: number) =>
    [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1]
async function latency() {
  const values = []
  for (let i = -3; i < 1000; i++) {
    const start = performance.now()
    await client.request('ping')
    if (i >= 0) values.push(performance.now() - start)
  }
  return {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    milliseconds: values,
  }
}
let rpc: ProcessRpc | undefined, fixture: ReturnType<typeof Bun.serve> | undefined
try {
  const f4Started = performance.now()
  const handles = await Promise.all(
    Array.from({ length: 4 }, () =>
      app.processes.start(
        {
          executable: process.execPath,
          args: [
            '-e',
            'const b=Buffer.alloc(65536,120);setInterval(()=>process.stdout.write(b),50)',
          ],
          cwd: directory,
          timeoutMs: 300000,
        },
        signal,
      ),
    ),
  )
  const outputLatency = await latency(),
    outputs = await Promise.all(handles.map((handle) => handle.completion))
  if (
    outputs.some(
      (output) =>
        output.reason !== 'output_limit' ||
        output.bytes !== 4_000_000 ||
        Buffer.byteLength(output.output) > 32004,
    )
  )
    throw new Error('F4 output quota was not enforced')
  const f4 = {
    durationMs: performance.now() - f4Started,
    offeredBytesPerSecond: 5 * 1024 ** 2,
    policy: 'Terminate each owned process at 4 MB, rather than retaining five minutes of output',
    outputs: outputs.map(({ code, reason, bytes }) => ({ code, reason, bytes })),
    ipc: outputLatency,
    memory: process.memoryUsage(),
  }
  await writeFile(
    join(directory, 'sample.txt'),
    'Small reproducible file under eight concurrent readers.\n',
  )
  fixture = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: () =>
      new Response('<!doctype html><h1>F5</h1><p>Local browser fixture</p>', {
        headers: { 'content-type': 'text/html' },
      }),
  })
  const origin = fixture.url.origin
  rpc = new ProcessRpc(await startBrowserWorker(app.processes, directory, signal), true)
  rpc.onRequest = async (method, raw) => ({
    allowed:
      method === 'network.local' && z.object({ origin: z.string() }).parse(raw).origin === origin,
  })
  await rpc.request(
    'open',
    browserOpenSchema.parse({ mode: 'plan', publicWeb: false, localOrigins: [origin] }),
  )
  browserSnapshotSchema.parse(await rpc.request('navigate', { url: fixture.url.href }))
  const session = sessionSchema.parse(
      await client.request('session.create', { workspace: directory }),
    ),
    started = performance.now(),
    until = Date.now() + 300000
  let reads = 0,
    builds = 0,
    browserObservations = 0
  const processInput = {
    executable: 'node',
    args: [
      '-e',
      'const end=Date.now()+3000;let n=0;while(Date.now()<end){n=Math.sqrt(n+1)}console.log(n)',
    ],
    cwd: '.',
    timeoutMs: 10000,
  }
  supervisor.executor = async (run, workspace, abort) => {
    if (run.input === 'readers')
      while (Date.now() < until && !abort.aborted) {
        const values = await Promise.all(
          Array.from({ length: 8 }, (_, i) =>
            app.dispatcher.dispatch(
              run,
              workspace,
              `${run.id}:${reads}:${i}`,
              'file_read',
              { path: 'sample.txt' },
              abort,
            ),
          ),
        )
        if (values.some((value) => value.kind !== 'ok')) throw new Error('F5 reader failed')
        reads += 8
        await supervisor.emit(run.id, 'assistant.delta', 'Leituras verificadas. ')
        await Bun.sleep(100)
      }
    else {
      const definition = app.dispatcher.tools.get('process_run')!.definition
      await app.dispatcher.grants.issue(
        run,
        workspace,
        'process_run',
        hash(canonical({ capability: definition, input: processInput, workspace })),
      )
      while (Date.now() < until && !abort.aborted) {
        const outcome = await app.dispatcher.dispatch(
          run,
          workspace,
          `${run.id}:${builds}`,
          'process_run',
          processInput,
          abort,
        )
        if (outcome.kind !== 'ok') throw new Error('F5 build failed: ' + JSON.stringify(outcome))
        builds++
        await Bun.sleep(100)
      }
    }
    await supervisor.emit(run.id, 'assistant.final', 'F5 fixture completed')
  }
  const runs = await Promise.all(
    ['readers', 'build'].map((input) =>
      client
        .request('run.start', {
          requestId: crypto.randomUUID(),
          sessionId: session.id,
          input,
          mode: 'build',
        })
        .then(runSchema.parse),
    ),
  )
  const ui = Bun.spawn(
    [process.execPath, resolve(import.meta.dir, '../../tui/bench/interaction.tsx')],
    {
      cwd: directory,
      env: { ...process.env, ZERO_BENCH_PROFILE: directory, ZERO_BENCH_WORKSPACE: directory },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const uiResult = Promise.all([
    new Response(ui.stdout).text(),
    new Response(ui.stderr).text(),
    ui.exited,
  ])
  const loadedLatency = await latency()
  while (Date.now() < until) {
    await Bun.sleep(1000)
    browserSnapshotSchema.parse(await rpc.request('observe'))
    browserObservations++
    if (browserObservations % 30 === 0)
      console.log(
        `F5 ${Math.round((performance.now() - started) / 1000)}s: ${reads} reads, ${builds} builds, ${browserObservations} browser observations`,
      )
  }
  for (const run of runs) await supervisor.waitRun(run.id, signal)
  const [uiOutput, uiErrors, uiCode] = await uiResult
  if (uiCode || !uiOutput.includes('"p95"'))
    throw new Error('F5 UI benchmark failed: ' + uiErrors.slice(-4000))
  const terminal = await Promise.all(
    runs.map((run) => client.request('run.get', { id: run.id }).then(runSchema.parse)),
  )
  if (terminal.some((run) => run.state !== 'succeeded'))
    throw new Error('F5 executor failed: ' + JSON.stringify(terminal))
  const result = {
    at: new Date().toISOString(),
    directory,
    f4,
    f5: {
      durationMs: performance.now() - started,
      syntheticExecutors: 2,
      peakReaders: 8,
      buildConcurrency: 1,
      browserContexts: 1,
      reads,
      builds,
      browserObservations,
      ipc: loadedLatency,
      ui: JSON.parse(uiOutput.trim()),
      memory: process.memoryUsage(),
      note: 'Synthetic agent executors on the real supervisor/dispatcher; real filesystem, CPU processes and Chromium. No provider throughput/cost comparison.',
    },
  }
  const output = resolve(
    import.meta.dir,
    '../../../.audits/tui-bench/working-tree/win32/F4-F5-load.json',
  )
  await mkdir(resolve(output, '..'), { recursive: true })
  await writeFile(output, JSON.stringify(result, null, 2))
  console.log(
    JSON.stringify({
      output,
      f4Ms: result.f4.durationMs,
      f5Ms: result.f5.durationMs,
      reads,
      builds,
      browserObservations,
    }),
  )
} finally {
  await rpc?.close()
  fixture?.stop(true)
  client.close()
  await host.close()
  await supervisor.shutdown()
  await new Credentials(directory).delete('ipc')
}
