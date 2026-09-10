import type { UseStore } from 'idb-keyval'
import { COPY } from '../core/copy'
import { readMoldaDocumentForId } from '../core/documentReader'
import { createModelAsset } from '../core/model'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { promoteLegacyScene } from './promoteScene'
import { readRecords } from './readRecords'
import { createSceneEditorStore } from './sceneEditorStore'
import { createScenePersistence } from './scenePersistence'
import { documentKeys, storedDocumentKey } from './storageKeys'

/** Explicit internal host entry: never fall back from a broken/future v2 document to legacy. */
export async function openSceneWorkshop(
  store: UseStore,
  id: string,
  options: { createIfMissing?: boolean; signal?: AbortSignal } = {},
) {
  const persistence = createScenePersistence(store)
  options.signal?.throwIfAborted()
  let read = await persistence.read(id, options.signal)
  options.signal?.throwIfAborted()
  if (read.status === 'missing') {
    const records = await readRecords(store, documentKeys(id))
    options.signal?.throwIfAborted()
    const key = storedDocumentKey(records, id)
    if (key !== null) {
      const source = readMoldaDocumentForId(records.get(key), id)
      if (source.status !== 'valid' || source.asset.kind !== 'model')
        throw new Error(COPY.scene.openError)
      await promoteLegacyScene(store, id, source.asset.updatedAt)
    } else if (options.createIfMissing && records.size === 0) {
      const legacy = { ...createModelAsset({ name: COPY.scene.demoName }), id }
      await persistence.save(migrateLegacyModel(legacy).document, null)
    } else throw new Error(COPY.scene.openError)
    options.signal?.throwIfAborted()
    read = await persistence.read(id, options.signal)
  }
  options.signal?.throwIfAborted()
  if (read.status !== 'active') throw new Error(COPY.scene.openError)
  return createSceneEditorStore(read.document, read.summary.revision, persistence)
}
