import { sha256Hex } from '@sistemazero/core/creations'
import { PINTA_MAP_FORMAT_LIMITS, TILE_SIZES } from '../../core/projectConfig'
import { TiledImportError } from './errors'

export interface TiledAtlasSnapshot {
  version: 1
  count: number
  columns: number
  tileSize: number
  imageDataUrlSha256: string
}

export const atlasCapacity = (count: number, columns: number): number =>
  Math.ceil(count / columns) * columns

export async function atlasSnapshot(
  tileset: { count: number; columns: number; image: string },
  tileSize: number,
): Promise<TiledAtlasSnapshot | null> {
  if (tileset.count % tileset.columns === 0) return null
  return {
    version: 1,
    count: tileset.count,
    columns: tileset.columns,
    tileSize,
    imageDataUrlSha256: await sha256Hex(tileset.image),
  }
}

function metadataJson(raw: unknown, limit: number): unknown {
  if (typeof raw !== 'string' || raw.length > limit)
    throw new TiledImportError('Os dados de origem desta folha não estão válidos.')
  try {
    return JSON.parse(raw)
  } catch {
    throw new TiledImportError('Os dados de origem desta folha não estão completos.')
  }
}

export function readAtlasSnapshot(raw: unknown): TiledAtlasSnapshot | null {
  if (raw === undefined) return null
  const value = metadataJson(raw, 1024)
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TiledImportError('Os dados de origem desta folha não estão válidos.')
  const meta = value as Record<string, unknown>
  if (meta.version !== 1)
    throw new TiledImportError('Esta folha usa uma versão de origem que o Pinta não reconhece.')
  const keys = ['version', 'count', 'columns', 'tileSize', 'imageDataUrlSha256']
  if (
    Object.keys(meta).some((key) => !keys.includes(key)) ||
    !Number.isInteger(meta.count) ||
    Number(meta.count) < 1 ||
    Number(meta.count) > PINTA_MAP_FORMAT_LIMITS.maxTiles ||
    !Number.isInteger(meta.columns) ||
    Number(meta.columns) < 1 ||
    Number(meta.columns) > PINTA_MAP_FORMAT_LIMITS.maxTiles ||
    !(TILE_SIZES as readonly unknown[]).includes(meta.tileSize) ||
    typeof meta.imageDataUrlSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(meta.imageDataUrlSha256)
  )
    throw new TiledImportError('Os dados de origem desta folha não estão válidos.')
  return meta as unknown as TiledAtlasSnapshot
}

export function readEmptyTerrainTiles(raw: unknown, count: number): number[] {
  if (raw === undefined) return []
  const value = metadataJson(raw, 4096)
  if (
    !Array.isArray(value) ||
    value.length > PINTA_MAP_FORMAT_LIMITS.maxTiles ||
    value.some(
      (tile) => !Number.isInteger(tile) || tile < 0 || tile >= PINTA_MAP_FORMAT_LIMITS.maxTiles,
    ) ||
    new Set(value).size !== value.length
  )
    throw new TiledImportError('As regras de origem deste terreno não estão válidas.')
  // A folha pode ter sido recortada no Tiled; não recriar peças removidas pelo autor.
  return value.filter((tile) => tile < count)
}
