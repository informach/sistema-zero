import type { UseStore } from 'idb-keyval'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { isMoldaAssetId } from '../core/id'
import { structuredBytes } from '../core/structuredBytes'
import * as v from '../scene/validation'
import { collectRecords } from './readRecords'
import { checkScenePixelBytes, SceneBlobError } from './sceneBlob'
import {
  readSceneSummary,
  readSceneTombstone,
  type SceneBlobDescriptor,
  type SceneBlobSummary,
} from './sceneMetadata'
import { inspectInlineSceneRecords, type SceneStoredRead } from './sceneRecordInspection'
import {
  hydrateSceneStorage,
  readSceneStorageManifest,
  type SceneStorageManifest,
} from './sceneStorageDocument'
import {
  SCENE_BLOB_KEY_PREFIX,
  SCENE_DELETED_KEY_PREFIX,
  SCENE_DOCUMENT_KEY_PREFIX,
  SCENE_RECOVERY_KEY_PREFIX,
  SCENE_SUMMARY_KEY_PREFIX,
} from './storageKeys'

type BlobStorageRead = SceneStoredRead | { status: 'inline'; records: Map<string, unknown> }
/** Structural checks only: no proof yet of cross-references, logical cost or SHA-256 integrity. */
export type SceneBlobRecordStructure =
  | BlobStorageRead
  | {
      status: 'blob-structure'
      records: Map<string, unknown>
      manifest: SceneStorageManifest
      summary: SceneBlobSummary
      blobs: ReadonlyMap<string, Uint8Array>
    }
interface StoredSnapshot {
  records: Map<string, unknown>
  manifest: SceneStorageManifest | null
  problem: SceneBlobError | null
}

function storageVersion(raw: unknown): unknown {
  return raw && typeof raw === 'object' && 'storageVersion' in raw ? raw.storageVersion : undefined
}

function references(manifest: SceneStorageManifest): SceneBlobDescriptor[] {
  const unique = new Map<string, SceneBlobDescriptor>()
  for (const image of manifest.document.images)
    for (const { pixels } of image.layers)
      if (!unique.has(pixels.hash))
        unique.set(pixels.hash, { hash: pixels.hash, byteLength: pixels.byteLength })
  return [...unique.values()]
}

/** Dynamic dependent reads stay in ONE live transaction; no promise/hash between its requests. */
function snapshot(store: UseStore, id: string, signal?: AbortSignal): Promise<StoredSnapshot> {
  signal?.throwIfAborted()
  return store(
    'readonly',
    (objectStore) =>
      new Promise<StoredSnapshot>((resolve, reject) => {
        const tx = objectStore.transaction
        const result: StoredSnapshot = { records: new Map(), manifest: null, problem: null }
        let failure: unknown
        const cleanup = () => signal?.removeEventListener('abort', cancel)
        const cancel = () => {
          failure = signal?.reason
          try {
            tx.abort()
          } catch (error) {
            // Commit/abort can already be queued. Discard its result rather than claiming cancellation failed.
            if (!(error instanceof DOMException && error.name === 'InvalidStateError')) {
              cleanup()
              reject(error)
            }
          }
        }
        tx.oncomplete = () => {
          cleanup()
          if (signal?.aborted) reject(signal.reason)
          else resolve(result)
        }
        tx.onabort = tx.onerror = () => {
          cleanup()
          reject(failure ?? tx.error ?? new Error('Não foi possível ler a criação.'))
        }
        signal?.addEventListener('abort', cancel, { once: true })
        if (signal?.aborted) {
          cancel()
          return
        }
        collectRecords(
          objectStore,
          [
            SCENE_DOCUMENT_KEY_PREFIX,
            SCENE_SUMMARY_KEY_PREFIX,
            SCENE_DELETED_KEY_PREFIX,
            SCENE_RECOVERY_KEY_PREFIX,
          ].map((prefix) => `${prefix}${id}`),
          (records) => {
            if (signal?.aborted) return
            result.records = records
            const raw = records.get(`${SCENE_DOCUMENT_KEY_PREFIX}${id}`)
            if (storageVersion(raw) === undefined) return
            try {
              result.manifest = readSceneStorageManifest(raw)
              collectRecords(
                objectStore,
                references(result.manifest).map(({ hash }) => `${SCENE_BLOB_KEY_PREFIX}${hash}`),
                (blobs) => {
                  for (const [key, value] of blobs) records.set(key, value)
                },
              )
            } catch (error) {
              if (error instanceof SceneBlobError) result.problem = error
              else {
                failure = error
                tx.abort()
              }
            }
          },
        )
      }),
  )
}

