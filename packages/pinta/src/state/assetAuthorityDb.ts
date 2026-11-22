import type { UseStore } from 'idb-keyval'
import { isLocalAssetInventoryKey } from './assetAuthorityKeys'
import {
  type LocalStorageCodec,
  localDenseStorageCodec,
  planLocalStorageWrites,
} from './localChunkStorage'

/** Null selection expands to the whole gallery, needed only for migration/recovery budgets. */
export type AssetRecordSelection = (
  records: ReadonlyMap<string, unknown>,
) => readonly string[] | null
/** A null codec reads raw records without writing. Planning stays synchronous in both modes. */
export function withAssetTransaction<T>(
  openStore: UseStore,
  plan: (records: Map<string, unknown>) => T,
  select?: AssetRecordSelection,
  codec: LocalStorageCodec | null = localDenseStorageCodec,
  inspectKeys?: (keys: readonly string[]) => void,
): Promise<T> {
  return transactAssetRecords(
    openStore,
    plan,
    codec ? 'readwrite' : 'readonly',
    codec,
    select,
    inspectKeys,
  )
}

/** Physical writes are allowed only after the caller validates the pinned directory and patch. */
export function withPhysicalAssetUpdate<T>(
  openStore: UseStore,
  plan: (records: Map<string, unknown>) => T,
  select: AssetRecordSelection,
  inspectKeys: (keys: readonly string[], allKeys: readonly IDBValidKey[]) => void,
): Promise<T> {
  return transactAssetRecords(openStore, plan, 'readwrite', null, select, inspectKeys)
}

function transactAssetRecords<T>(
  openStore: UseStore,
  plan: (records: Map<string, unknown>) => T,
  mode: 'readonly' | 'readwrite',
  codec: LocalStorageCodec | null,
  select?: AssetRecordSelection,
  inspectKeys?: (keys: readonly string[], allKeys: readonly IDBValidKey[]) => void,
): Promise<T> {
  return openStore(
    mode,
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
            if (mode === 'readonly') {
              result = plan(records)
              return
            }
            const before = new Map(records)
            result = plan(records)
            const writes = planLocalStorageWrites(before, records, physical, codec)
            for (const [key, value] of writes.puts) store.put(value, key)
            for (const key of writes.deletes) store.delete(key)
          } catch (error) {
            abort(error)
          }
        }
        const step = () => {
          if (inspectKeys && fullKeys === null) {
            readInventory()
            return
          }
          let wanted: readonly string[] | null
          try {
            if (codec) {
              const chunks = [...records].flatMap(([key, value]) =>
                decoded.has(key) ? [] : codec.keys(key, value),
              )
              const missing = [...new Set(chunks)].filter((key) => !visited.has(key))
              if (missing.length) {
                read(missing)
                return
              }
              for (const [key, value] of records)
                if (!decoded.has(key)) {
                  records.set(key, codec.decode(key, value, records))
                  decoded.add(key)
                }
            }
            wanted = select ? select(records) : null
          } catch (error) {
            abort(error)
            return
          }
          if (wanted === null && !fullKeys) {
            readInventory()
            return
          }
          const remaining = (wanted ?? fullKeys ?? []).filter((key) => !visited.has(key))
          if (!remaining.length) {
            run()
            return
          }
          read(remaining)
        }
        const readInventory = () => {
          try {
            const keys = store.getAllKeys()
            keys.onsuccess = () => {
              try {
                fullKeys = keys.result.filter(isLocalAssetInventoryKey)
                inspectKeys?.(fullKeys, keys.result)
                step()
              } catch (error) {
                abort(error)
              }
            }
          } catch (error) {
            abort(error)
          }
        }
        const read = (keys: readonly string[]) => {
          let pending = keys.length
          for (const key of keys) {
            visited.add(key)
            const request = store.get(key)
            request.onsuccess = () => {
              records.set(key, request.result)
              if (codec) physical.set(key, request.result)
              if (--pending === 0) step()
            }
          }
        }
        step()
      }),
  )
}
