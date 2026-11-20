import type { UseStore } from 'idb-keyval'
import {
  decodeLocalChunkDocument,
  localChunkKeys,
  planLocalStorageWrites,
} from './localChunkStorage'

/** Null selection expands to the whole gallery, needed only for migration/recovery budgets. */
export type AssetRecordSelection = (
  records: ReadonlyMap<string, unknown>,
) => readonly string[] | null
/** IO only. No awaits inside a live IDB transaction; domain planning is synchronous. */
export function withAssetTransaction<T>(
  openStore: UseStore,
  plan: (records: Map<string, unknown>) => T,
  select?: AssetRecordSelection,
): Promise<T> {
  return openStore(
    'readwrite',
    (store) =>
      new Promise<T>((resolve, reject) => {
        const tx = store.transaction
        let result: T,
          failure: unknown,
          fullKeys: string[] | null = null
        const records = new Map<string, unknown>(),
          physical = new Map<string, unknown>(),
          visited = new Set<string>(),
          decoded = new Set<string>()
        tx.oncomplete = () => resolve(result)
        tx.onabort = tx.onerror = () =>
          reject(failure ?? tx.error ?? new Error('A gravação foi interrompida.'))
        const abort = (error: unknown) => {
          failure = error
          tx.abort()
        }
        const run = () => {
          try {
            const before = new Map(records)
            result = plan(records)
            const writes = planLocalStorageWrites(before, records, physical)
            for (const [key, value] of writes.puts) store.put(value, key)
            for (const key of writes.deletes) store.delete(key)
          } catch (error) {
            abort(error)
          }
        }
        const step = () => {
          let wanted: readonly string[] | null
          try {
            const chunks = [...records].flatMap(([key, value]) =>
              decoded.has(key) ? [] : localChunkKeys(key, value),
            )
            const missing = chunks.filter((key) => !visited.has(key))
            if (missing.length) {
              read(missing)
              return
            }
            for (const [key, value] of records)
              if (!decoded.has(key)) {
                records.set(key, decodeLocalChunkDocument(key, value, records))
                decoded.add(key)
              }
            wanted = select ? select(records) : null
          } catch (error) {
            abort(error)
            return
          }
          if (wanted === null && !fullKeys) {
            const keys = store.getAllKeys()
            keys.onsuccess = () => {
              fullKeys = keys.result.filter(
                (key): key is string =>
                  typeof key === 'string' &&
                  (key.startsWith('pinta:asset:') || key.startsWith('pinta:local:')),
              )
              step()
            }
            return
          }
          const remaining = (wanted ?? fullKeys ?? []).filter((key) => !visited.has(key))
          if (!remaining.length) {
            run()
            return
          }
          read(remaining)
        }
        const read = (keys: readonly string[]) => {
          let pending = keys.length
          for (const key of keys) {
            visited.add(key)
            const request = store.get(key)
            request.onsuccess = () => {
              records.set(key, request.result)
              physical.set(key, request.result)
              if (--pending === 0) step()
            }
          }
        }
        step()
      }),
  )
}
