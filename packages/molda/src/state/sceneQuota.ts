import type { UseStore } from 'idb-keyval'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { structuredBytes } from '../core/structuredBytes'
import { SceneValidationError } from '../scene/validation'
import { collectRecords } from './readRecords'
import { readSceneSummary, readSceneTombstone } from './sceneMetadata'
import {
  SCENE_DELETED_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX,
} from './storageKeys'

export interface SceneStorageSnapshot {
  /** Target and metadata are loaded; other valid scene documents/originals remain on disk. */
  records: Map<string, unknown>
  keys: ReadonlySet<string>
  costs: ReadonlyMap<string, number>
}

/** Captures preflight values; the writer must reread and compare dependencies in its commit. */
export function readSceneStorageSnapshot(
  store: UseStore,
  id: string,
): Promise<SceneStorageSnapshot> {
  return store(
    'readonly',
    (native) =>
      new Promise<SceneStorageSnapshot>((resolve, reject) => {
        const tx = native.transaction
        let result: SceneStorageSnapshot | undefined
        let failure: unknown
        tx.oncomplete = () => (result ? resolve(result) : reject(new Error('Leitura incompleta.')))
        tx.onabort = tx.onerror = () =>
          reject(failure ?? tx.error ?? new Error('Não foi possível ler a criação.'))
        collectSceneStorageSnapshot(
          native,
          id,
          (snapshot) => {
            result = snapshot
          },
          (error) => {
            failure = error
            tx.abort()
          },
        )
      }),
  )
}

/**
 * Per-record size ledger in isolated scene metadata. Older writers cannot change
 * these records. Legacy/orphaned/unknown records are measured from their raw value;
 * v1 tabs cannot be assumed to maintain the new ledger retroactively.
 * All reads run in the caller's live transaction, including fallback measurements.
 */
export function collectSceneStorageSnapshot(
  store: IDBObjectStore,
  targetId: string,
  onRead: (snapshot: SceneStorageSnapshot) => void,
  onError: (error: unknown) => void,
): void {
  const request = store.getAllKeys()
  request.onsuccess = () => {
    const keys = new Set(
      request.result.filter(
        (key): key is string => typeof key === 'string' && key.startsWith('molda:'),
      ),
    )
    const metadataKeys = [...keys].filter(
      (key) => key.startsWith(SCENE_SUMMARY_KEY_PREFIX) || key.startsWith(SCENE_DELETED_KEY_PREFIX),
    )
    collectRecords(store, metadataKeys, (metadata) => {
      try {
        const estimates = new Map<string, number>()
        for (const [key, raw] of metadata) {
          const active = key.startsWith(SCENE_SUMMARY_KEY_PREFIX)
          const id = key.slice(
            (active ? SCENE_SUMMARY_KEY_PREFIX : SCENE_DELETED_KEY_PREFIX).length,
          )
          try {
            const summary = active ? readSceneSummary(raw, id) : null
            const entry = summary ?? readSceneTombstone(raw, id)
            const documentKey = `${SCENE_DOCUMENT_KEY_PREFIX}${id}`
            const originalsKey = `${SCENE_RECOVERY_KEY_PREFIX}${id}`
            const oppositeKey = `${active ? SCENE_DELETED_KEY_PREFIX : SCENE_SUMMARY_KEY_PREFIX}${id}`
            if (
              keys.has(oppositeKey) ||
              keys.has(documentKey) !== active ||
              keys.has(originalsKey) !== entry.originalsBytes > 0
            )
              continue
            if (summary)
              estimates.set(
                documentKey,
                summary.storageVersion === 2 ? summary.storedBytes : summary.bytes,
              )
            if (keys.has(originalsKey)) estimates.set(originalsKey, entry.originalsBytes)
          } catch (error) {
            // An unrecognized ledger is not zero cost. Read and count its raw payload below.
            if (
              !(
                error instanceof SceneValidationError ||
                error instanceof MoldaUnsupportedVersionError
              )
            )
              throw error
          }
        }
        estimates.delete(`${SCENE_DOCUMENT_KEY_PREFIX}${targetId}`)
        const remaining = [...keys].filter((key) => !metadata.has(key) && !estimates.has(key))
        collectRecords(store, remaining, (records) => {
          try {
            for (const [key, value] of metadata) records.set(key, value)
            const costs = new Map(estimates)
            for (const [key, value] of records) costs.set(key, structuredBytes(value))
            onRead({ records, keys, costs })
          } catch (error) {
            onError(error)
          }
        })
      } catch (error) {
        onError(error)
      }
    })
  }
}
