import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { environmentRequestSchema, runSchema } from '@sistemazero/agent-core'
import { Environments } from '../src/environments/manager'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'

test('environment intent deduplicates, revisions revoke queued uses and local cleanup preserves user files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-env-'))
  const workspace = await mkdtemp(join(tmpdir(), 'zero-env-workspace-'))
  await writeFile(join(workspace, 'keep.txt'), 'user WIP')
  const store = new Store(join(directory, 'state.sqlite'))
  const manager = new Environments(store, new Processes(directory), directory)
  const run = runSchema.parse({
    id: 'run',
    sessionId: 'session',
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
  const context = { workspace, run, signal: AbortSignal.timeout(10000), ask: async () => 'deny' }
  const request = environmentRequestSchema.parse({
    intentId: 'one',
    kind: 'local',
    template: { name: 'local' },
  })
  try {
    const [first, duplicate] = await Promise.all([
      manager.acquire(request, context),
      manager.acquire(request, context),
    ])
    expect(first.id).toBe(duplicate.id)
    expect((await manager.list()).values).toHaveLength(1)
    await expect(
      manager.acquire({ ...request, template: { ...request.template, cpus: 3 } }, context),
    ).rejects.toThrow('identity')
    let started!: () => void
    const entered = new Promise<void>((resolve) => {
      started = resolve
    })
    const running = manager.own(first, context, async (_lease, signal) => {
      started()
      await new Promise<void>((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
      )
    })
    void running.catch(() => {})
    await entered
    const stopped = await manager.stop(first.id, first.generation)
    await expect(running).rejects.toThrow('revoked')
    expect(stopped.generation).toBe(first.generation + 1)
    await expect(manager.validate(first, context)).rejects.toThrow('revoked')
    const destroyed = await manager.destroy(stopped.id, stopped.generation, context.signal)
    expect(destroyed.state).toBe('destroyed')
    expect(await readFile(join(workspace, 'keep.txt'), 'utf8')).toBe('user WIP')
  } finally {
    await manager.close()
    await store.close()
  }
}, 15000)
