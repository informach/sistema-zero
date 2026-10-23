import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { Environments } from '../src/environments/manager'
import { inspectImage } from '../src/environments/templates'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'
import { Workspaces } from '../src/workspace/snapshot'

const profile = await mkdtemp(join(tmpdir(), 'zero-env-crash-'))
const workspace = await mkdtemp(join(tmpdir(), 'zero-env-crash-wip-'))
const processes = new Processes(profile)
const store = new Store(join(profile, 'state.sqlite'))
const signal = AbortSignal.timeout(60000)
for (const args of [
  ['init'],
  [
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@invalid',
    'commit',
    '--allow-empty',
    '-m',
    'fixture',
  ],
]) {
  const result = await processes.run({ executable: 'git', args, cwd: workspace }, signal)
  if (result.code !== 0) throw new Error(result.output)
}
await writeFile(join(workspace, 'keep.txt'), 'WIP before crash')
const snapshot = await new Workspaces(store, processes, profile).capture(workspace, signal)
const image = await inspectImage(processes, workspace, 'oven/bun:1.3.11', signal)
await writeFile(
  join(profile, 'fixture.json'),
  JSON.stringify({ workspace, snapshotId: snapshot.id, image: image.image }),
)
await store.close()
const child = await processes.open({
  executable: process.execPath,
  args: [join(import.meta.dir, 'environment-crash-child.ts'), profile],
  cwd: workspace,
})
let receipt = ''
const errorDrain = (async () => {
  for await (const data of child.stderr) console.error(Buffer.from(data).toString('utf8'))
})()
try {
  const deadline = setTimeout(() => child.cancel(), 30000)
  try {
    const iterator = child.stdout[Symbol.asyncIterator]()
    while (!receipt.includes('\n')) {
      const chunk = await iterator.next()
      if (chunk.done) throw new Error('Fixture exited before provisioning')
      receipt += Buffer.from(chunk.value).toString('utf8')
      if (receipt.length > 1000) throw new Error('Invalid fixture receipt')
    }
  } finally {
    clearTimeout(deadline)
  }
} finally {
  await child.close()
  await errorDrain
}
const identity = z
  .object({ id: z.string(), generation: z.number() })
  .parse(JSON.parse(receipt.trim()))
const reopened = new Store(join(profile, 'state.sqlite'))
const recovered = new Environments(reopened, processes, profile)
try {
  const before = await recovered.get(identity.id)
  if (!(await recovered.containers.inspect(before, signal))?.State.Running)
    throw new Error('Crash did not leave the intended orphan fixture')
  const reports = await recovered.reconcile()
  const after = await recovered.get(identity.id)
  if (after.state !== 'stopped' || after.generation <= identity.generation)
    throw new Error('Recovery did not revoke orphan lease')
  await recovered.export(after.id, after.generation, signal)
  await recovered.destroy(after.id, after.generation, signal)
  console.log(JSON.stringify({ crashRecovery: 'passed', reports }))
} finally {
  await recovered.close()
  await reopened.close()
}
