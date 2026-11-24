/** A private native-9 host owns the database, store and profile-scoped document key. */
export interface AutomapRepository {
  read(): Promise<string | null>
  compareAndSet(expected: string | null, next: string): Promise<boolean>
}
export function automapRepository(
  db: IDBDatabase,
  storeName: string,
  key: IDBValidKey,
): AutomapRepository {
  return {
    read: () =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly'),
          request = tx.objectStore(storeName).get(key)
        tx.oncomplete = () => {
          if (request.result !== undefined && typeof request.result !== 'string')
            reject(Error('O documento preservado não é texto.'))
          else resolve(request.result ?? null)
        }
        tx.onabort = () => reject(tx.error ?? Error('A leitura foi interrompida.'))
      }),
    compareAndSet: (expected, next) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite'),
          store = tx.objectStore(storeName),
          request = store.get(key)
        let written = false
        request.onsuccess = () => {
          if (expected === null ? request.result !== undefined : request.result !== expected) return
          const put = store.put(next, key)
          put.onsuccess = () => {
            written = true
          }
        }
        tx.oncomplete = () => resolve(written)
        tx.onabort = () => reject(tx.error ?? Error('A gravação foi interrompida.'))
      }),
  }
}
