import {
  effectiveLayer,
  isObjectLayer,
  isTilesetKind,
  PINTA_LIMITS,
  type PintaAsset,
  type RegionMapSetAsset,
  type TilemapObject,
} from '../core/project'
import type { AuthorMap } from './mapCellEdits'
import { mapCellBounds } from './mapCells'
import { addMapObject, createMapObject, createRegionMapObject } from './mapObjects'

/** Posição única para clique, arrasto e prévia; coordenadas locais à camada. */
export function libraryPlacement(
  map: AuthorMap,
  layerId: string,
  asset: PintaAsset | RegionMapSetAsset,
  tileSize: number,
  target: { x: number; y: number },
  snap: boolean,
): { object: TilemapObject; offsetX: number; offsetY: number } | null {
  if (![tileSize, target.x, target.y].every(Number.isFinite) || tileSize <= 0) return null
  const layer = map.layers.find((l) => l.id === layerId)
  if (!layer || !isObjectLayer(layer) || asset.kind === 'tilemap') return null
  const offset = effectiveLayer(map, layer)
  if (offset.locked || layer.objects.length >= PINTA_LIMITS.maxTilemapObjects) return null
  const width =
    asset.kind === 'map-set'
      ? asset.map.cols * tileSize
      : 'frameWidth' in asset
        ? asset.frameWidth
        : 'width' in asset
          ? asset.width
          : isTilesetKind(asset)
            ? asset.tileSize
            : tileSize
  const height =
    asset.kind === 'map-set'
      ? asset.map.rows * tileSize
      : 'frameHeight' in asset
        ? asset.frameHeight
        : 'height' in asset
          ? asset.height
          : isTilesetKind(asset)
            ? asset.tileSize
            : tileSize
  const bounds = mapCellBounds(map),
    signed = 'origin' in map
  const cell = (
    value: number,
    size: number,
    cells: number,
    start: number,
    shift: number,
  ): number => {
    const local = value - shift - size / 2
    const min = signed ? start * tileSize - shift : 0
    return Math.max(
      min,
      Math.min(
        Math.max(min, (start + cells) * tileSize - size - shift),
        snap ? Math.round(local / tileSize) * tileSize : signed ? local : Math.round(local),
      ),
    )
  }
  const object = (signed ? createRegionMapObject : createMapObject)({
    name: asset.name,
    ...(asset.kind === 'map-set'
      ? { shape: 'set', setId: asset.id }
      : {
          shape: 'art',
          art: { assetId: asset.id, ...(isTilesetKind(asset) ? { tile: 0 } : {}) },
        }),
    x: cell(target.x, width, map.cols, bounds.col, offset.offsetX),
    y: cell(target.y, height, map.rows, bounds.row, offset.offsetY),
    width,
    height,
  })
  return object
    ? {
        object,
        offsetX: offset.offsetX,
        offsetY: offset.offsetY,
      }
    : null
}

/** A mesma guarda de bloqueio e orçamento do editor, reavaliada na soltura. */
export function placeLibraryObject<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  object: TilemapObject,
): Map {
  return addMapObject(map, layerId, object)
}
