import type { UseStore } from 'idb-keyval'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { isMoldaAssetId } from '../core/id'
import { requireScene, SceneValidationError } from '../scene/validation'
import { readRecords } from './readRecords'
import { readSceneSummary, readSceneTombstone } from './sceneMetadata'
import { SCENE_DELETED_KEY_PREFIX, SCENE_SUMMARY_KEY_PREFIX } from './storageKeys'

export type SceneIndexRevision =
  | { status: 'indexed' | 'deleted'; revision: number }
  | { status: 'missing' | 'invalid' | 'unsupported' }

/** Only an index observation: does NOT validate the document or grant a CAS token. */
export async function readSceneIndexRevision(
  store: UseStore,
  id: string,
): Promise<SceneIndexRevision> {
  requireScene(isMoldaAssetId(id), 'id', 'Identificador de criação inválido.')
  const summary = `${SCENE_SUMMARY_KEY_PREFIX}${id}`
  const deleted = `${SCENE_DELETED_KEY_PREFIX}${id}`
  const records = await readRecords(store, [summary, deleted])
  if (records.has(summary) && records.has(deleted)) return { status: 'invalid' }
  try {
    if (records.has(deleted))
      return { status: 'deleted', revision: readSceneTombstone(records.get(deleted), id).revision }
    if (records.has(summary))
      return { status: 'indexed', revision: readSceneSummary(records.get(summary), id).revision }
    return { status: 'missing' }
  } catch (error) {
    if (error instanceof MoldaUnsupportedVersionError) return { status: 'unsupported' }
    if (error instanceof SceneValidationError) return { status: 'invalid' }
    throw error
  }
}
