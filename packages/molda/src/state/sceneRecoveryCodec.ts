import { deflateSync, Inflate } from 'fflate'
import { MOLDA_LIMITS } from '../core/limits'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import { isScenePixelHash, scenePixelHash } from './sceneBlob'
import {
  hydrateSceneStorage,
  prepareSceneStorage,
  readSceneStorageManifest,
  type SceneStorageManifest,
} from './sceneStorageDocument'

export const RECOVERY_BLOCK_BYTES = 64 * 1024
export interface RecoveryBlock {
  kind: 'molda-checkpoint-block'
  version: 1
  rawBytes: number
  bytes: Uint8Array
}
export interface SceneRecoveryRecord {
  kind: 'molda-scene-checkpoint'
  version: 1
  id: string
  session: string
  baseRevision: number
  updatedAt: number
  manifest: SceneStorageManifest
  layers: Array<{ hash: string; byteLength: number; blocks: string[] }>
}
export interface PreparedSceneRecovery {
  record: SceneRecoveryRecord
  blocks: Map<string, RecoveryBlock>
}

export function readRecoveryBlock(raw: unknown): RecoveryBlock {
  const row = v.record(raw, 'block', ['kind', 'version', 'rawBytes', 'bytes'])
  v.requireScene(
    row.kind === 'molda-checkpoint-block' && row.version === 1,
    'block',
    'Cópia de recuperação desconhecida.',
  )
  v.requireScene(
    row.bytes instanceof Uint8Array &&
      row.bytes.buffer instanceof ArrayBuffer &&
      row.bytes.byteOffset === 0 &&
      row.bytes.byteLength === row.bytes.buffer.byteLength &&
      row.bytes.byteLength > 0 &&
      row.bytes.byteLength <= RECOVERY_BLOCK_BYTES + 1024,
    'block',
    'Bloco de recuperação inválido.',
  )
  return {
    kind: row.kind,
    version: 1,
    rawBytes: v.number(row.rawBytes, 'rawBytes', 1, RECOVERY_BLOCK_BYTES, true),
    bytes: row.bytes,
  }
}

export function readSceneRecoveryRecord(raw: unknown): SceneRecoveryRecord {
  const row = v.record(raw, 'recovery', [
    'kind',
    'version',
    'id',
    'session',
    'baseRevision',
    'updatedAt',
    'manifest',
    'layers',
  ])
  v.requireScene(
    row.kind === 'molda-scene-checkpoint' && row.version === 1,
    'recovery',
    'Cópia de recuperação desconhecida.',
  )
  const manifest = readSceneStorageManifest(row.manifest)
  v.requireScene(
    structuredBytes(manifest) <= MOLDA_LIMITS.maxDocumentBytes,
    'manifest',
    'Cópia de recuperação grande demais.',
  )
  const id = v.id(row.id, 'id')
  v.requireScene(manifest.id === id, 'id', 'A cópia pertence a outra criação.')
  v.requireScene(
    row.updatedAt === manifest.document.updatedAt,
    'updatedAt',
    'O carimbo de recuperação não corresponde à criação.',
  )
  let total = 0
  const layers = v
    .list(row.layers, 'layers', SCENE_LIMITS.images * SCENE_LIMITS.layersPerImage)
    .map((raw) => {
      const layer = v.record(raw, 'layer', ['hash', 'byteLength', 'blocks'])
      v.requireScene(isScenePixelHash(layer.hash), 'hash', 'Referência de recuperação inválida.')
      const byteLength = v.number(
        layer.byteLength,
        'byteLength',
        1,
        SCENE_LIMITS.imageSide ** 2 * 4,
        true,
      )
      total += byteLength
      v.requireScene(
        total <= SCENE_LIMITS.pixelBytes,
        'layers',
        'Cópia de recuperação grande demais.',
      )
      const blocks = v
        .list(layer.blocks, 'blocks', Math.ceil(byteLength / RECOVERY_BLOCK_BYTES))
        .map((hash) => {
          v.requireScene(isScenePixelHash(hash), 'hash', 'Referência de recuperação inválida.')
          return hash
        })
      v.requireScene(
        blocks.length === Math.ceil(byteLength / RECOVERY_BLOCK_BYTES),
        'blocks',
        'Cópia de recuperação incompleta.',
      )
      return { hash: layer.hash, byteLength, blocks }
    })
  return {
    kind: row.kind,
    version: 1,
    id,
    session: v.id(row.session, 'session'),
    baseRevision: v.number(row.baseRevision, 'baseRevision', 1, Number.MAX_SAFE_INTEGER, true),
    updatedAt: v.number(row.updatedAt, 'updatedAt', 0),
    manifest,
    layers,
  }
}

