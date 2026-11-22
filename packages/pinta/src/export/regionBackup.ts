/** Internal native-8 backup boundary. Not exported by the public Pinta API or workshop. */

import { PINTA_REGION_CELL_COUNT } from '@sistemazero/core/creations'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { decodedBitmapByteLength } from '../core/bitmapCodec'
import { utf8ByteLength } from '../core/jsonBytes'
import { REGION_METADATA_BUDGET } from '../core/mapDocumentBoundary'
import {
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  sanitizePintaAsset,
  sanitizeRegionMapSetAsset,
  sanitizeRegionTilemapAsset,
} from '../core/project'
import { PINTA_MAP_FORMAT_LIMITS } from '../core/projectConfig'
import { encodeRegionMapDocument, encodeRegionSetDocument } from '../core/regionDocument'
import {
  decodePintaBackupAsset,
  encodePintaBackupAsset,
  MAX_BACKUP_FILE_BYTES,
  pintaBackupFromEncoded,
  pintaEncodedBackupByteLength,
} from './projectJson'

const VERSION = 8
/** Separate from encoded file size: bound buffers allocated by a single native-8 restore. */
export const MAX_REGION_BACKUP_DECODED_BYTES = 32 * 1024 * 1024

function admitsDecodedBuffers(assets: readonly unknown[]): boolean {
  const pending = assets.map((asset) => ({ asset, depth: 0 }))
  let bytes = 0
  function bitmap(raw: unknown): boolean {
    const size = decodedBitmapByteLength(raw)
    if (size === null) return false
    bytes += size
    return bytes <= MAX_REGION_BACKUP_DECODED_BYTES
  }
  while (pending.length) {
    const item = pending.pop()!
    if (
      item.depth > REGION_METADATA_BUDGET.maxDepth ||
      !item.asset ||
      typeof item.asset !== 'object' ||
      Array.isArray(item.asset)
    )
      return false
    const asset = item.asset as Record<string, unknown>
    switch (asset.kind) {
      case 'map-set':
        pending.push({ asset: asset.map, depth: item.depth + 1 })
        break
      case 'tilemap': {
        if (!Array.isArray(asset.layers)) return false
        for (const raw of asset.layers) {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
          const layer = raw as Record<string, unknown>
          if (layer.kind !== undefined && layer.kind !== 'tiles') continue
          if (asset.schema === VERSION) {
            const grid = layer.cells
            if (
              !grid ||
              typeof grid !== 'object' ||
              !('chunks' in grid) ||
              !Array.isArray(grid.chunks)
            )
              return false
            bytes += grid.chunks.length * PINTA_REGION_CELL_COUNT * Int16Array.BYTES_PER_ELEMENT
          } else {
            if (
              typeof asset.cols !== 'number' ||
              typeof asset.rows !== 'number' ||
              !Number.isInteger(asset.cols) ||
              !Number.isInteger(asset.rows) ||
              asset.cols < 1 ||
              asset.rows < 1 ||
              asset.cols > PINTA_MAP_FORMAT_LIMITS.maxCols ||
              asset.rows > PINTA_MAP_FORMAT_LIMITS.maxRows
            )
              return false
            bytes += asset.cols * asset.rows * Int16Array.BYTES_PER_ELEMENT
          }
          if (bytes > MAX_REGION_BACKUP_DECODED_BYTES) return false
        }
        if (asset.resources !== undefined) {
          if (!Array.isArray(asset.resources)) return false
          for (const version of asset.resources) {
            if (!version || typeof version !== 'object' || !('asset' in version)) return false
            pending.push({ asset: version.asset, depth: item.depth + 1 })
          }
        }
        break
      }
      case 'pixel-sprite':
        if (!Array.isArray(asset.animations)) return false
        for (const animation of asset.animations) {
          if (
            !animation ||
            typeof animation !== 'object' ||
            !('frames' in animation) ||
            !Array.isArray(animation.frames)
          )
            return false
          for (const frame of animation.frames)
            for (const cel of Array.isArray(frame) ? frame : [frame]) if (!bitmap(cel)) return false
        }
        break
      case 'pixel-background':
        for (const cel of Array.isArray(asset.cels) ? asset.cels : [asset.cels ?? asset.bitmap])
          if (!bitmap(cel)) return false
        break
      case 'tileset':
        if (!Array.isArray(asset.tiles)) return false
        for (const tile of asset.tiles) if (!bitmap(tile)) return false
        break
      case 'vector-sprite':
      case 'vector-background':
      case 'vector-tileset':
        break
      default:
        return false
    }
  }
  return true
}
function regionalMap(asset: PintaMemoryAsset): asset is RegionTilemapAsset {
  return asset.kind === 'tilemap' && asset.schema === VERSION && 'origin' in asset
}
function regionalSet(asset: PintaMemoryAsset): asset is RegionMapSetAsset {
  return asset.kind === 'map-set' && asset.schema === VERSION && 'origin' in asset.map
}
const regional = (asset: PintaMemoryAsset) => regionalMap(asset) || regionalSet(asset)

