import type { UseStore } from 'idb-keyval'
import { readMoldaDocumentForId } from '../core/documentReader'
import { checkMoldaDocumentVersion, MoldaUnsupportedVersionError } from '../core/documentVersion'
import { MOLDA_LIMITS } from '../core/limits'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { type LegacyMigrationIssue, migrateLegacyModel } from '../scene/migrateLegacy'
import { SceneValidationError } from '../scene/validation'
import { MoldaStorageBudgetError } from './guardedWrite'
import { inspectSceneBlobRecords } from './sceneBlobStorage'
import { sceneSummary } from './sceneMetadata'
import { inspectInlineSceneRecords } from './sceneRecordInspection'
import { notifySceneStorageCommit } from './sceneStorageChannel'
import {
  DELETED_KEY_PREFIX,
  PREVIOUS_DELETED_KEY_PREFIX,
  PREVIOUS_RECOVERY_KEY_PREFIX,
  RECOVERY_KEY_PREFIX,
  SCENE_DELETED_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX,
  SUMMARY_KEY_PREFIX,
  storedDocumentKey,
  V1_DOCUMENT_PREFIXES,
} from './storageKeys'

export interface SceneOriginals {
  formatVersion: 2
  kind: 'molda-scene-originals'
  id: string
  /** Exact raw records, including earlier recovery copies, not reserialized/repaired assets. */
  records: Array<{ key: string; value: unknown }>
  issues: LegacyMigrationIssue[]
}

export type ScenePromotionResult =
  | { status: 'promoted'; document: MoldaSceneDocument; issues: LegacyMigrationIssue[] }
  | { status: 'already-migrated'; document: MoldaSceneDocument }
  | { status: 'missing' | 'conflict' }

type PromotionTransactionResult =
  | ScenePromotionResult
  | { status: 'stored'; records: Map<string, unknown> }

/**
 * INTERNAL migration primitive, not wired to the public v1 app. Snapshot check,
 * conversion, original preservation and promotion are one transaction, with no
 * await in the live IDB callback. Failure/old revision leaves every generation intact.
 * Mixed v1 storage is scanned for quota correctness; this is not the future blob ledger.
 */