/** Reader only. Inline callers retain their existing inspection/writer; no migration takes place. */
export async function readSceneBlobStorage(
  store: UseStore,
  id: string,
  signal?: AbortSignal,
): Promise<BlobStorageRead> {
  signal?.throwIfAborted()
  v.requireScene(isMoldaAssetId(id), 'id', 'Identificador de criação inválido.')
  const { records, manifest, problem } = await snapshot(store, id, signal)
  signal?.throwIfAborted()
  return hydrateSceneBlobStructure(
    inspectSnapshotStructure({ records, manifest, problem }, id, new Set(records.keys())),
    signal,
  )
}

/** Shared write preflight: metadata ledger can observe receipt presence without reading opaque bytes. */
export async function inspectSceneBlobRecords(
  records: Map<string, unknown>,
  id: string,
  keys: ReadonlySet<string>,
  signal?: AbortSignal,
): Promise<BlobStorageRead> {
  signal?.throwIfAborted()
  return hydrateSceneBlobStructure(inspectSceneBlobRecordStructure(records, id, keys), signal)
}

/** Synchronous, shared structure inspection. Its blob result is NOT a validated native scene. */
export function inspectSceneBlobRecordStructure(
  records: Map<string, unknown>,
  id: string,
  keys: ReadonlySet<string>,
): SceneBlobRecordStructure {
  v.requireScene(isMoldaAssetId(id), 'id', 'Identificador de criação inválido.')
  const captured: StoredSnapshot = { records, manifest: null, problem: null }
  const raw = records.get(`${SCENE_DOCUMENT_KEY_PREFIX}${id}`)
  if (storageVersion(raw) !== undefined) {
    try {
      captured.manifest = readSceneStorageManifest(raw)
    } catch (error) {
      if (!(error instanceof SceneBlobError)) throw error
      captured.problem = error
    }
  }
  return inspectSnapshotStructure(captured, id, keys)
}

