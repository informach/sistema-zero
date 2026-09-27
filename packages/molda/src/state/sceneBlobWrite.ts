import type { UseStore } from 'idb-keyval'
import { checkMoldaDocumentVersion, MoldaUnsupportedVersionError } from '../core/documentVersion'
import { isMoldaAssetId } from '../core/id'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { number, requireScene, SceneValidationError } from '../scene/validation'
import { MoldaStorageBudgetError } from './guardedWrite'
import { SceneBlobError, sameScenePixelBytes } from './sceneBlob'
import { collectUnreferencedSceneBlobs, type RetainedSceneBlobs } from './sceneBlobCollection'
import {
  hydrateSceneBlobStructure,
  inspectSceneBlobRecordStructure,
  type SceneBlobRecordStructure,
} from './sceneBlobStorage'
import { type SceneTombstone, sceneBlobSummary } from './sceneMetadata'
import { collectSceneStorageSnapshot, readSceneStorageSnapshot } from './sceneQuota'
import { inspectInlineSceneRecords } from './sceneRecordInspection'
import { notifySceneStorageCommit } from './sceneStorageChannel'
import { sameSceneStoredValue } from './sceneStorageCompare'
import {
  type PreparedSceneStorage,
  prepareSceneStorage,
  type SceneStoredDocument,
} from './sceneStorageDocument'
import {
  SCENE_BLOB_KEY_PREFIX as BLOB,
  SCENE_DELETED_KEY_PREFIX as DELETED,
  DELETED_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX as DOCUMENT,
  SCENE_RECOVERY_KEY_PREFIX as ORIGINALS,
  PREVIOUS_DELETED_KEY_PREFIX,
  PREVIOUS_RECOVERY_KEY_PREFIX,
  RECOVERY_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX as SUMMARY,
  SUMMARY_KEY_PREFIX,
  V1_DOCUMENT_PREFIXES,
} from './storageKeys'

export type SceneWriteResult =
  | { status: 'saved' | 'deleted'; revision: number; retainedBlobs?: RetainedSceneBlobs }
  | { status: 'conflict' }

const legacyPrefixes = [
  ...V1_DOCUMENT_PREFIXES,
  DELETED_KEY_PREFIX,
  PREVIOUS_DELETED_KEY_PREFIX,
  RECOVERY_KEY_PREFIX,
  PREVIOUS_RECOVERY_KEY_PREFIX,
  SUMMARY_KEY_PREFIX,
] as const

function splitMetadata(document: SceneStoredDocument) {
  const { name, createdAt, updatedAt, thumb, ...body } = document
  return { body, fields: { name, createdAt, updatedAt, ...(thumb === undefined ? {} : { thumb }) } }
}

/**
 * Private proof over this writer's own preparation, never caller-supplied/cache data.
 * Equal bodies + equal bytes inherit its native validation and computed digests.
 * No hydrated document is fabricated; the commit still rereads every dependency.
 */
function matchesPreparedBody(
  structure: Extract<SceneBlobRecordStructure, { status: 'blob-structure' }>,
  prepared: PreparedSceneStorage,
): boolean {
  const stored = splitMetadata(structure.manifest.document)
  const incoming = splitMetadata(prepared.manifest.document)
  if (!sameSceneStoredValue(stored.body, incoming.body)) return false
  for (const [hash, bytes] of structure.blobs) {
    const expected = prepared.blobs.get(hash)
    if (!expected || !sameScenePixelBytes(bytes, expected)) return false
  }
  const logicalBytes =
    prepared.logicalBytes + structuredBytes(stored.fields) - structuredBytes(incoming.fields)
  requireScene(
    structure.summary.bytes === logicalBytes,
    `${SUMMARY}${stored.body.id}`,
    'O índice não corresponde à criação.',
  )
  return true
}

