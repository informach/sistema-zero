import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { createStore, type UseStore } from 'idb-keyval'
import { createEmptyProject } from '../core/project'
import { buildProProject } from '../core/proProject'
import { readValue, writeInOneTransaction } from './idbTransaction'
import { deleteProject, loadProjectById, persistProject } from './persistence'
import { drainProBuilderDeletions, proBuilderDeletionKey } from './proBuilderDeletion'
import { captureProjectStorageScope, setProjectStorageNamespace } from './projectStorageRuntime'

const previous = globalThis.indexedDB
const previousCreateStore = createStore
const connections = new Set<IDBDatabase>()
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  // The full suite shares Bun's module mock registry. Select an actual IDB
  // transaction store explicitly instead of inheriting another file's Map mock.
  mock.module('idb-keyval', () => ({
    createStore: (name: string, storeName: string): UseStore => {
      const opening = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name, 1)
        request.onupgradeneeded = () => request.result.createObjectStore(storeName)
        request.onsuccess = () => {
          connections.add(request.result)
          resolve(request.result)
        }
        request.onerror = () => reject(request.error)
      })
      return async (mode, callback) =>
        callback((await opening).transaction(storeName, mode).objectStore(storeName))
    },
  }))
  setProjectStorageNamespace(`builder-delete-${crypto.randomUUID()}`)
})
afterEach(() => {
  setProjectStorageNamespace('')
  mock.module('idb-keyval', () => ({ createStore: previousCreateStore }))
  for (const db of connections) db.close()
  connections.clear()
  globalThis.indexedDB = previous
})

test('real local deletion queues Pro cleanup; classic and provisional import cleanup do not', async () => {
  const scope = captureProjectStorageScope()
  const makePro = (id: string) =>
    buildProProject(
      id,
      id,
      { 'main.ts': { kind: 'file', content: 'export {}' } },
      'dev',
      'vanilla-vite',
    )
  for (const project of [
    makePro('game'),
    makePro('provisional'),
    createEmptyProject('classic', 'Classic'),
  ])
    await persistProject(project, {}, scope)
  await deleteProject('game', scope)
  await deleteProject('provisional', scope, { notifyCloudMirror: false })
  await deleteProject('classic', scope)
  expect(await loadProjectById('game', scope)).toBeNull()
  expect(await readValue(scope.store, proBuilderDeletionKey('game'))).toMatchObject({
    version: 1,
    projectId: 'game',
  })
  expect(await readValue(scope.store, proBuilderDeletionKey('provisional'))).toBeUndefined()
  expect(await readValue(scope.store, proBuilderDeletionKey('classic'))).toBeUndefined()
})

test('offline deletion survives retry; only an acknowledged remote removal clears its record', async () => {
  const scope = captureProjectStorageScope()
  const entry = { version: 1, projectId: 'game', createdAt: Date.now() }
  await writeInOneTransaction(scope.store, { puts: [[proBuilderDeletionKey('game'), entry]] })
  const controller = new AbortController()
  await expect(
    drainProBuilderDeletions(
      scope,
      async () => {
        throw new Error('offline')
      },
      controller.signal,
    ),
  ).rejects.toThrow('exclusões estão pendentes')
  expect(await readValue(scope.store, proBuilderDeletionKey('game'))).toEqual(entry)
  const requests: string[] = []
  expect(
    await drainProBuilderDeletions(
      scope,
      async (id) => {
        requests.push(id)
      },
      controller.signal,
    ),
  ).toBe(1)
  expect(requests).toEqual(['game'])
  expect(await readValue(scope.store, proBuilderDeletionKey('game'))).toBeUndefined()
})

test('profile A → B → A invalidates both dispatch and a late acknowledgment', async () => {
  const scope = captureProjectStorageScope()
  const key = proBuilderDeletionKey('game')
  await writeInOneTransaction(scope.store, {
    puts: [[key, { version: 1, projectId: 'game', createdAt: Date.now() }]],
  })
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let calls = 0
  const pending = drainProBuilderDeletions(
    scope,
    async () => {
      calls++
      entered.resolve()
      await release.promise
    },
    new AbortController().signal,
  )
  await Promise.race([
    entered.promise,
    pending.then(() => {
      throw new Error('The queued deletion was not dispatched.')
    }),
  ])
  setProjectStorageNamespace('other')
  setProjectStorageNamespace(scope.namespace)
  release.resolve()
  expect(await pending).toBe(0)
  expect(await readValue(scope.store, key)).toBeDefined()
  expect(
    await drainProBuilderDeletions(
      scope,
      async () => {
        calls++
      },
      new AbortController().signal,
    ),
  ).toBe(0)
  expect(calls).toBe(1)
})

test('failed jobs cannot starve later pages of the durable deletion queue', async () => {
  const scope = captureProjectStorageScope()
  const ids = Array.from({ length: 24 }, (_, n) => `game-${String(n).padStart(2, '0')}`)
  await writeInOneTransaction(scope.store, {
    puts: ids.map((projectId) => [
      proBuilderDeletionKey(projectId),
      { version: 1, projectId, createdAt: Date.now() },
    ]),
  })
  const removed: string[] = []
  const remove = async (id: string) => {
    if (ids.slice(0, 20).includes(id)) throw new Error('Retry required')
    removed.push(id)
  }
  const signal = new AbortController().signal
  await expect(drainProBuilderDeletions(scope, remove, signal)).rejects.toThrow('exclusões')
  expect(await drainProBuilderDeletions(scope, remove, signal)).toBe(4)
  expect(removed).toEqual(ids.slice(20))
  for (const id of ids.slice(0, 20))
    expect(await readValue(scope.store, proBuilderDeletionKey(id))).toBeDefined()
  expect(await drainProBuilderDeletions(scope, async () => {}, signal)).toBe(20)
})

test('a single rejection does not abort independent deletions in the same batch', async () => {
  const scope = captureProjectStorageScope()
  await writeInOneTransaction(scope.store, {
    puts: ['a', 'b'].map((projectId) => [
      proBuilderDeletionKey(projectId),
      { version: 1, projectId, createdAt: Date.now() },
    ]),
  })
  await expect(
    drainProBuilderDeletions(
      scope,
      async (id) => {
        if (id === 'a') throw new Error('Retry required')
      },
      new AbortController().signal,
    ),
  ).rejects.toThrow('exclusões')
  expect(await readValue(scope.store, proBuilderDeletionKey('a'))).toBeDefined()
  expect(await readValue(scope.store, proBuilderDeletionKey('b'))).toBeUndefined()
})
