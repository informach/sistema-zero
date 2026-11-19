import {
  effectiveLayer,
  isObjectLayer,
  isTilesetKind,
  PINTA_LIMITS,
  type PintaAsset,
  type TilemapAsset,
  type TilemapObject,
} from '../core/project'
import { addMapObject, createMapObject } from './mapObjects'

/** Posição única para clique, arrasto e prévia; coordenadas locais à camada. */
export function libraryPlacement(
  map: TilemapAsset,
  layerId: string,
  asset: PintaAsset,
  tileSize: number,
  target: { x: number; y: number },
  snap: boolean,
): { object: TilemapObject; offsetX: number; offsetY: number } | null {
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
  const cell = (value: number, size: number, cells: number, shift: number): number => {
    const local = value - shift - size / 2
    return Math.max(
      0,
      Math.min(
        Math.max(0, cells * tileSize - size - shift),
        snap ? Math.round(local / tileSize) * tileSize : Math.round(local),
      ),
    )
  }
  return {
    object: createMapObject({
      name: asset.name,
      ...(asset.kind === 'map-set'
        ? { shape: 'set', setId: asset.id }
        : {
            shape: 'art',
            art: { assetId: asset.id, ...(isTilesetKind(asset) ? { tile: 0 } : {}) },
          }),
      x: cell(target.x, width, map.cols, offset.offsetX),
      y: cell(target.y, height, map.rows, offset.offsetY),
      width,
      height,
    }),
    offsetX: offset.offsetX,
    offsetY: offset.offsetY,
  }
}

/** A mesma guarda de bloqueio e orçamento do editor, reavaliada na soltura. */
export function placeLibraryObject(
  map: TilemapAsset,
  layerId: string,
  object: TilemapObject,
): TilemapAsset {
  return addMapObject(map, layerId, object)
}
