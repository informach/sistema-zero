import type { DraftRecovery } from './lesson-draft-session'

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sz-lesson-authoring', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('recovery')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function readDraftRecovery<T extends { kind: string }>(
  key: string,
): Promise<DraftRecovery<T> | null> {
  const db = await openStore()
  try {
    return await new Promise((resolve, reject) => {
      const request: IDBRequest<DraftRecovery<T> | undefined> = db
        .transaction('recovery')
        .objectStore('recovery')
        .get(key)
      request.onsuccess = () => resolve(request.result?.version === 1 ? request.result : null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}
export async function writeDraftRecovery<T extends { kind: string }>(
  key: string,
  value: DraftRecovery<T> | null,
) {
  const db = await openStore()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('recovery', 'readwrite')
      const store = tx.objectStore('recovery')
      if (value) store.put(value, key)
      else store.delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('Armazenamento local interrompido.'))
    })
  } finally {
    db.close()
  }
}
