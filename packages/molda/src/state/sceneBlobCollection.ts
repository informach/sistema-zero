import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { structuredBytes } from '../core/structuredBytes'
import { readSceneDocument } from '../scene/readDocument'
import { SceneValidationError } from '../scene/validation'
import { collectRecords } from './readRecords'
import { isScenePixelHash, SceneBlobError } from './sceneBlob'
import { readSceneSummary, readSceneTombstone } from './sceneMetadata'
import type { SceneStorageSnapshot } from './sceneQuota'
import { readSceneStorageManifest } from './sceneStorageDocument'
import {
  SCENE_BLOB_KEY_PREFIX as BLOB,
  SCENE_DELETED_KEY_PREFIX as DELETED,
  SCENE_DOCUMENT_KEY_PREFIX as DOCUMENT,
  SCENE_SUMMARY_KEY_PREFIX as SUMMARY,
} from './storageKeys'

export interface RetainedSceneBlobs {
  /** Candidates retained because another record's references cannot be certified, not proven garbage. */
  count: number
  bytes: number
  reason: 'unverified-references'
}
export interface SceneBlobCollection {
  removals: string[]
  retained: RetainedSceneBlobs | null
  costs: ReadonlyMap<string, number>
}

/**
 * Only consider the target's retired references. No orphan sweep or refcount authority.
 * All graph reads stay in the caller's live transaction. Unknown records/receipts pin candidates.
 */
export function collectUnreferencedSceneBlobs(
  store: IDBObjectStore,
  snapshot: SceneStorageSnapshot,
  id: string,
  candidates: ReadonlySet<string>,
  onRead: (collection: SceneBlobCollection) => void,
  onError: (error: unknown) => void,
): void {
  const costs = new Map(snapshot.costs)
  const kept = new Set<string>()
  const finish = (opaque: boolean) => {
    const unknown = [...candidates].filter(
      (hash) => !kept.has(hash) && snapshot.keys.has(`${BLOB}${hash}`),
    )
    onRead({
      removals: opaque ? [] : unknown.map((hash) => `${BLOB}${hash}`),
      retained:
        opaque && unknown.length
          ? {
              count: unknown.length,
              bytes: unknown.reduce((sum, hash) => sum + (costs.get(`${BLOB}${hash}`) ?? 0), 0),
              reason: 'unverified-references',
            }
          : null,
      costs,
    })
  }
  const understoodFailure = (error: unknown) =>
    error instanceof SceneValidationError ||
    error instanceof MoldaUnsupportedVersionError ||
    error instanceof SceneBlobError
  try {
    if (candidates.size === 0) {
      finish(false)
      return
    }
    const documents: string[] = []
    let opaque = false
    for (const key of snapshot.keys) {
      if ([`${DOCUMENT}${id}`, `${SUMMARY}${id}`, `${DELETED}${id}`].includes(key)) continue
      if (key.startsWith(BLOB)) {
        const raw = snapshot.records.get(key)
        if (
          !isScenePixelHash(key.slice(BLOB.length)) ||
          !(raw instanceof Uint8Array) ||
          !(raw.buffer instanceof ArrayBuffer) ||
          raw.byteOffset !== 0 ||
          raw.byteLength !== raw.buffer.byteLength
        )
          opaque = true
      } else if (key.startsWith(DOCUMENT)) documents.push(key)
      else if (key.startsWith(SUMMARY)) {
        try {
          const other = key.slice(SUMMARY.length)
          const summary = readSceneSummary(snapshot.records.get(key), other)
          if (!snapshot.keys.has(`${DOCUMENT}${other}`) || snapshot.keys.has(`${DELETED}${other}`))
            opaque = true
          // Metadata can retain resources, never by itself authorize collection.
          if (summary.storageVersion === 2) for (const ref of summary.blobRefs) kept.add(ref.hash)
        } catch (error) {
          if (!understoodFailure(error)) throw error
          opaque = true
        }
      } else if (key.startsWith(DELETED)) {
        try {
          const other = key.slice(DELETED.length)
          readSceneTombstone(snapshot.records.get(key), other)
          if (snapshot.keys.has(`${DOCUMENT}${other}`) || snapshot.keys.has(`${SUMMARY}${other}`))
            opaque = true
        } catch (error) {
          if (!understoodFailure(error)) throw error
          opaque = true
        }
      } else opaque = true
    }
    if (opaque) {
      finish(true)
      return
    }
    // A metadata-only save has no retired hashes and never reaches this graph scan.
    collectRecords(store, documents, (records) => {
      try {
        for (const [key, raw] of records) {
          costs.set(key, structuredBytes(raw))
          try {
            const other = key.slice(DOCUMENT.length)
            if (raw && typeof raw === 'object' && 'storageVersion' in raw) {
              const manifest = readSceneStorageManifest(raw)
              if (manifest.id !== other) {
                opaque = true
                continue
              }
              for (const image of manifest.document.images)
                for (const layer of image.layers) kept.add(layer.pixels.hash)
            } else {
              const read = readSceneDocument(raw)
              if (read.status !== 'valid' || read.document.id !== other) opaque = true
            }
          } catch (error) {
            if (!understoodFailure(error)) throw error
            opaque = true
          }
        }
        finish(opaque || records.size !== documents.length)
      } catch (error) {
        onError(error)
      }
    })
  } catch (error) {
    onError(error)
  }
}
