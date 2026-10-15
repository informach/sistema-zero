import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { authorize, runSchema } from '@sistemazero/agent-core'
import { Store } from '../src/store/client'

test('children inherit a reduced capability set and share atomic root reservations without double charging', async () => {
  const store = new Store(join(await mkdtemp(join(tmpdir(), 'zero-team-budget-')), 'state.sqlite'))
  const now = new Date().toISOString()
  await store.call({
    op: 'session.put',
    value: {
      id: 'session',
      workspace: 'fixture',
      title: 'fixture',
      createdAt: now,
      archived: false,
    },
  })
  const root = runSchema.parse({
    id: 'root',
    sessionId: 'session',
    input: 'fixture',
    mode: 'build',
    backend: 'openrouter',
    model: '',
    maxCost: 1,
    maxSteps: 10,
    state: 'running',
    createdAt: now,
    updatedAt: now,
    allowedTools: ['file_read'],
  })
  const put = async (id: string, parentId?: string) =>
    runSchema.parse(
      await store.call({
        op: 'run.put',
        requestId: id,
        digest: id,
        value: {
          ...root,
          id,
          parentId,
          allowedTools: parentId ? ['file_read', 'process_run'] : root.allowedTools,
          maxCost: parentId ? 20 : 1,
        },
      }),
    )
  try {
    await put('root')
    const [a, b] = await Promise.all([put('a', 'root'), put('b', 'root')])
    expect(a.allowedTools).toEqual(['file_read'])
    expect(a.maxCost).toBe(1)
    expect(a.rootId).toBe('root')
    expect(
      authorize(a, { name: 'process_run', description: '', effect: 'process', input: {} }),
    ).toBe('deny')
    const results = await Promise.allSettled(
      [a, b].map((run) =>
        store.call({
          op: 'budget.reserve',
          runId: run.id,
          id: `${run.id}:step`,
          amount: 0.6,
          limit: 20,
        }),
      ),
    )
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const owner = results[0]?.status === 'fulfilled' ? a : b
    await store.call({
      op: 'budget.reserve',
      runId: owner.id,
      id: `${owner.id}:step`,
      amount: 0.6,
      limit: 20,
    })
    await store.call({
      op: 'budget.reserve',
      runId: 'root',
      id: 'root:step',
      amount: 0.3,
      limit: 20,
    })
    const grandchild = await put('grandchild', 'a')
    expect(grandchild.depth).toBe(2)
    await expect(put('too-deep', grandchild.id)).rejects.toThrow('limit')
    await put('four', 'root')
    await put('five', 'root')
    await put('six', 'root')
    await expect(put('seven', 'root')).rejects.toThrow('limit')
  } finally {
    await store.close()
  }
})

test('read projections do not emit change loops and guarded handoffs refuse revoked generations', async () => {
  const store = new Store(join(await mkdtemp(join(tmpdir(), 'zero-team-guard-')), 'state.sqlite'))
  let changes = 0
  store.on('changed', () => changes++)
  try {
    await store.call({
      op: 'document.put',
      namespace: 'teams',
      id: 'team',
      value: { generation: 2, state: 'running' },
    })
    const baseline = changes
    await store.call({ op: 'document.page', namespace: 'teams', after: '', limit: 50 })
    await store.call({ op: 'event.last', runId: 'run', type: 'assistant.final' })
    expect(changes).toBe(baseline)
    await expect(
      store.call({
        op: 'document.guarded',
        guards: [{ namespace: 'teams', id: 'team', field: 'generation', equals: 1 }],
        documents: [{ namespace: 'team-handoffs', id: 'late', value: { approved: true } }],
      }),
    ).rejects.toThrow('changed')
    expect(
      await store.call({ op: 'document.get', namespace: 'team-handoffs', id: 'late' }),
    ).toBeNull()
  } finally {
    await store.close()
  }
  await expect(store.call({ op: 'document.get', namespace: 'teams', id: 'team' })).rejects.toThrow(
    'closed',
  )
})
