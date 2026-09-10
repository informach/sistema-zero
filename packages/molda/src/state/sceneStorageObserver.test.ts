import { expect, test } from 'bun:test'
import { waitFor } from '@testing-library/react'
import { COPY } from '../core/copy'
import { renameSceneNode } from '../scene/commands'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { createSceneEditorStore } from './sceneEditorStore'
import type { SceneIndexRevision } from './sceneIndexRevision'
import { createScenePersistence } from './scenePersistence'
import {
  type SceneStorageChange,
  type SceneStorageSubscription,
  sceneStorageChannelName,
} from './sceneStorageChannel'
import { createSceneStorageObserver } from './sceneStorageObserver'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

test('two real editor stores observe writes without adopting external tokens, documents, history or session content', async () => {
  const name = 'scene-editors'
  const db = await nativeDatabase({ name })
  const p = createScenePersistence(db.store)
  const source = migrateLegacyModel(makeModel()).document
  await p.save(source, null)
  const a = createSceneEditorStore(source, 1, p, { autosaveMs: 60_000 })
  const b = createSceneEditorStore(source, 1, createScenePersistence(db.store), {
    autosaveMs: 60_000,
  })
  const offA = a.storage.subscribe(() => {}),
    offB = b.storage.subscribe(() => {})
  const wire = new BroadcastChannel(sceneStorageChannelName(name, 'assets'))
  try {
    await waitFor(() =>
      expect([
        a.storage.getSnapshot().notifications,
        b.storage.getSnapshot().notifications,
      ]).toEqual(['available', 'available']),
    )
    await Promise.all([a.storage.refresh(), b.storage.refresh()])
    const originalRevision = b.getState().contentRevision
    // Bogus/new/old notifications cannot authorize a write or even fabricate an index change.
    for (const revision of [Number.MAX_SAFE_INTEGER, 1, 20, 2])
      wire.postMessage({
        protocol: 1,
        type: 'scene-storage-changed',
        id: source.id,
        revision,
        status: 'deleted',
      })
    await b.storage.refresh()
    expect(b.storage.getSnapshot().issue).toBeNull()
    a.getState().commit(renameSceneNode(source, 'body', 'primeira aba'))
    await a.getState().flush()
    await waitFor(() => expect(b.storage.getSnapshot().issue).toBe('changed'))
    await a.storage.refresh()
    expect(a.storage.getSnapshot().issue).toBeNull()
    expect(b.getState().asset).toBe(source)
    expect(b.getState().savedAsset).toBe(source)
    expect(b.getState().contentRevision).toBe(originalRevision)
    expect(b.getState().canUndo).toBe(false)
    b.getState().commit(renameSceneNode(source, 'body', 'minha versão'))
    await b.getState().flush()
    expect(b.getState().saveError).toBe(COPY.scene.conflict)
    expect(b.getState().asset.nodes[0]?.name).toBe('minha versão')
    expect(b.getState().canUndo).toBe(true)
    b.getState().undo()
    await b.getState().flush()
    expect(b.getState().asset.nodes[0]?.name).toBe('corpo')
    b.getState().redo()
    await b.getState().flush()
    const local = b.getState().asset
    expect(await p.remove(source.id, 2)).toEqual({ status: 'deleted', revision: 3 })
    await waitFor(() => expect(b.storage.getSnapshot().issue).toBe('deleted'))
    expect(b.getState().asset).toBe(local)
    expect(await p.restore(a.getState().asset, 3)).toEqual({ status: 'saved', revision: 4 })
    await waitFor(() => expect(b.storage.getSnapshot().issue).toBe('changed'))
    await b.getState().flush()
    expect(b.getState().saveState).toBe('error')
    const stored = await p.read(source.id)
    if (stored.status !== 'active') throw new Error('Expected restored document')
    expect(stored.summary.revision).toBe(4)
    expect(stored.document).toEqual(a.getState().asset)
    expect(b.getState().asset).toBe(local)
  } finally {
    wire.close()
    offA()
    offB()
    a.getState().dispose()
    b.getState().dispose()
    db.close()
  }
})

