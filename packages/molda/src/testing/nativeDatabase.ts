import { IDBFactory } from 'fake-indexeddb'
import type { UseStore } from 'idb-keyval'

/** Independent IDB, no idb-keyval mock or Web Locks. All helpers await transaction completion. */
export async function nativeDatabase(options: { name?: string; storeName?: string } = {}) {
  const factory = new IDBFactory()
  const storeName = options.storeName ?? 'assets'
  const request = factory.open(options.name ?? 'atomic-writes')
  request.onupgradeneeded = () => request.result.createObjectStore(storeName)
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const store: UseStore = async (mode, callback) =>
    callback(db.transaction(storeName, mode).objectStore(storeName))
  const seed = (key: string, value: unknown) =>
    store(
      'readwrite',
      (s) =>
        new Promise<void>((resolve, reject) => {
          s.transaction.oncomplete = () => resolve()
          s.transaction.onabort = () => reject(s.transaction.error)
          s.put(value, key)
        }),
    )
  const read = (key: string) =>
    store(
      'readonly',
      (s) =>
        new Promise<unknown>((resolve, reject) => {
          const req = s.get(key)
          s.transaction.oncomplete = () => resolve(req.result)
          s.transaction.onabort = () => reject(s.transaction.error)
        }),
    )
  const dump = () =>
    store(
      'readonly',
      (s) =>
        new Promise<Map<IDBValidKey, unknown>>((resolve, reject) => {
          const keys = s.getAllKeys()
          const values = s.getAll()
          s.transaction.oncomplete = () =>
            resolve(new Map(keys.result.map((key, i) => [key, values.result[i]])))
          s.transaction.onabort = () => reject(s.transaction.error)
        }),
    )
  return { store, seed, read, dump, close: () => db.close() }
}
