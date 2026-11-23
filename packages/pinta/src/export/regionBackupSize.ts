import {
  encodePintaRegionLayers,
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
  type PintaRegionBounds,
  type PintaRegionCells,
} from '@sistemazero/core/creations'
import { isWorkshopProjectedMap, type PintaWorkshopAsset } from '../core/assetMemory'
import { decodedBitmapByteLength } from '../core/bitmapCodec'
import { JsonByteSizeCache } from '../core/jsonBytes'
import { REGION_METADATA_BUDGET } from '../core/mapDocumentBoundary'
import {
  isTileLayer,
  type PintaAsset,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
} from '../core/project'
import { PINTA_MAP_FORMAT_LIMITS, PINTA_MAX_SCHEMA } from '../core/projectConfig'
import type { WorkshopProjectedMap } from '../core/projectedDocument'
import { cellTile } from '../tiles/cell'
import { encodePintaBackupAsset, MAX_BACKUP_FILE_BYTES, pintaBackupContainer } from './projectJson'
import { admitsRegionBackupBuffers, REGION_BACKUP_VERSION } from './regionBackup'
import { encodeWorkshopProjectedMap } from './workshopProjection'

function regional(asset: PintaWorkshopAsset): asset is RegionTilemapAsset | RegionMapSetAsset {
  if (isWorkshopProjectedMap(asset)) return false
  return (
    (asset.kind === 'tilemap' && asset.schema === REGION_BACKUP_VERSION && 'origin' in asset) ||
    (asset.kind === 'map-set' && asset.schema === REGION_BACKUP_VERSION && 'origin' in asset.map)
  )
}

function bitmapBytes(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null
  const data = Object.getOwnPropertyDescriptor(raw, 'data')?.value
  if (!(data instanceof Uint8Array)) return null
  const size = decodedBitmapByteLength({
    width: Object.getOwnPropertyDescriptor(raw, 'width')?.value,
    height: Object.getOwnPropertyDescriptor(raw, 'height')?.value,
    rle: '',
  })
  return size === data.byteLength ? size : null
}

type Chunk = PintaRegionCells['chunks'][number]

/** Per-editor numerical sizing of canonical, immutable authorial revisions.
 * IO/core operations own semantic validation. This is not a decoder for raw input.
 * Roles retain only their weak key and numeric bounds, never entire map/history roots.
 */
export class RegionBackupSizeCache {
  private readonly legacy = new WeakMap<object, PintaAsset>()
  /** A projected map is measured as the exact native-9 envelope its gallery entry writes. */
  private readonly projected = new WeakMap<object, WorkshopProjectedMap>()
  private readonly grids = new WeakMap<
    object,
    { grid: PintaRegionCells; bounds: PintaRegionBounds }
  >()
  private readonly chunks = new WeakMap<object, { chunk: Chunk; bounds: PintaRegionBounds }>()
  private readonly sizes = new JsonByteSizeCache(REGION_METADATA_BUDGET.maxDepth + 2, (value) =>
    this.serialize(value),
  )

  private serialize(value: object): object {
    const asset = this.legacy.get(value)
    if (asset) return encodePintaBackupAsset(asset)
    const projected = this.projected.get(value)
    if (projected) {
      const entry = encodeWorkshopProjectedMap(projected)
      if (!entry) throw new RangeError('Mapa projetado fora do contrato do Pinta.')
      return entry
    }
    const grid = this.grids.get(value)
    if (grid) {
      // Core defines the actual wire header. Child chunks have their own codec summaries.
      const wire = encodePintaRegionLayers([{ ...grid.grid, chunks: [] }], grid.bounds)?.[0]
      if (!wire) throw new RangeError('Cabeçalho regional inválido.')
      return { ...wire, chunks: grid.grid.chunks }
    }
    const part = this.chunks.get(value)
    if (part) {
      const wire = encodePintaRegionLayers(
        [{ kind: 'regions', version: 1, side: PINTA_REGION_SIDE, chunks: [part.chunk] }],
        part.bounds,
      )?.[0]?.chunks[0]
      if (!wire) throw new RangeError('Chunk regional inválido.')
      // Core checks descriptors and the fixed buffer length before visiting any cell.
      for (let index = 0; index < part.chunk.cells.length; index++)
        if (cellTile(part.chunk.cells[index]!) >= PINTA_MAP_FORMAT_LIMITS.maxTiles)
          throw new RangeError('Peça fora do contrato do Pinta.')
      return wire
    }
    return value
  }

  private bindLegacy(asset: PintaAsset): boolean {
    const schema = 'schema' in asset ? asset.schema : undefined
    if (
      schema !== undefined &&
      (!Number.isSafeInteger(schema) || schema < 0 || schema > PINTA_MAX_SCHEMA)
    )
      return false
    this.legacy.set(asset, asset)
    return true
  }

  /** Whole snapshot/batch size, including every repeated occurrence; Infinity refuses. */
  byteLength(
    assets: readonly PintaWorkshopAsset[],
    envelope?: (assets: readonly PintaWorkshopAsset[]) => unknown,
  ): number {
    try {
      if (!admitsRegionBackupBuffers(assets, bitmapBytes)) return Infinity
      const maps: RegionTilemapAsset[] = []
      for (const asset of assets) {
        if (isWorkshopProjectedMap(asset)) this.projected.set(asset, asset)
        else if (regional(asset)) maps.push(asset.kind === 'tilemap' ? asset : asset.map)
        else {
          if (
            (asset.kind === 'tilemap' || asset.kind === 'map-set') &&
            asset.schema === REGION_BACKUP_VERSION
          )
            return Infinity
          if (!this.bindLegacy(asset)) return Infinity
        }
      }
      // Every map's descriptor budget is admitted before the first payload encoder.
      for (const map of maps) {
        if (map.layers.length > PINTA_REGION_LIMITS.maxLayers) return Infinity
        let chunks = 0
        for (const layer of map.layers) {
          if (!isTileLayer(layer)) continue
          if (!Array.isArray(layer.cells.chunks)) return Infinity
          chunks += layer.cells.chunks.length
          if (chunks > PINTA_REGION_LIMITS.maxChunks) return Infinity
        }
      }
      for (const map of maps) {
        const bounds = { ...map.origin, cols: map.cols, rows: map.rows }
        for (const resource of map.resources ?? []) {
          if (!this.bindLegacy(resource.asset)) return Infinity
        }
        for (const layer of map.layers) {
          if (!isTileLayer(layer)) continue
          this.grids.set(layer.cells, { grid: layer.cells, bounds })
          for (const chunk of layer.cells.chunks) this.chunks.set(chunk, { chunk, bounds })
        }
      }
      return this.sizes.byteLength(
        envelope ? envelope(assets) : pintaBackupContainer(assets, REGION_BACKUP_VERSION),
        MAX_BACKUP_FILE_BYTES,
      )
    } catch {
      return Infinity
    }
  }
}