/** Uses the existing bitmap RLE and Core region codec, with the existing 32 MiB file budget. */
export function encodeRegionGalleryBackup(
  assets: readonly PintaMemoryAsset[],
): { text: string; bytes: number } | null {
  if (!assets.some(regional)) return null
  const encoded: unknown[] = []
  for (const asset of assets) {
    if (
      (asset.kind === 'tilemap' || asset.kind === 'map-set') &&
      asset.schema === VERSION &&
      !regional(asset)
    )
      return null
    const value = regionalMap(asset)
      ? encodeRegionMapDocument(asset, encodePintaBackupAsset)
      : regionalSet(asset)
        ? encodeRegionSetDocument(asset, encodePintaBackupAsset)
        : encodePintaBackupAsset(asset)
    if (!value) return null
    encoded.push(value)
  }
  if (!admitsDecodedBuffers(encoded)) return null
  const bytes = pintaEncodedBackupByteLength(encoded, VERSION)
  if (bytes > MAX_BACKUP_FILE_BYTES) return null
  return { text: pintaBackupFromEncoded(encoded, VERSION), bytes }
}

/** New backups restore atomically: no partial gallery if one authorial document is invalid. */
export function decodeRegionGalleryBackup(text: string): {
  assets: PintaMemoryAsset[]
  warnings: string[]
} {
  const refuse = (message: string) => ({ assets: [], warnings: [message] })
  try {
    if (text.length > MAX_BACKUP_FILE_BYTES || utf8ByteLength(text) > MAX_BACKUP_FILE_BYTES)
      return refuse('O backup ultrapassa o limite portátil de 32 MiB.')
    const doc: unknown = JSON.parse(text)
    if (!doc || typeof doc !== 'object' || Array.isArray(doc))
      return refuse('O arquivo não é um backup regional do Pinta.')
    const record = doc as Record<string, unknown>
    if (
      record.format !== 'pinta-gallery' ||
      record.version !== VERSION ||
      !Array.isArray(record.assets) ||
      Object.keys(record).length !== 3
    )
      return refuse('A versão ou o cabeçalho do backup regional não é compatível.')
    if (!admitsDecodedBuffers(record.assets))
      return refuse(
        'O backup excede o orçamento de 32 MiB de buffers decodificados ou contém cabeçalhos inválidos. O arquivo foi mantido.',
      )
    const assets: PintaMemoryAsset[] = []
    for (const input of record.assets) {
      const raw = decodePintaBackupAsset(input, true)
      let asset: PintaMemoryAsset | null = null
      if (
        raw &&
        typeof raw === 'object' &&
        'schema' in raw &&
        raw.schema === VERSION &&
        'kind' in raw
      )
        asset =
          raw.kind === 'tilemap'
            ? sanitizeRegionTilemapAsset(raw)
            : raw.kind === 'map-set'
              ? sanitizeRegionMapSetAsset(raw)
              : null
      else asset = sanitizePintaAsset(raw)
      if (!asset)
        return refuse(
          'Não consegui conferir todos os desenhos. O backup foi mantido inteiro para recuperação.',
        )
      assets.push(asset)
    }
    return { assets, warnings: [] }
  } catch {
    return refuse('O arquivo não é um backup regional válido. Seus dados foram mantidos.')
  }
}