test('observation coalesces invalidations, defers during local writes and rejects stale reads across revisions/remounts', async () => {
  const requests: Array<ReturnType<typeof deferred<SceneIndexRevision>>> = []
  const connections: Array<{
    listener: (event: SceneStorageChange) => void
    signal?: AbortSignal
  }> = []
  const late = deferred<SceneStorageSubscription>()
  let expected = 1,
    saving = false,
    closedLate = 0
  const observer = createSceneStorageObserver(
    'model-1',
    {
      readIndexRevision: () => {
        const request = deferred<SceneIndexRevision>()
        requests.push(request)
        return request.promise
      },
      subscribe: async (listener, signal) => {
        connections.push({ listener, signal })
        if (connections.length === 1) return late.promise
        return { available: true, unsubscribe() {} }
      },
    },
    () => expected,
    () => saving,
  )
  const event: SceneStorageChange = {
    protocol: 1,
    type: 'scene-storage-changed',
    id: 'model-1',
    revision: 999,
    status: 'indexed',
  }
  let notifications = 0
  const listener = () => {
    notifications++
  }
  const old = observer.subscribe(listener)
  const oldRead = observer.refresh()
  await waitFor(() => expect(requests).toHaveLength(1))
  old()
  expect(connections[0]?.signal?.aborted).toBe(true)
  const first = observer.subscribe(listener),
    second = observer.subscribe(listener)
  const nextRead = observer.refresh()
  late.resolve({
    available: true,
    unsubscribe() {
      closedLate++
    },
  })
  requests[0]!.resolve({ status: 'deleted', revision: 99 })
  await waitFor(() => expect(requests).toHaveLength(2))
  expect(closedLate).toBe(1)
  expect(observer.getSnapshot().issue).toBeNull()
  for (let i = 0; i < 100; i++) connections[1]!.listener(event)
  connections[0]!.listener(event)
  expect(requests).toHaveLength(2)
  requests[1]!.resolve({ status: 'indexed', revision: 1 })
  await waitFor(() => expect(requests).toHaveLength(3))
  // Our save overlaps the read; seeing our own next revision must not flash a conflict.
  saving = true
  requests[2]!.resolve({ status: 'indexed', revision: 2 })
  await Promise.all([oldRead, nextRead])
  expect(observer.getSnapshot().issue).toBeNull()
  expect(requests).toHaveLength(3)
  expected = 2
  saving = false
  const afterSave = observer.refresh()
  await waitFor(() => expect(requests).toHaveLength(4))
  requests[3]!.resolve({ status: 'indexed', revision: 2 })
  await afterSave
  first()
  first()
  expect(connections[1]?.signal?.aborted).toBe(false)
  const changed = observer.refresh()
  await waitFor(() => expect(requests).toHaveLength(5))
  requests[4]!.resolve({ status: 'indexed', revision: 3 })
  await changed
  expect(observer.getSnapshot().issue).toBe('changed')
  const captured = observer.getSnapshot()
  const count = notifications
  const finish = observer.refresh()
  await waitFor(() => expect(requests).toHaveLength(6))
  second()
  requests[5]!.resolve({ status: 'missing' })
  await finish
  expect(connections[1]?.signal?.aborted).toBe(true)
  expect(observer.getSnapshot()).toBe(captured)
  expect(notifications).toBe(count)
  await observer.refresh()
  expect(requests).toHaveLength(6)
})

test('failed/unknown index reads and unavailable channels have explicit recoverable observation states', async () => {
  let result: SceneIndexRevision = { status: 'indexed', revision: 1 }
  let fail = false
  const observer = createSceneStorageObserver(
    'model-1',
    {
      readIndexRevision: async () => {
        if (fail) throw new DOMException('Closed', 'InvalidStateError')
        return result
      },
      subscribe: async () => ({ available: false, unsubscribe() {} }),
    },
    () => 1,
    () => false,
  )
  const off = observer.subscribe(() => {})
  try {
    await observer.refresh()
    expect(observer.getSnapshot()).toEqual({ issue: null, notifications: 'unavailable' })
    for (const status of ['missing', 'invalid', 'unsupported'] as const) {
      result = { status }
      await observer.refresh()
      expect(observer.getSnapshot().issue).toBe('unreadable')
    }
    fail = true
    await observer.refresh()
    expect(observer.getSnapshot().issue).toBe('unreadable')
    fail = false
    result = { status: 'indexed', revision: 1 }
    await observer.refresh()
    expect(observer.getSnapshot().issue).toBeNull()
  } finally {
    off()
  }
})

test('a completed local write invalidates an older index read even after the saving flag clears', async () => {
  const stale = deferred<SceneIndexRevision>()
  let expected = 1,
    reads = 0
  const issues: Array<string | null> = []
  const observer = createSceneStorageObserver(
    'model-1',
    {
      // Failed connection is distinct from failed disk reads; manual checking still works.
      subscribe: async () => {
        throw new DOMException('Unavailable', 'InvalidStateError')
      },
      readIndexRevision: async () => {
        reads++
        return reads === 1 ? stale.promise : { status: 'indexed', revision: 2 }
      },
    },
    () => expected,
    () => false,
  )
  const off = observer.subscribe(() => issues.push(observer.getSnapshot().issue))
  try {
    const done = observer.refresh()
    await waitFor(() => expect(reads).toBe(1))
    expected = 2
    stale.resolve({ status: 'indexed', revision: 1 })
    await done
    expect(reads).toBe(2)
    expect(observer.getSnapshot()).toEqual({ issue: null, notifications: 'unavailable' })
    expect(issues.every((issue) => issue === null)).toBe(true)
  } finally {
    off()
  }
})
