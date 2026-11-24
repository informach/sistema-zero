import { expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import type { UseStore } from 'idb-keyval'
import {
  conditionalGeneration,
  conditionalWrite,
  interruptConditionalTransactions,
  writeInOneTransaction,
} from './idbTransaction'

test('a warm exit write is queued before an independent synchronous reader', async () => {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(`exit-order-${crypto.randomUUID()}`, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('project-documents')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  // Same asynchronous boundary as idb-keyval's memoized getDB().then(callback).
  const store: UseStore = (mode, callback) =>
    Promise.resolve(database).then((ready) =>
      callback(ready.transaction('project-documents', mode).objectStore('project-documents')),
    )
  try {
    await writeInOneTransaction(store, { puts: [['project', 'previous']] })
    const exiting = writeInOneTransaction(store, { puts: [['project', 'latest draft']] })
    const probe = database
      .transaction('project-documents', 'readonly')
      .objectStore('project-documents')
      .get('project')
    const observed = new Promise<unknown>((resolve, reject) => {
      probe.onsuccess = () => resolve(probe.result)
      probe.onerror = () => reject(probe.error)
    })
    await exiting
    expect(await observed).toBe('latest draft')
  } finally {
    database.close()
  }
})

test('exit handoff does not assume a CAS can be aborted after commit was requested', async () => {
  const identity = `committing-exit-${crypto.randomUUID()}`
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = new IDBFactory().open(identity, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const store: UseStore = (mode, callback) =>
    Promise.resolve(database).then((ready) =>
      callback(ready.transaction('kv', mode).objectStore('kv')),
    )
  try {
    await writeInOneTransaction(store, { puts: [['project', 'previous']] })
    // No reads: decide and native commit() run synchronously on the warm connection.
    const old = conditionalWrite(store, identity, conditionalGeneration(identity), [], () => ({
      write: { puts: [['project', 'in-flight']] },
      result: 'old save',
    }))
    const outcome = old.then(
      () => 'committed',
      (error: unknown) => (error instanceof Error ? error.name : 'unknown'),
    )
    interruptConditionalTransactions(identity)
    await writeInOneTransaction(store, { puts: [['exit-recovery', 'latest draft']] })
    expect(await outcome).toBe('committed')
  } finally {
    database.close()
  }
})
