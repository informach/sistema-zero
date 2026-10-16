import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Store } from '../src/store/client'

test('concurrent reservations cannot overspend and unknown usage remains charged', async () => {
  const store = new Store(join(await mkdtemp(join(tmpdir(), 'zero-budget-')), 'state.sqlite'))
  try {
    const results = await Promise.allSettled(
      ['a', 'b'].map((id) =>
        store.call({ op: 'budget.reserve', runId: 'run', id, amount: 0.6, limit: 1 }),
      ),
    )
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const id = results[0]?.status === 'fulfilled' ? 'a' : 'b'
    await store.call({ op: 'budget.settle', runId: 'run', id, generationId: 'gen-partial' })
    await expect(
      store.call({ op: 'budget.reserve', runId: 'run', id: 'c', amount: 0.5, limit: 1 }),
    ).rejects.toThrow('exhausted')
    await expect(
      store.call({
        op: 'budget.settle',
        runId: 'run',
        id,
        generationId: 'another-generation',
        cost: 0.1,
      }),
    ).rejects.toThrow('identity conflict')
    await store.call({
      op: 'budget.settle',
      runId: 'run',
      id,
      cost: 0.1,
      generationId: 'gen-partial',
    })
    await store.call({ op: 'budget.reserve', runId: 'run', id: 'd', amount: 0.8, limit: 1 })
  } finally {
    await store.close()
  }
})
