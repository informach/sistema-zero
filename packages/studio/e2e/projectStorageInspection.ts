import type { Page } from '@playwright/test'
import { decodeProjectStorageValue } from '../src/state/projectStorageTransport'

/** Read-only native observation: never opens an adapter or promotes a pending edit. */
async function nativeRecords(page: Page, key: string | null): Promise<Array<[string, unknown]>> {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sistema-zero-studio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<Array<[string, unknown]>>((resolve, reject) => {
        const tx = db.transaction('kv', 'readonly')
        const store = tx.objectStore('kv')
        if (key !== null) {
          const request = store.get(key)
          tx.oncomplete = () => resolve([[key, request.result]])
        } else {
          const keys = store.getAllKeys()
          const values = store.getAll()
          tx.oncomplete = () =>
            resolve(keys.result.map((key, index) => [String(key), values.result[index]]))
        }
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }, key)
}

export async function readProjectStorageRecords(page: Page): Promise<Record<string, unknown>> {
  return Object.fromEntries(
    (await nativeRecords(page, null)).map(([key, value]) => [
      key,
      decodeProjectStorageValue(key, value),
    ]),
  )
}

export async function readProjectStorageRecord(page: Page, key: string): Promise<unknown> {
  const value = (await nativeRecords(page, key))[0]?.[1]
  return decodeProjectStorageValue(key, value)
}