/** Internal layout writer. Prepare/hash outside IDB, compare real dependencies and commit atomically. */
export async function mutateSceneBlobStorage(
  withStore: UseStore,
  maxBytes: number,
  id: string,
  expectedRevision: number | null,
  action: 'save' | 'restore' | 'delete',
  input?: MoldaSceneDocument,
): Promise<SceneWriteResult> {
  requireScene(isMoldaAssetId(id), 'id', 'Identificador de criação inválido.')
  number(maxBytes, 'maxBytes', 1, Number.MAX_SAFE_INTEGER, true)
  if (expectedRevision !== null)
    number(expectedRevision, 'revision', 1, Number.MAX_SAFE_INTEGER, true)
  requireScene(
    action === 'delete' ? input === undefined : input?.id === id,
    'document',
    'Criação inválida para gravação.',
  )
  if (input) {
    const version = checkMoldaDocumentVersion(input)
    // Public registry still reads v1; this isolated writer also understands native v2.
    if (version.status === 'unsupported' && version.version > 2)
      throw new MoldaUnsupportedVersionError(version.version)
  }
  // prepare owns ALL input fields and pixels before its first await.
  const prepared = input ? await prepareSceneStorage(input) : null
  const captured = await readSceneStorageSnapshot(withStore, id)
  const structure = inspectSceneBlobRecordStructure(captured.records, id, captured.keys)
  const blobRead =
    prepared && structure.status === 'blob-structure' && matchesPreparedBody(structure, prepared)
      ? { status: 'active' as const, summary: structure.summary }
      : await hydrateSceneBlobStructure(structure)
  const current =
    blobRead.status === 'inline'
      ? inspectInlineSceneRecords(captured.records, id, captured.keys)
      : blobRead
  if (current.status === 'unsupported') throw new MoldaUnsupportedVersionError(current.version)
  if (current.status === 'invalid') throw new SceneValidationError(id, current.message)
  const revision =
    current.status === 'active'
      ? current.summary.revision
      : current.status === 'deleted'
        ? current.tombstone.revision
        : null
  if (revision !== expectedRevision) return { status: 'conflict' }
  if (
    action === 'restore'
      ? current.status !== 'deleted'
      : action === 'delete'
        ? current.status !== 'active'
        : current.status === 'deleted'
  )
    return { status: 'conflict' }
  const nextRevision = number((revision ?? 0) + 1, 'revision', 1, Number.MAX_SAFE_INTEGER, true)
  const documentKey = `${DOCUMENT}${id}`,
    summaryKey = `${SUMMARY}${id}`,
    deletedKey = `${DELETED}${id}`,
    originalsKey = `${ORIGINALS}${id}`
  const oldHashes =
    current.status === 'active' && current.summary.storageVersion === 2
      ? current.summary.blobRefs.map((ref) => ref.hash)
      : []
  const dependencies = [
    documentKey,
    summaryKey,
    deletedKey,
    ...oldHashes.map((hash) => `${BLOB}${hash}`),
  ]
  const retired = new Set(oldHashes.filter((hash) => !prepared?.blobs.has(hash)))
  return withStore(
    'readwrite',
    (store) =>
      new Promise<SceneWriteResult>((resolve, reject) => {
        const tx = store.transaction
        let result: SceneWriteResult = { status: 'conflict' }
        let failure: unknown
        const abort = (error: unknown) => {
          failure = error
          tx.abort()
        }
        tx.oncomplete = () => {
          resolve(result)
          if (result.status !== 'conflict')
            notifySceneStorageCommit(store, {
              protocol: 1,
              type: 'scene-storage-changed',
              id,
              revision: result.revision,
              status: result.status === 'deleted' ? 'deleted' : 'indexed',
            })
        }
        tx.onabort = tx.onerror = () =>
          reject(failure ?? tx.error ?? new Error('Não foi possível guardar a criação.'))
        collectSceneStorageSnapshot(
          store,
          id,
          (snapshot) => {
            // Equality is on the reread records, not the claimed revision or content hash alone.
            // Receipts are opaque, not parsed/rewritten: their presence is the only captured dependency.
            if (
              snapshot.keys.has(originalsKey) !== captured.keys.has(originalsKey) ||
              dependencies.some(
                (key) =>
                  snapshot.keys.has(key) !== captured.keys.has(key) ||
                  !sameSceneStoredValue(snapshot.records.get(key), captured.records.get(key)),
              )
            )
              return
            if (
              current.status === 'missing' &&
              legacyPrefixes.some((prefix) => snapshot.keys.has(`${prefix}${id}`))
            )
              return
            const originalsBytes = snapshot.costs.get(originalsKey) ?? 0
            const changes = new Map<string, unknown>()
            const removals = action === 'delete' ? [documentKey, summaryKey] : [deletedKey]
            if (action === 'delete') {
              const tombstone: SceneTombstone = {
                id,
                formatVersion: 2,
                storageVersion: 2,
                revision: nextRevision,
                originalsBytes,
              }
              changes.set(deletedKey, tombstone)
            } else {
              requireScene(prepared, 'document', 'Criação ausente.')
              for (const [hash, pixels] of prepared.blobs) {
                const key = `${BLOB}${hash}`
                if (snapshot.keys.has(key)) {
                  // Prepared bytes have a verified hash; full byte equality certifies reuse without await.
                  if (!sameSceneStoredValue(snapshot.records.get(key), pixels))
                    throw new SceneBlobError(
                      'integrity',
                      'Pixels existentes divergentes; registros preservados.',
                    )
                } else changes.set(key, pixels)
              }
              changes.set(documentKey, prepared.manifest)
              changes.set(summaryKey, sceneBlobSummary(prepared, nextRevision, originalsBytes))
            }
            collectUnreferencedSceneBlobs(
              store,
              snapshot,
              id,
              retired,
              (collection) => {
                removals.push(...collection.removals)
                const removed = new Set(removals)
                let bytes = 0
                for (const [key, cost] of collection.costs)
                  if (!removed.has(key) && !changes.has(key)) bytes += cost
                for (const value of changes.values()) bytes += structuredBytes(value)
                if (bytes > maxBytes && action !== 'delete') throw new MoldaStorageBudgetError()
                for (const key of removals) store.delete(key)
                for (const [key, value] of changes) store.put(value, key)
                result = {
                  status: action === 'delete' ? 'deleted' : 'saved',
                  revision: nextRevision,
                  ...(collection.retained ? { retainedBlobs: collection.retained } : {}),
                }
              },
              abort,
            )
          },
          abort,
        )
      }),
  )
}