function inspectSnapshotStructure(
  { records, manifest, problem }: StoredSnapshot,
  id: string,
  keys: ReadonlySet<string>,
): SceneBlobRecordStructure {
  const documentKey = `${SCENE_DOCUMENT_KEY_PREFIX}${id}`
  const summaryKey = `${SCENE_SUMMARY_KEY_PREFIX}${id}`
  const deletedKey = `${SCENE_DELETED_KEY_PREFIX}${id}`
  const originalsKey = `${SCENE_RECOVERY_KEY_PREFIX}${id}`
  if (
    !manifest &&
    !problem &&
    storageVersion(records.get(summaryKey)) !== 2 &&
    storageVersion(records.get(deletedKey)) !== 2
  )
    return { status: 'inline', records }
  try {
    if (problem) throw problem
    // A future inline document still takes precedence over the layout claimed by its index.
    if (!manifest && records.has(documentKey)) return inspectInlineSceneRecords(records, id, keys)
    if (records.has(deletedKey)) {
      const tombstone = readSceneTombstone(records.get(deletedKey), id)
      v.requireScene(
        tombstone.storageVersion === 2 &&
          !records.has(documentKey) &&
          !records.has(summaryKey) &&
          keys.has(originalsKey) === tombstone.originalsBytes > 0,
        deletedKey,
        'Exclusão incompleta; registros preservados.',
      )
      return { status: 'deleted', tombstone }
    }
    v.requireScene(
      manifest && manifest.id === id,
      documentKey,
      'Manifesto ausente ou de outra criação.',
    )
    const summary = readSceneSummary(records.get(summaryKey), id)
    v.requireScene(
      summary.storageVersion === 2 &&
        summary.storedBytes === structuredBytes(records.get(documentKey)),
      summaryKey,
      'O índice não corresponde ao armazenamento.',
    )
    v.requireScene(
      keys.has(originalsKey) === summary.originalsBytes > 0,
      originalsKey,
      'A cópia original não corresponde ao índice.',
    )
    const refs = references(manifest)
    v.requireScene(
      refs.length === summary.blobRefs.length &&
        refs.every(
          (ref, i) =>
            ref.hash === summary.blobRefs[i]?.hash &&
            ref.byteLength === summary.blobRefs[i]?.byteLength,
        ),
      summaryKey,
      'O índice não corresponde aos pixels.',
    )
    const document = manifest.document
    v.requireScene(
      summary.updatedAt === document.updatedAt &&
        summary.createdAt === document.createdAt &&
        summary.name === document.name &&
        summary.thumbDataUrl === (document.thumb ?? null),
      summaryKey,
      'O índice não corresponde à criação.',
    )
    const blobs = new Map<string, Uint8Array>()
    for (const { hash, byteLength } of refs) {
      const key = `${SCENE_BLOB_KEY_PREFIX}${hash}`
      if (!records.has(key))
        throw new SceneBlobError('missing', 'Faltam pixels nesta cópia guardada.')
      const raw = records.get(key)
      v.requireScene(
        raw instanceof Uint8Array &&
          raw.buffer instanceof ArrayBuffer &&
          raw.byteOffset === 0 &&
          raw.byteLength === raw.buffer.byteLength,
        key,
        'Registro de pixels inválido; dados preservados.',
      )
      checkScenePixelBytes(raw, byteLength)
      blobs.set(hash, raw)
    }
    return { status: 'blob-structure', records, manifest, summary, blobs }
  } catch (error) {
    return failedRead(error, records, id)
  }
}

/** Acquires owned pixels before awaiting; structure alone never grants a readable document. */
export async function hydrateSceneBlobStructure(
  structure: SceneBlobRecordStructure,
  signal?: AbortSignal,
): Promise<BlobStorageRead> {
  signal?.throwIfAborted()
  if (structure.status !== 'blob-structure') return structure
  const { manifest, blobs, summary, records } = structure
  try {
    const document = await hydrateSceneStorage(manifest, blobs, signal)
    v.requireScene(
      summary.bytes === structuredBytes(document),
      `${SCENE_SUMMARY_KEY_PREFIX}${manifest.id}`,
      'O índice não corresponde à criação.',
    )
    signal?.throwIfAborted()
    return { status: 'active', document, summary }
  } catch (error) {
    if (signal?.aborted) throw signal.reason
    return failedRead(error, records, manifest.id)
  }
}

function failedRead(error: unknown, records: Map<string, unknown>, id: string): BlobStorageRead {
  if (error instanceof MoldaUnsupportedVersionError)
    return { status: 'unsupported', version: error.version, records }
  if (error instanceof SceneBlobError && error.reason === 'unsupported') {
    const raw = records.get(`${SCENE_DOCUMENT_KEY_PREFIX}${id}`)
    const version =
      raw &&
      typeof raw === 'object' &&
      'formatVersion' in raw &&
      typeof raw.formatVersion === 'number'
        ? raw.formatVersion
        : 2
    return { status: 'unsupported', version, records }
  }
  if (error instanceof SceneBlobError || error instanceof v.SceneValidationError)
    return { status: 'invalid', message: error.message, records }
  throw error
}
