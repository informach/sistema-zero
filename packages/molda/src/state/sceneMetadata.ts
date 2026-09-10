import { type MoldaAssetSummary, readAssetSummary } from '../core/assetSummary'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { isMoldaAssetId } from '../core/id'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import { isScenePixelHash, MAX_SCENE_PIXEL_BLOB_BYTES, type ScenePixelReference } from './sceneBlob'
import type { PreparedSceneStorage } from './sceneStorageDocument'

/** Storage revision is independent of authorial timestamps and native format version. */
interface SceneSummaryFields extends MoldaAssetSummary {
  kind: 'model'
  formatVersion: 2
  revision: number
  originalsBytes: number
}
export type SceneBlobDescriptor = Pick<ScenePixelReference, 'hash' | 'byteLength'>
export type SceneInlineSummary = SceneSummaryFields & { storageVersion: 1 }
export type SceneBlobSummary = SceneSummaryFields & {
  storageVersion: 2
  /** Physical manifest cost; `bytes` remains the logical hydrated document cost. */
  storedBytes: number
  blobRefs: SceneBlobDescriptor[]
}
export type SceneStoredSummary = SceneInlineSummary | SceneBlobSummary

export interface SceneTombstone {
  id: string
  formatVersion: 2
  storageVersion: 1 | 2
  revision: number
  originalsBytes: number
}

export function sceneSummary(
  document: MoldaSceneDocument,
  revision: number,
  originalsBytes: number,
): SceneInlineSummary {
  return {
    id: document.id,
    name: document.name,
    kind: 'model',
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    thumbDataUrl: document.thumb ?? null,
    bytes: structuredBytes(document),
    formatVersion: 2,
    storageVersion: 1,
    revision: v.number(revision, 'revision', 1, Number.MAX_SAFE_INTEGER, true),
    originalsBytes: v.number(originalsBytes, 'originalsBytes', 0, Number.MAX_SAFE_INTEGER, true),
  }
}

/** Metadata for a prepared snapshot, NOT a writer or permission to trust caller-supplied hashes. */
export function sceneBlobSummary(
  prepared: PreparedSceneStorage,
  revision: number,
  originalsBytes: number,
): SceneBlobSummary {
  const document = prepared.manifest.document
  const refs = new Map<string, SceneBlobDescriptor>()
  for (const image of document.images)
    for (const { pixels } of image.layers)
      if (!refs.has(pixels.hash))
        refs.set(pixels.hash, { hash: pixels.hash, byteLength: pixels.byteLength })
  const summary = readSceneSummary(
    {
      id: document.id,
      name: document.name,
      kind: 'model',
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      thumbDataUrl: document.thumb ?? null,
      bytes: prepared.logicalBytes,
      formatVersion: 2,
      storageVersion: 2,
      revision,
      originalsBytes,
      storedBytes: structuredBytes(prepared.manifest),
      blobRefs: [...refs.values()],
    },
    document.id,
  )
  v.requireScene(summary.storageVersion === 2, 'metadata', 'Índice de pixels inválido.')
  return summary
}

function header(raw: unknown, id: string, keys: readonly string[]): SceneTombstone {
  v.requireScene(isMoldaAssetId(id), 'id', 'Identificador de criação inválido.')
  const candidate = v.record(raw, 'metadata')
  const version = v.number(
    candidate.formatVersion,
    'formatVersion',
    1,
    Number.MAX_SAFE_INTEGER,
    true,
  )
  if (version > 2) throw new MoldaUnsupportedVersionError(version)
  const row = v.record(raw, 'metadata', keys)
  v.requireScene(
    row.id === id && version === 2 && (row.storageVersion === 1 || row.storageVersion === 2),
    'metadata',
    'Índice de criação incompatível.',
  )
  return {
    id,
    formatVersion: 2,
    storageVersion: row.storageVersion,
    revision: v.number(row.revision, 'revision', 1, Number.MAX_SAFE_INTEGER, true),
    originalsBytes: v.number(
      row.originalsBytes,
      'originalsBytes',
      0,
      Number.MAX_SAFE_INTEGER,
      true,
    ),
  }
}

const headerKeys = ['id', 'formatVersion', 'storageVersion', 'revision', 'originalsBytes'] as const

export function readSceneSummary(raw: unknown, id: string): SceneStoredSummary {
  const candidate = v.record(raw, 'metadata')
  const metadata = header(raw, id, [
    ...headerKeys,
    'name',
    'kind',
    'createdAt',
    'updatedAt',
    'bytes',
    'thumbDataUrl',
    ...(candidate.storageVersion === 2 ? ['storedBytes', 'blobRefs'] : []),
  ])
  const summary = readAssetSummary(raw, id)
  v.requireScene(summary?.kind === 'model', 'metadata', 'Resumo da criação inválido.')
  if (metadata.storageVersion === 1)
    return { ...summary, ...metadata, kind: 'model', storageVersion: 1 }
  const seen = new Set<string>()
  let bytes = 0
  const blobRefs = v.list(candidate.blobRefs, 'blobRefs', SCENE_LIMITS.images).map((raw) => {
    const ref = v.record(raw, 'blobRef', ['hash', 'byteLength'])
    v.requireScene(
      isScenePixelHash(ref.hash) && !seen.has(ref.hash),
      'blobRef',
      'Hash inválido ou repetido.',
    )
    seen.add(ref.hash)
    const byteLength = v.number(ref.byteLength, 'byteLength', 1, MAX_SCENE_PIXEL_BLOB_BYTES, true)
    bytes += byteLength
    v.requireScene(bytes <= SCENE_LIMITS.pixelBytes, 'blobRefs', 'Pixels fora do orçamento.')
    return { hash: ref.hash, byteLength }
  })
  return {
    ...summary,
    ...metadata,
    kind: 'model',
    storageVersion: 2,
    storedBytes: v.number(candidate.storedBytes, 'storedBytes', 1, Number.MAX_SAFE_INTEGER, true),
    blobRefs,
  }
}

export function readSceneTombstone(raw: unknown, id: string): SceneTombstone {
  return header(raw, id, headerKeys)
}
