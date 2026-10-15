import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTestRenderer } from '@opentui/core/testing'
import {
  browserOpenSchema,
  browserSnapshotSchema,
} from '../../packages/agent-integrations/src/browser/schema'
import { SchemaValidator } from '../../packages/agent-integrations/src/mcp/schema'
import { startBrowserWorker } from '../../packages/agent-runtime/src/browser/worker'
import { ProjectIndex } from '../../packages/agent-runtime/src/context/index'
import { TypeScriptService } from '../../packages/agent-runtime/src/context/typescript'
import { Processes } from '../../packages/agent-runtime/src/process/manager'
import { ProcessRpc } from '../../packages/agent-runtime/src/process/rpc'
import { Store } from '../../packages/agent-runtime/src/store/client'
import { verify } from './manifest'

await verify(import.meta.dir)
const directory = await mkdtemp(join(tmpdir(), 'Zero pacote ação 日本語 '))
const checks: string[] = ['manifest']
const store = new Store(join(directory, 'state.sqlite'))
const validator = new SchemaValidator()
const processes = new Processes(directory)
const index = new ProjectIndex(processes, directory)
try {
  await store.call({ op: 'session.list', offset: 0 })
  checks.push('sqlite-worker')
  await validator.validate(
    { type: 'object', required: ['ok'], properties: { ok: { const: true } } },
    { ok: true },
  )
  checks.push('schema-worker')
  await writeFile(join(directory, 'sample.ts'), 'export const n: number = "wrong"')
  await writeFile(
    join(directory, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true }, include: ['sample.ts'] }),
  )
  const diagnostics = await new TypeScriptService(index).query(
    directory,
    'sample.ts',
    'diagnostics',
    0,
    AbortSignal.timeout(30000),
  )
  if (!JSON.stringify(diagnostics.value).includes('2322'))
    throw new Error('Packaged TypeScript worker did not diagnose fixture')
  checks.push('typescript-worker')
  const setup = await createTestRenderer({ width: 80, height: 24 })
  try {
    await setup.renderOnce()
    checks.push('opentui-native-wasm')
  } finally {
    setup.renderer.destroy()
  }
  const terminal = await processes.run(
    {
      executable: 'node',
      args: ['-e', 'console.log("READY="+process.stdout.isTTY)'],
      cwd: directory,
      terminal: { columns: 80, rows: 24 },
      timeoutMs: 10000,
    },
    AbortSignal.timeout(15000),
  )
  if (terminal.code !== 0 || !terminal.output.includes('READY=true'))
    throw new Error('Packaged ConPTY helper failed: ' + terminal.output)
  checks.push('windows-job-conpty')
  const owned = await startBrowserWorker(processes, directory, AbortSignal.timeout(30000))
  const rpc = new ProcessRpc(owned, true)
  try {
    await rpc.request('open', browserOpenSchema.parse({ mode: 'plan', publicWeb: false }))
    browserSnapshotSchema.parse(await rpc.request('observe'))
    await rpc.request('close')
    checks.push('node-chromium-worker')
  } finally {
    await rpc.close()
  }
  console.log(JSON.stringify({ checks, directory, bun: Bun.version, platform: process.platform }))
} finally {
  validator.close()
  index.close()
  await store.close()
}
