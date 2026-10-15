import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { environmentRequestSchema, runSchema } from '../../packages/agent-core/src'
import { Environments } from '../../packages/agent-runtime/src/environments/manager'
import { Processes } from '../../packages/agent-runtime/src/process/manager'
import { assertOwnedPort } from '../../packages/agent-runtime/src/services/ports'
import { Services, serviceRequestSchema } from '../../packages/agent-runtime/src/services/registry'
import { Store } from '../../packages/agent-runtime/src/store/client'
import { readBounded } from '../../packages/agent-runtime/src/tools/paths'

const directory = await mkdtemp(join(tmpdir(), 'zero-port-review-'))
const store = new Store(join(directory, 'state.sqlite'))
const processes = new Processes(directory)
const environments = new Environments(store, processes, directory)
const services = new Services(environments)
const context = {
  workspace: directory, signal: AbortSignal.timeout(120000), ask: async () => 'deny',
  run: runSchema.parse({ id: 'bench', sessionId: 'bench', input: 'bench', backend: 'openrouter', model: '', mode: 'build', state: 'running', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), maxCost: 1, maxSteps: 1 }),
}
const free = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() })
const port = free.port
free.stop(true)
try {
  const lease = await environments.acquire(environmentRequestSchema.parse({ intentId: 'bench', kind: 'local', template: { name: 'local' } }), context)
  const service = await services.start(serviceRequestSchema.parse({ lease, intentId: 'bench', executable: process.execPath, args: ['-e', 'Bun.serve({hostname:process.env.HOST,port:Number(process.env.PORT),fetch:()=>new Response("owned")})'], port }), context)
  if (!service.pid || !port) throw new Error('Missing service identity')
  // Exact WMI query from staging 8ea02d96, measured including process ownership and log read.
  const script = '$ErrorActionPreference="Stop"; $listeners=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -eq ' + port + '} | Select-Object -ExpandProperty OwningProcess -Unique); $items=@(Get-CimInstance Win32_Process | ForEach-Object { @{id=[int]$_.ProcessId;parent=[int]$_.ParentProcessId;created=$_.CreationDate.ToUniversalTime().ToString("o")} }); @{listeners=$listeners;processes=$items}|ConvertTo-Json -Compress -Depth 4'
  const oldQueryMs: number[] = [], nativeOwnershipMs: number[] = []
  for (let index = -1; index < 10; index++) {
    let started = performance.now()
    const old = await processes.run({ executable: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], cwd: directory, timeoutMs: 15000, maxBytes: 2_000_000, logMode: 'stdout' }, context.signal)
    if (old.code !== 0 || old.reason !== 'exited') throw new Error('Baseline ownership query failed: ' + old.output)
    JSON.parse((await readBounded(join(directory, 'logs', old.log), 2_000_000)).toString('utf8'))
    const oldMs = performance.now() - started
    started = performance.now()
    await assertOwnedPort(processes, directory, service.pid, port, context.signal)
    if (index >= 0) { oldQueryMs.push(oldMs); nativeOwnershipMs.push(performance.now() - started) }
  }
  const summarize = (samples: number[]) => {
    const sorted = [...samples].sort((a, b) => a - b)
    return { samples, p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1] }
  }
  const report = { recordedAt: new Date().toISOString(), platform: process.platform, bun: Bun.version, iterations: 10, warmups: 1, methodology: 'Alternating on the same live owned service. Baseline measures the old PowerShell/WMI query plus log read/JSON parse, excluding its JS ancestry check; native measures the full current ownership assertion. No inference or browser.', baselineQuery: summarize(oldQueryMs), nativeOwnership: summarize(nativeOwnershipMs) }
  await writeFile(join(import.meta.dir, 'ports.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  await services.close()
  await environments.close()
  await store.close()
}
