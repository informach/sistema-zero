/** Internal v2 persistence. Public writer activation still belongs to the rollout gate. */
import type { UseStore } from 'idb-keyval'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { isMoldaAssetId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaSceneDocument } from '../scene/document'
import { number, requireScene, SceneValidationError } from '../scene/validation'
import { readRecords } from './readRecords'
import { readSceneBlobStorage } from './sceneBlobStorage'
import { mutateSceneBlobStorage } from './sceneBlobWrite'
import { readSceneIndexRevision } from './sceneIndexRevision'
import { readSceneSummary, type SceneStoredSummary } from './sceneMetadata'
import { inspectInlineSceneRecords, type SceneStoredRead } from './sceneRecordInspection'
import { type SceneStorageChange, subscribeSceneStorageChanges } from './sceneStorageChannel'
import { SCENE_RECOVERY_KEY_PREFIX, SCENE_SUMMARY_KEY_PREFIX } from './storageKeys'

export type { SceneWriteResult } from './sceneBlobWrite'
export type { SceneStoredRead } from './sceneRecordInspection'

function assetId(id: string) {
  requireScene(isMoldaAssetId(id), 'id', 'Identificador de criação inválido.')
}

/** Every mutation compares storage revision and writes in one transaction. No unguarded save. */
export function createScenePersistence(
  withStore: UseStore,
  maxBytes = MOLDA_LIMITS.maxGalleryBytes,
) {
  number(maxBytes, 'maxBytes', 1, Number.MAX_SAFE_INTEGER, true)
  const read = async (id: string, signal?: AbortSignal): Promise<SceneStoredRead> => {
    signal?.throwIfAborted()
    assetId(id)
    const result = await readSceneBlobStorage(withStore, id, signal)
    signal?.throwIfAborted()
    return result.status === 'inline' ? inspectInlineSceneRecords(result.records, id) : result
  }
  const mutate = (
    id: string,
    expectedRevision: number | null,
    action: 'save' | 'restore' | 'delete',
    input?: MoldaSceneDocument,
  ) => mutateSceneBlobStorage(withStore, maxBytes, id, expectedRevision, action, input)

  return {
    read,
    readIndexRevision: (id: string) => readSceneIndexRevision(withStore, id),
    subscribe: (listener: (change: SceneStorageChange) => void, signal?: AbortSignal) =>
      subscribeSceneStorageChanges(withStore, listener, signal),
    save: (document: MoldaSceneDocument, expectedRevision: number | null) =>
      mutate(document.id, expectedRevision, 'save', document),
    restore: (document: MoldaSceneDocument, deletedRevision: number) =>
      mutate(document.id, deletedRevision, 'restore', document),
    remove: (id: string, expectedRevision: number) => mutate(id, expectedRevision, 'delete'),
    loadRecovery: async (id: string): Promise<unknown> => {
      assetId(id)
      const key = `${SCENE_RECOVERY_KEY_PREFIX}${id}`
      return (await readRecords(withStore, [key])).get(key)
    },
    listSummaries: async (): Promise<{
      summaries: SceneStoredSummary[]
      issues: Array<{ id: string; message: string }>
    }> => {
      const keys = await withStore(
        'readonly',
        (store) =>
          new Promise<IDBValidKey[]>((resolve, reject) => {
            const request = store.getAllKeys()
            store.transaction.oncomplete = () => resolve(request.result)
            store.transaction.onabort = store.transaction.onerror = () =>
              reject(store.transaction.error)
          }),
      )
      const summaryKeys = keys.filter(
        (key): key is string => typeof key === 'string' && key.startsWith(SCENE_SUMMARY_KEY_PREFIX),
      )
      const summaries: SceneStoredSummary[] = []
      const issues: Array<{ id: string; message: string }> = []
      for (const [key, raw] of await readRecords(withStore, summaryKeys)) {
        const id = key.slice(SCENE_SUMMARY_KEY_PREFIX.length)
        try {
          summaries.push(readSceneSummary(raw, id))
        } catch (error) {
          if (
            !(
              error instanceof SceneValidationError || error instanceof MoldaUnsupportedVersionError
            )
          )
            throw error
          issues.push({ id, message: error.message })
        }
      }
      return { summaries, issues }
    },
  }
}
