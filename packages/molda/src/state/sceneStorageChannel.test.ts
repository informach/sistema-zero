import { expect, test } from 'bun:test'
import { waitFor } from '@testing-library/react'
import type { UseStore } from 'idb-keyval'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { promoteLegacyScene } from './promoteScene'
import { createScenePersistence } from './scenePersistence'
import { type SceneStorageChange, sceneStorageChannelName } from './sceneStorageChannel'
import { DOCUMENT_KEY_PREFIX, SCENE_SUMMARY_KEY_PREFIX } from './storageKeys'

const source = () => migrateLegacyModel(makeModel()).document

test('real channels observe committed create/save/delete/restore/promotion, never CAS conflicts or aborted writes', async () => {
  const db = await nativeDatabase({ name: 'scene-notifications' })
  const p = createScenePersistence(db.store)
  const events: SceneStorageChange[] = []
  const observed: Array<Promise<unknown>> = []
  const sub = await p.subscribe((change) => {
    events.push(change)
    observed.push(p.readIndexRevision(change.id))
  })
  try {
    expect(sub.available).toBe(true)
    const document = source()
    expect(await p.save(document, null)).toEqual({ status: 'saved', revision: 1 })
    await waitFor(() => expect(events).toHaveLength(1))
    expect(await observed[0]).toEqual({ status: 'indexed', revision: 1 })
    const other = createScenePersistence(db.store)
    const competing = await Promise.all([p.save(document, 1), other.save(document, 1)])
    expect(competing.filter((result) => result.status === 'saved')).toEqual([
      { status: 'saved', revision: 2 },
    ])
    expect(competing.filter((result) => result.status === 'conflict')).toEqual([
      { status: 'conflict' },
    ])
    await waitFor(() => expect(events).toHaveLength(2))
    expect(await observed[1]).toEqual({ status: 'indexed', revision: 2 })
    expect(await p.remove(document.id, 2)).toEqual({ status: 'deleted', revision: 3 })
    await waitFor(() => expect(events).toHaveLength(3))
    expect(await observed[2]).toEqual({ status: 'deleted', revision: 3 })
    expect(await p.save(document, 3)).toEqual({ status: 'conflict' })
    expect(await p.restore(document, 3)).toEqual({ status: 'saved', revision: 4 })
    await waitFor(() => expect(events).toHaveLength(4))
    expect(await observed[3]).toEqual({ status: 'indexed', revision: 4 })
    await expect(createScenePersistence(db.store, 1).save(document, 4)).rejects.toThrow()
    const aborting: UseStore = (mode, callback) =>
      db.store(mode, (store) =>
        callback(
          new Proxy(store, {
            get(target, key) {
              if (key === 'put')
                return (...args: Parameters<IDBObjectStore['put']>) => {
                  if (args[1] === `${SCENE_SUMMARY_KEY_PREFIX}${document.id}`)
                    throw new DOMException('Disk full', 'QuotaExceededError')
                  return target.put(...args)
                }
              const value = Reflect.get(target, key, target)
              return typeof value === 'function' ? value.bind(target) : value
            },
          }),
        ),
      )
    await expect(createScenePersistence(aborting).save(document, 4)).rejects.toThrow('Disk full')
    expect(await p.readIndexRevision(document.id)).toEqual({ status: 'indexed', revision: 4 })
    const legacy = makeModel({ id: 'legacy' })
    await db.seed(`${DOCUMENT_KEY_PREFIX}${legacy.id}`, legacy)
    await promoteLegacyScene(db.store, legacy.id, legacy.updatedAt + 1)
    expect((await promoteLegacyScene(db.store, legacy.id, legacy.updatedAt)).status).toBe(
      'promoted',
    )
    await waitFor(() => expect(events).toHaveLength(5))
    expect(await observed[4]).toEqual({ status: 'indexed', revision: 1 })
    expect((await promoteLegacyScene(db.store, legacy.id, legacy.updatedAt)).status).toBe(
      'already-migrated',
    )
    // A final successful write is the channel barrier for earlier negative cases.
    await p.save(document, 4)
    await waitFor(() => expect(events.at(-1)?.revision).toBe(5))
    expect(events).toEqual([
      ...[1, 2, 3, 4].map(
        (revision): SceneStorageChange => ({
          protocol: 1,
          type: 'scene-storage-changed',
          id: document.id,
          revision,
          status: revision === 3 ? 'deleted' : 'indexed',
        }),
      ),
      { protocol: 1, type: 'scene-storage-changed', id: 'legacy', revision: 1, status: 'indexed' },
      {
        protocol: 1,
        type: 'scene-storage-changed',
        id: document.id,
        revision: 5,
        status: 'indexed',
      },
    ])
    await Promise.all(observed)
  } finally {
    sub.unsubscribe()
    db.close()
  }
})

