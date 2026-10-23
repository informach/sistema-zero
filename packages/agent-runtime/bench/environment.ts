import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { environmentRequestSchema, runSchema } from '@sistemazero/agent-core'
import { Environments } from '../src/environments/manager'
import { inspectImage } from '../src/environments/templates'
import { Processes } from '../src/process/manager'
import { Services, serviceRequestSchema } from '../src/services/registry'
import { Store } from '../src/store/client'
import { Workspaces } from '../src/workspace/snapshot'

const profile = await mkdtemp(join(tmpdir(), 'zero-container-'))
const workspace = await mkdtemp(join(tmpdir(), 'zero-container-wip-'))
const processes = new Processes(profile)
const store = new Store(join(profile, 'state.sqlite'))
const manager = new Environments(store, processes, profile)
const services = new Services(manager)
const signal = AbortSignal.timeout(120000)
const git = async (args: string[]) => {
  const result = await processes.run({ executable: 'git', args, cwd: workspace }, signal)
  if (result.code !== 0) throw new Error(result.output)
}
const run = runSchema.parse({
  id: 'fixture',
  sessionId: 'fixture',
  input: 'fixture',
  backend: 'openrouter',
  model: '',
  mode: 'build',
  state: 'running',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  maxCost: 1,
  maxSteps: 5,
})
const context = { workspace, run, signal, ask: async () => 'deny' }
try {
  await git(['init'])
  await writeFile(join(workspace, 'fixture.txt'), 'base')
  await git(['add', 'fixture.txt'])
  await git([
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@invalid',
    'commit',
    '-m',
    'fixture',
  ])
  await writeFile(join(workspace, 'fixture.txt'), 'working tree')
  await writeFile(join(workspace, '.env'), 'PRIVATE_FIXTURE=must-not-enter')
  const snapshot = await new Workspaces(store, processes, profile).capture(workspace, signal)
  const image = await inspectImage(processes, workspace, 'oven/bun:1.3.11', signal)
  const started = performance.now()
  let lease = await manager.acquire(
    environmentRequestSchema.parse({
      intentId: 'container',
      kind: 'container',
      snapshotId: snapshot.id,
      template: { name: 'bun', image: image.image },
    }),
    context,
  )
  const readyMs = performance.now() - started
  const proof = await manager.execute(
    lease,
    'bun',
    [
      '-e',
      'const fs=await import("node:fs/promises");if(await fs.readFile("fixture.txt","utf8")!=="working tree")throw Error("WIP missing");if(await Bun.file(".env").exists())throw Error("secret entered");let blocked=false;try{await fs.writeFile("/root-write","x")}catch{blocked=true}if(!blocked)throw Error("root writable");if(await Bun.file("/var/run/docker.sock").exists())throw Error("socket exposed");if(process.getuid()===0)throw Error("root user");await fs.writeFile("fixture.txt","container change");console.log(JSON.stringify({uid:process.getuid(),rootReadOnly:blocked,secretExcluded:true}));',
    ],
    15000,
    context,
  )
  lease = await manager.stop(lease.id, lease.generation)
  const exported = await manager.export(lease.id, lease.generation, signal)
  if (!exported.value.changes.some((change) => change.path === 'fixture.txt'))
    throw new Error('Change absent from export')
  lease = await manager.destroy(lease.id, lease.generation, signal)
  const interrupted = await manager.acquire(
    environmentRequestSchema.parse({
      intentId: 'cancel',
      kind: 'container',
      snapshotId: snapshot.id,
      template: { name: 'bun', image: image.image },
    }),
    context,
  )
  let canceled = false
  try {
    await manager.execute(
      interrupted,
      'bun',
      ['-e', 'Bun.spawn(["sleep","600"]);setInterval(()=>{},1000)'],
      500,
      context,
    )
  } catch {
    canceled = true
  }
  const afterCancel = await manager.get(interrupted.id)
  if (
    !canceled ||
    afterCancel.state !== 'stopped' ||
    afterCancel.generation === interrupted.generation
  )
    throw new Error('Container execution was not revoked after timeout')
  if ((await manager.containers.inspect(afterCancel, signal))?.State.Running)
    throw new Error('Container descendants remain running')
  await manager.export(afterCancel.id, afterCancel.generation, signal)
  await manager.destroy(afterCancel.id, afterCancel.generation, signal)
  const previewLease = await manager.acquire(
    environmentRequestSchema.parse({
      intentId: 'preview',
      kind: 'container',
      snapshotId: snapshot.id,
      template: { name: 'bun-preview', image: image.image, network: 'bridge', ports: [3000] },
    }),
    context,
  )
  const service = await services.start(
    serviceRequestSchema.parse({
      lease: previewLease,
      intentId: 'http',
      executable: 'bun',
      args: [
        '-e',
        'Bun.serve({hostname:process.env.HOST,port:Number(process.env.PORT),fetch:()=>new Response("preview")})',
      ],
      port: 3000,
    }),
    context,
  )
  if ((await (await fetch(service.url ?? '')).text()) !== 'preview')
    throw new Error('Container preview unavailable')
  await services.stop(service.id, context)
  const stoppedPreview = await manager.get(previewLease.id)
  if (stoppedPreview.state !== 'stopped')
    throw new Error('Stopping container service did not revoke its lease')
  await manager.export(stoppedPreview.id, stoppedPreview.generation, signal)
  await manager.destroy(stoppedPreview.id, stoppedPreview.generation, signal)
  if ((await manager.containers.owned(signal)).length) throw new Error('Owned resource leaked')
  console.log(
    JSON.stringify({
      readyMs,
      proof: proof.output.trim(),
      state: lease.state,
      changes: exported.value.changes.length,
      image,
      cancellation: afterCancel.state,
      preview: 'verified and stopped',
    }),
  )
} finally {
  await services.close()
  await manager.close()
  for (const lease of (await manager.list('', ['stopped'])).values) {
    if (lease.snapshotId)
      await manager.export(lease.id, lease.generation, AbortSignal.timeout(30000))
    await manager.destroy(lease.id, lease.generation, AbortSignal.timeout(30000))
  }
  await store.close()
}