/** Worker-only compression: exact native fields and pixel bytes, without UV/image conversion. */
export async function prepareSceneRecovery(
  document: MoldaSceneDocument,
  baseRevision: number,
  session: string,
): Promise<PreparedSceneRecovery> {
  const prepared = await prepareSceneStorage(document)
  v.requireScene(
    prepared.logicalBytes <= MOLDA_LIMITS.maxDocumentBytes,
    'document',
    'Cópia de recuperação grande demais.',
  )
  const blocks = new Map<string, RecoveryBlock>()
  const layers: SceneRecoveryRecord['layers'] = []
  for (const [hash, pixels] of prepared.blobs) {
    const refs: string[] = []
    for (let offset = 0; offset < pixels.length; offset += RECOVERY_BLOCK_BYTES) {
      const raw = pixels.subarray(offset, offset + RECOVERY_BLOCK_BYTES)
      const hash = await scenePixelHash(raw)
      if (!blocks.has(hash))
        blocks.set(hash, {
          kind: 'molda-checkpoint-block',
          version: 1,
          rawBytes: raw.length,
          bytes: deflateSync(raw, { level: 1 }),
        })
      refs.push(hash)
    }
    layers.push({ hash, byteLength: pixels.length, blocks: refs })
  }
  return {
    record: readSceneRecoveryRecord({
      kind: 'molda-scene-checkpoint',
      version: 1,
      id: document.id,
      session,
      baseRevision,
      updatedAt: document.updatedAt,
      manifest: prepared.manifest,
      layers,
    }),
    blocks,
  }
}

/** Bounded streaming inflate rejects expansion beyond the declared block before retaining it. */
export function inflateRecoveryBlock(block: RecoveryBlock): Uint8Array {
  const output = new Uint8Array(block.rawBytes)
  let size = 0
  const inflater = new Inflate((chunk) => {
    v.requireScene(
      size + chunk.length <= output.length,
      'block',
      'Bloco de recuperação grande demais.',
    )
    output.set(chunk, size)
    size += chunk.length
  })
  for (let i = 0; i < block.bytes.length; i += 256)
    inflater.push(block.bytes.subarray(i, i + 256), i + 256 >= block.bytes.length)
  v.requireScene(size === output.length, 'block', 'Bloco de recuperação incompleto.')
  return output
}

export async function restoreSceneRecovery(
  record: SceneRecoveryRecord,
  stored: ReadonlyMap<string, unknown>,
): Promise<MoldaSceneDocument> {
  const decoded = new Map<string, Uint8Array>()
  const pixels = new Map<string, Uint8Array>()
  for (const layer of record.layers) {
    const bytes = new Uint8Array(layer.byteLength)
    let offset = 0
    for (const hash of layer.blocks) {
      let raw = decoded.get(hash)
      if (!raw) {
        const block = readRecoveryBlock(stored.get(hash))
        raw = inflateRecoveryBlock(block)
        v.requireScene(
          (await scenePixelHash(raw)) === hash,
          'block',
          'A cópia de recuperação está incompleta ou foi alterada.',
        )
        decoded.set(hash, raw)
      }
      v.requireScene(
        offset + raw.length <= bytes.length,
        'layer',
        'Camada de recuperação inválida.',
      )
      bytes.set(raw, offset)
      offset += raw.length
    }
    v.requireScene(offset === bytes.length, 'layer', 'Camada de recuperação incompleta.')
    pixels.set(layer.hash, bytes)
  }
  return hydrateSceneStorage(record.manifest, pixels)
}
