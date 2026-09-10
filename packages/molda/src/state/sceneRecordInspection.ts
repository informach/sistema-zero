import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { readSceneDocument } from '../scene/readDocument'
import { requireScene, SceneValidationError } from '../scene/validation'
import {
  readSceneSummary,
  readSceneTombstone,
  type SceneStoredSummary,
  type SceneTombstone,
} from './sceneMetadata'
import {
  SCENE_DELETED_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX,
} from './storageKeys'

export type SceneStoredRead =
  | { status: 'active'; document: MoldaSceneDocument; summary: SceneStoredSummary }
  | { status: 'deleted'; tombstone: SceneTombstone }
  | { status: 'missing' }
  | { status: 'unsupported'; version: number; records: ReadonlyMap<string, unknown> }
  | { status: 'invalid'; message: string; records: ReadonlyMap<string, unknown> }

export function inspectInlineSceneRecords(
  records: ReadonlyMap<string, unknown>,
  id: string,
  keys: ReadonlySet<string> = new Set(records.keys()),
): SceneStoredRead {
  try {
    const documentKey = `${SCENE_DOCUMENT_KEY_PREFIX}${id}`
    const summaryKey = `${SCENE_SUMMARY_KEY_PREFIX}${id}`
    const deletedKey = `${SCENE_DELETED_KEY_PREFIX}${id}`
    const originalsKey = `${SCENE_RECOVERY_KEY_PREFIX}${id}`
    if (keys.has(deletedKey)) {
      const tombstone = readSceneTombstone(records.get(deletedKey), id)
      requireScene(
        tombstone.storageVersion === 1,
        deletedKey,
        'Esta exclusão usa outro layout de armazenamento; registros preservados.',
      )
      requireScene(
        keys.has(originalsKey) === tombstone.originalsBytes > 0,
        originalsKey,
        'A cópia original não corresponde ao índice.',
      )
      requireScene(
        !keys.has(documentKey) && !keys.has(summaryKey),
        deletedKey,
        'Exclusão incompleta; registros preservados.',
      )
      return { status: 'deleted', tombstone }
    }
    if (keys.has(documentKey)) {
      const read = readSceneDocument(records.get(documentKey))
      if (read.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
      requireScene(
        read.status === 'valid' && read.document.id === id,
        documentKey,
        'Documento atual inválido; registros preservados.',
      )
      const summary = readSceneSummary(records.get(summaryKey), id)
      requireScene(
        summary.storageVersion === 1,
        summaryKey,
        'O índice usa outro layout de armazenamento; registros preservados.',
      )
      requireScene(
        keys.has(originalsKey) === summary.originalsBytes > 0,
        originalsKey,
        'A cópia original não corresponde ao índice.',
      )
      requireScene(
        summary.updatedAt === read.document.updatedAt &&
          summary.createdAt === read.document.createdAt &&
          summary.name === read.document.name &&
          summary.bytes === structuredBytes(read.document) &&
          summary.thumbDataUrl === (read.document.thumb ?? null),
        summaryKey,
        'O índice não corresponde à criação.',
      )
      return { status: 'active', document: read.document, summary }
    }
    requireScene(
      !keys.has(summaryKey) && !keys.has(`${SCENE_RECOVERY_KEY_PREFIX}${id}`),
      documentKey,
      'Atualização incompleta; cópia original preservada.',
    )
    return { status: 'missing' }
  } catch (error) {
    if (error instanceof MoldaUnsupportedVersionError)
      return { status: 'unsupported', version: error.version, records }
    if (error instanceof SceneValidationError)
      return { status: 'invalid', message: error.message, records }
    throw error
  }
}
