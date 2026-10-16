import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSchema, sessionSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Artifacts } from '../src/store/artifacts'
import { Store } from '../src/store/client'
import { hash } from '../src/tools/paths'
import { checkpointSchema, Patches } from '../src/workspace/patch'

test('artifact quota is atomic, active owners survive retention and deletion is journaled before removing content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-artifact-quota-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const artifacts = new Artifacts(directory)
  Artifacts.configure(directory, 1000, 30)
  try {
    const session = sessionSchema.parse({
      id: 'session',
      workspace: directory,
      title: 'quota',
      createdAt: new Date().toISOString(),
    })
    await store.call({ op: 'session.put', value: session })
    await store.call({
      op: 'run.put',
      requestId: 'active',
      digest: 'active',
      value: runSchema.parse({
        id: 'active',
        sessionId: session.id,
        input: 'fixture',
        backend: 'codex',
        model: '',
        mode: 'build',
        state: 'queued',
        maxCost: 1,
        maxSteps: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    })
    const reference = await Artifacts.owned('active', () => artifacts.put('a'.repeat(600)))
    const attempts = await Promise.allSettled([
      artifacts.put('b'.repeat(300)),
      artifacts.put('c'.repeat(300)),
    ])
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(
      z.object({ bytes: z.number() }).parse(await store.call({ op: 'artifact.usage' })).bytes,
    ).toBe(900)
    expect((await artifacts.collect(Date.now() + 31 * 86400000)).deleted).toBe(0)
    expect((await artifacts.range(reference, 100, 10)).toString()).toBe('a'.repeat(10))
    await expect(artifacts.range(reference, 0, 256001)).rejects.toThrow('range')
    await store.call({ op: 'run.state', id: 'active', state: 'canceled' })
    expect((await artifacts.collect(Date.now() + 32 * 86400000)).deleted).toBe(1)
    await expect(artifacts.read(reference)).rejects.toThrow('unavailable')
    expect(
      z.object({ bytes: z.number() }).parse(await store.call({ op: 'artifact.usage' })).bytes,
    ).toBe(300)
    const revived = await artifacts.put('a'.repeat(600))
    expect((await artifacts.read(revived)).length).toBe(600)
    const path = join(directory, 'artifacts', revived.id.slice(0, 2), revived.id)
    await writeFile(path, 'x'.repeat(600))
    await expect(artifacts.range(revived, 400, 10)).rejects.toThrow('integrity')
  } finally {
    await store.close()
  }
})

test('checkpoint recovery classifies writes around a crash and preserves external edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-checkpoint-recover-'))
  let store = new Store(join(directory, 'state.sqlite'))
  const artifacts = new Artifacts(directory)
  const backup = await artifacts.put('before')
  await writeFile(join(directory, 'a.txt'), 'after')
  await writeFile(join(directory, 'b.txt'), 'external')
  const checkpoint = checkpointSchema.parse({
    id: 'checkpoint',
    runId: 'interrupted',
    workspace: directory,
    state: 'prepared',
    createdAt: new Date().toISOString(),
    entries: ['a.txt', 'b.txt'].map((path) => ({
      path,
      before: hash('before'),
      after: hash('after'),
      artifact: backup,
      state: 'prepared',
    })),
  })
  await store.call({
    op: 'document.put',
    namespace: 'checkpoints',
    id: checkpoint.id,
    value: checkpoint,
  })
  await store.close()
  store = new Store(join(directory, 'state.sqlite'))
  try {
    const patches = new Patches(store, directory)
    await new Artifacts(directory).initialize()
    await patches.reconcile()
    const recovered = checkpointSchema.parse(
      await store.call({ op: 'document.get', namespace: 'checkpoints', id: checkpoint.id }),
    )
    expect(recovered.state).toBe('partial')
    expect(recovered.entries[0]?.state).toBe('applied')
    expect(recovered.conflicts).toEqual(['b.txt'])
    expect(await readFile(join(directory, 'b.txt'), 'utf8')).toBe('external')
    await expect(
      patches.restore(checkpoint.id, 'new-run', new AbortController().signal),
    ).rejects.toThrow('External changes')
  } finally {
    await store.close()
  }
})

test('an active nested workflow protects artifacts across its entire root task family', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-artifact-workflow-'))
  const store = new Store(join(directory, 'state.sqlite'))
  const artifacts = new Artifacts(directory),
    now = new Date().toISOString()
  try {
    await store.call({
      op: 'session.put',
      value: sessionSchema.parse({
        id: 'session',
        workspace: directory,
        title: 'retention',
        createdAt: now,
      }),
    })
    const root = runSchema.parse({
      id: 'root',
      sessionId: 'session',
      input: 'fixture',
      backend: 'codex',
      model: '',
      mode: 'plan',
      state: 'succeeded',
      maxCost: 1,
      maxSteps: 2,
      createdAt: now,
      updatedAt: now,
    })
    await store.call({ op: 'run.put', requestId: 'root', digest: 'root', value: root })
    await store.call({
      op: 'run.put',
      requestId: 'child',
      digest: 'child',
      value: { ...root, id: 'child', parentId: 'root' },
    })
    const ref = await artifacts.put('shared root evidence', 'text/plain', { owner: root.id })
    await store.call({
      op: 'document.put',
      namespace: 'workflows',
      id: 'workflow',
      value: { parentRunId: 'child', state: 'paused' },
    })
    expect((await artifacts.collect(Date.now() + 31 * 86400000)).deleted).toBe(0)
    await store.call({
      op: 'document.put',
      namespace: 'workflows',
      id: 'workflow',
      value: { parentRunId: 'child', state: 'succeeded' },
    })
    expect((await artifacts.collect(Date.now() + 31 * 86400000)).deleted).toBe(1)
    await expect(artifacts.read(ref)).rejects.toThrow('unavailable')
  } finally {
    await store.close()
  }
})
