import type { UseStore } from 'idb-keyval'

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
          visited = new Set<string>()
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
            for (const [key, value] of records) if (value !== before.get(key)) store.put(value, key)
            for (const key of before.keys()) if (!records.has(key)) store.delete(key)
          } catch (error) {
            abort(error)
          }
        }
        const step = () => {
          let wanted: readonly string[] | null
          try {
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
          let pending = remaining.length
          for (const key of remaining) {
            visited.add(key)
            const request = store.get(key)
            request.onsuccess = () => {
              records.set(key, request.result)
              if (--pending === 0) step()
            }
          }
        }
        step()
      }),
  )
}