test('channel protocol is closed and scope includes exact database AND object store; unsubscribe/abort close ownership', async () => {
  const name = 'scene-wire'
  const a = await nativeDatabase({ name, storeName: 'assets' })
  const b = await nativeDatabase({ name, storeName: 'other' })
  const c = await nativeDatabase({ name: 'other', storeName: 'assets' })
  const pa = createScenePersistence(a.store),
    pb = createScenePersistence(b.store),
    pc = createScenePersistence(c.store)
  const received: SceneStorageChange[] = [],
    elsewhere: SceneStorageChange[] = []
  const controller = new AbortController()
  const sa = await pa.subscribe((event) => received.push(event), controller.signal)
  const sb = await pb.subscribe((event) => elsewhere.push(event))
  const sc = await pc.subscribe((event) => elsewhere.push(event))
  const sender = new BroadcastChannel(sceneStorageChannelName(name, 'assets'))
  const valid: SceneStorageChange = {
    protocol: 1,
    type: 'scene-storage-changed',
    id: 'model-1',
    revision: 1,
    status: 'indexed',
  }
  try {
    expect(sceneStorageChannelName('a:b', 'c')).not.toBe(sceneStorageChannelName('a', 'b:c'))
    for (const raw of [
      null,
      [],
      true,
      'text',
      {},
      { ...valid, protocol: 2 },
      { ...valid, type: 'changed' },
      { ...valid, id: '../x' },
      { ...valid, id: 'a'.repeat(65) },
      ...[0, -1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'].map((revision) => ({
        ...valid,
        revision,
      })),
      { ...valid, status: 'saved' },
      { ...valid, document: source() },
    ])
      sender.postMessage(raw)
    sender.postMessage(valid)
    await waitFor(() => expect(received).toHaveLength(1))
    expect(received[0]).toEqual(valid)
    expect(received[0]).not.toBe(valid)
    // Barriers on the other two scopes prove they did not receive the first message.
    await pb.save(source(), null)
    await pc.save(source(), null)
    await waitFor(() => expect(elsewhere).toHaveLength(2))
    expect(received).toHaveLength(1)
    controller.abort()
    sa.unsubscribe()
    sa.unsubscribe()
    const barrier: SceneStorageChange[] = []
    const last = await pa.subscribe((event) => barrier.push(event))
    try {
      sender.postMessage(valid)
      await waitFor(() => expect(barrier).toHaveLength(1))
      expect(received).toHaveLength(1)
    } finally {
      last.unsubscribe()
    }
    const aborted = new AbortController()
    aborted.abort()
    await expect(pa.subscribe(() => {}, aborted.signal)).rejects.toThrow()
    const opening = new AbortController()
    const pending = pa.subscribe(() => {}, opening.signal)
    opening.abort()
    await expect(pending).rejects.toThrow()
  } finally {
    sender.close()
    sa.unsubscribe()
    sb.unsubscribe()
    sc.unsubscribe()
    a.close()
    b.close()
    c.close()
  }
})

test('unavailable or blocked notification transport does not turn a successful commit into an error', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
  if (!original) throw new Error('Expected native BroadcastChannel for this test')
  const db = await nativeDatabase({ name: 'scene-no-channel' })
  try {
    for (const unavailable of [
      undefined,
      class BlockedChannel {
        constructor() {
          throw new DOMException('Blocked', 'SecurityError')
        }
      },
    ]) {
      Object.defineProperty(globalThis, 'BroadcastChannel', {
        configurable: true,
        value: unavailable,
      })
      const p = createScenePersistence(db.store)
      const sub = await p.subscribe(() => {
        throw new Error('No channel')
      })
      expect(sub.available).toBe(false)
      sub.unsubscribe()
      const document = { ...source(), id: unavailable ? 'blocked' : 'absent' }
      expect(await p.save(document, null)).toEqual({ status: 'saved', revision: 1 })
      expect(await p.save(document, null)).toEqual({ status: 'conflict' })
    }
  } finally {
    Object.defineProperty(globalThis, 'BroadcastChannel', original)
    db.close()
  }
})

test('a postMessage transport failure still closes the sender and retains the committed revision', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'BroadcastChannel')
  if (!original) throw new Error('Expected native BroadcastChannel for this test')
  const db = await nativeDatabase({ name: 'scene-post-failure' })
  let closed = 0
  class FailingSender {
    postMessage() {
      throw new DOMException('Unavailable', 'InvalidStateError')
    }
    close() {
      closed++
    }
  }
  try {
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      value: FailingSender,
    })
    const p = createScenePersistence(db.store)
    expect(await p.save(source(), null)).toEqual({ status: 'saved', revision: 1 })
    expect(closed).toBe(1)
    expect(await p.readIndexRevision(source().id)).toEqual({ status: 'indexed', revision: 1 })
  } finally {
    Object.defineProperty(globalThis, 'BroadcastChannel', original)
    db.close()
  }
})
