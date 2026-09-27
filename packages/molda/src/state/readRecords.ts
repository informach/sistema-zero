import type { UseStore } from 'idb-keyval'

/** Calls back inside the active transaction; callers may enqueue writes atomically. */
export function collectRecords(
  store: IDBObjectStore,
  keys: readonly string[],
  onRead: (records: Map<string, unknown>) => void,
): void {
  const records = new Map<string, unknown>()
  let pending = keys.length
  if (!pending) {
    onRead(records)
    return
  }
  for (const key of keys) {
    const request = store.openCursor(key)
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) records.set(key, cursor.value)
      pending -= 1
      if (!pending) onRead(records)
    }
  }
}

/** Read exact records in one snapshot, distinguishing missing from stored undefined. */
export function readRecords(
  withStore: UseStore,
  keys: readonly string[],
): Promise<Map<string, unknown>> {
  if (keys.length === 0) return Promise.resolve(new Map())
  return withStore(
    'readonly',
    (store) =>
      new Promise<Map<string, unknown>>((resolve, reject) => {
        let records = new Map<string, unknown>()
        const transaction = store.transaction
        transaction.oncomplete = () => resolve(records)
        transaction.onabort = transaction.onerror = () =>
          reject(transaction.error ?? new Error('Falha ao ler as criações'))
        collectRecords(store, keys, (result) => {
          records = result
        })
      }),
  )
}
