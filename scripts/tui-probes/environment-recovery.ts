import { realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { Environments } from '../../packages/agent-runtime/src/environments/manager'
import { Processes } from '../../packages/agent-runtime/src/process/manager'
import { Store } from '../../packages/agent-runtime/src/store/client'

const input = process.argv[2]
if (!input) throw new Error('Pass the explicit fixture profile directory')
const directory = await realpath(input)
const store = new Store(join(directory, 'state.sqlite'))
const manager = new Environments(store, new Processes(directory), directory)
try {
  console.log(JSON.stringify(await manager.reconcile()))
  for (const lease of (await manager.list('', ['stopped'])).values) {
    const exported = await manager.export(lease.id, lease.generation, AbortSignal.timeout(30000))
    const destroyed = await manager.destroy(lease.id, lease.generation, AbortSignal.timeout(30000))
    console.log(JSON.stringify({ id: lease.id, export: exported.artifact, state: destroyed.state }))
  }
} finally {
  await manager.close()
  await store.close()
}