export async function promoteLegacyScene(
  withStore: UseStore,
  id: string,
  expectedUpdatedAt: number,
  maxBytes = MOLDA_LIMITS.maxGalleryBytes,
): Promise<ScenePromotionResult> {
  if (!Number.isFinite(expectedUpdatedAt) || !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    return Promise.reject(new TypeError('Revisão ou orçamento inválido.'))
  }
  const outcome = await withStore(
    'readwrite',
    (store) =>
      new Promise<PromotionTransactionResult>((resolve, reject) => {
        const tx = store.transaction
        let result: PromotionTransactionResult = { status: 'missing' }
        let failure: unknown
        tx.oncomplete = () => {
          resolve(result)
          if (result.status === 'promoted')
            notifySceneStorageCommit(store, {
              protocol: 1,
              type: 'scene-storage-changed',
              id,
              revision: 1,
              status: 'indexed',
            })
        }
        tx.onabort = tx.onerror = () =>
          reject(failure ?? tx.error ?? new Error('Não foi possível atualizar a criação.'))
        const keys = store.getAllKeys()
        const values = store.getAll()
        values.onsuccess = () => {
          try {
            const records = new Map<IDBValidKey, unknown>(
              keys.result.map((key, i) => [key, values.result[i]]),
            )
            const documentKey = `${SCENE_DOCUMENT_KEY_PREFIX}${id}`
            const originalsKey = `${SCENE_RECOVERY_KEY_PREFIX}${id}`
            const summaryKey = `${SCENE_SUMMARY_KEY_PREFIX}${id}`
            if (records.has(documentKey)) {
              // This branch never writes. Verify the captured blob layout after the transaction,
              // not by awaiting hashes in a live IDB callback or falling back to legacy data.
              const captured = new Map<string, unknown>()
              for (const [key, raw] of records) if (typeof key === 'string') captured.set(key, raw)
              result = { status: 'stored', records: captured }
              return
            }
            if (records.has(`${SCENE_DELETED_KEY_PREFIX}${id}`)) {
              result = { status: 'conflict' }
              return
            }
            if (records.has(originalsKey) || records.has(summaryKey))
              throw new SceneValidationError(
                originalsKey,
                'Atualização incompleta; cópia original preservada.',
              )
            const sourceKey = storedDocumentKey(records, id)
            if (sourceKey === null) return
            const read = readMoldaDocumentForId(records.get(sourceKey), id)
            if (read.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
            if (read.status !== 'valid' || read.asset.kind !== 'model')
              throw new SceneValidationError(sourceKey, 'Modelo de origem inválido.')
            if (read.asset.updatedAt !== expectedUpdatedAt) {
              result = { status: 'conflict' }
              return
            }
            const retired = [
              ...V1_DOCUMENT_PREFIXES,
              RECOVERY_KEY_PREFIX,
              PREVIOUS_RECOVERY_KEY_PREFIX,
              SUMMARY_KEY_PREFIX,
              DELETED_KEY_PREFIX,
              PREVIOUS_DELETED_KEY_PREFIX,
            ].map((prefix) => `${prefix}${id}`)
            for (const prefix of [
              ...V1_DOCUMENT_PREFIXES,
              RECOVERY_KEY_PREFIX,
              PREVIOUS_RECOVERY_KEY_PREFIX,
            ]) {
              const raw = records.get(`${prefix}${id}`)
              if (raw === undefined && !records.has(`${prefix}${id}`)) continue
              const version = checkMoldaDocumentVersion(raw)
              if (version.status === 'unsupported')
                throw new MoldaUnsupportedVersionError(version.version)
            }
            const { document, issues } = migrateLegacyModel(read.asset)
            const originals: SceneOriginals = {
              formatVersion: 2,
              kind: 'molda-scene-originals',
              id,
              issues,
              records: retired
                .filter((key) => records.has(key))
                .map((key) => ({ key, value: records.get(key) })),
            }
            const summary = sceneSummary(document, 1, structuredBytes(originals))
            // Model the complete committed state before issuing the first mutating request.
            for (const key of retired) records.delete(key)
            records.set(originalsKey, originals)
            records.set(documentKey, document)
            records.set(`${SCENE_SUMMARY_KEY_PREFIX}${id}`, summary)
            records.set(`${DELETED_KEY_PREFIX}${id}`, true)
            records.set(`${PREVIOUS_DELETED_KEY_PREFIX}${id}`, true)
            let bytes = 0
            for (const [key, value] of records) {
              if (typeof key === 'string' && key.startsWith('molda:'))
                bytes += structuredBytes(value)
            }
            if (bytes > maxBytes) throw new MoldaStorageBudgetError()
            store.put(originals, originalsKey)
            store.put(document, documentKey)
            for (const key of retired) store.delete(key)
            store.put(true, `${DELETED_KEY_PREFIX}${id}`)
            store.put(true, `${PREVIOUS_DELETED_KEY_PREFIX}${id}`)
            store.put(summary, `${SCENE_SUMMARY_KEY_PREFIX}${id}`)
            result = { status: 'promoted', document, issues }
          } catch (error) {
            failure = error
            tx.abort()
          }
        }
      }),
  )
  if (outcome.status !== 'stored') return outcome
  const blobRead = await inspectSceneBlobRecords(
    outcome.records,
    id,
    new Set(outcome.records.keys()),
  )
  const current =
    blobRead.status === 'inline' ? inspectInlineSceneRecords(outcome.records, id) : blobRead
  if (current.status === 'active') return { status: 'already-migrated', document: current.document }
  if (current.status === 'unsupported') throw new MoldaUnsupportedVersionError(current.version)
  throw new SceneValidationError(
    id,
    current.status === 'invalid'
      ? current.message
      : 'Documento atual inválido; original preservado.',
  )
}
