import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { environmentRequestSchema, runSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Environments } from '../src/environments/manager'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'

const profile = z.string().parse(process.argv[2])
const input = z
  .object({ workspace: z.string(), snapshotId: z.string(), image: z.string() })
  .parse(JSON.parse(await readFile(join(profile, 'fixture.json'), 'utf8')))
const manager = new Environments(
  new Store(join(profile, 'state.sqlite')),
  new Processes(profile),
  profile,
)
const run = runSchema.parse({
  id: 'crash',
  sessionId: 'crash',
  input: 'crash',
  backend: 'openrouter',
  model: '',
  mode: 'build',
  state: 'running',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  maxCost: 1,
  maxSteps: 5,
})
const lease = await manager.acquire(
  environmentRequestSchema.parse({
    intentId: 'crash',
    kind: 'container',
    snapshotId: input.snapshotId,
    template: { name: 'bun', image: input.image },
  }),
  { run, workspace: input.workspace, signal: AbortSignal.timeout(60000), ask: async () => 'deny' },
)
console.log(JSON.stringify({ id: lease.id, generation: lease.generation }))
setInterval(() => {}, 1000)
