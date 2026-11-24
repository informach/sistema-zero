import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  effectiveLayer,
  isGroupLayer,
  isObjectLayer,
  layerAncestors,
  type MapSetAsset,
  PINTA_LIMITS,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
  type TilemapAsset,
} from '../core/project'
import type { AuthorMap } from './mapCellEdits'
import { objectBounds } from './objectGeometry'
import { createMapSet, MapSetCaptureError } from './sets'

/** Guarda o objeto inteiro, inclusive sua caixa girada, no contrato de conjunto existente. */
export function createObjectTemplate(
  map: RegionTilemapAsset,
  layerId: string,
  objectId: string,
  tileSize: number,
  name: string,
): RegionMapSetAsset | null
export function createObjectTemplate(
  map: TilemapAsset,
  layerId: string,
  objectId: string,
  tileSize: number,
  name: string,
): MapSetAsset | null
export function createObjectTemplate(
  map: AuthorMap,
  layerId: string,
  objectId: string,
  tileSize: number,
  name: string,
): MapSetAsset | RegionMapSetAsset | null {
  const layer = map.layers.find((l) => l.id === layerId)
  if (!layer || !isObjectLayer(layer) || !Number.isFinite(tileSize) || tileSize <= 0) return null
  const object = layer.objects.find((o) => o.id === objectId)
  if (!object || object.setId || object.shape === 'set') return null
  const offset = effectiveLayer(map, layer),
    box = objectBounds(object)
  const anchorX = object.x + offset.offsetX,
    anchorY = object.y + offset.offsetY
  const col = Math.floor((Math.min(box.x + offset.offsetX, anchorX) + 1e-7) / tileSize)
  const row = Math.floor((Math.min(box.y + offset.offsetY, anchorY) + 1e-7) / tileSize)
  // O recorte comum inclui objetos pela âncora: ela precisa ficar estritamente dentro,
  // inclusive quando o giro a põe na borda direita/inferior da caixa visual.
  const cols = Math.max(
    1,
    Math.ceil((box.x + box.width + offset.offsetX - 1e-7) / tileSize) - col,
    Math.floor(anchorX / tileSize) + 1 - col,
  )
  const rows = Math.max(
    1,
    Math.ceil((box.y + box.height + offset.offsetY - 1e-7) / tileSize) - row,
    Math.floor(anchorY / tileSize) + 1 - row,
  )
  if (cols > PINTA_LIMITS.maxTilemapCols || rows > PINTA_LIMITS.maxTilemapRows) return null
  const ancestors = new Set(layerAncestors(map, layer).map((group) => group.id))
  const context = [
    ...map.layers.filter(isGroupLayer).filter((group) => ancestors.has(group.id)),
    { ...layer, objects: [object] },
  ]
  // Only the selected object's ancestry and a neutral base enter the template.
  const base = { id: newId(), name: COPY.scene.base, visible: true },
    rect = { col, row, cols, rows }
  try {
    if ('origin' in map)
      return createMapSet(
        {
          ...map,
          layers: [
            { ...base, cells: { kind: 'regions', version: 1, side: 32, chunks: [] } },
            ...context,
          ],
        },
        rect,
        tileSize,
        name,
      )
    return createMapSet(
      {
        ...map,
        layers: [{ ...base, cells: new Int16Array(map.cols * map.rows).fill(-1) }, ...context],
      },
      rect,
      tileSize,
      name,
    )
  } catch (error) {
    if (error instanceof MapSetCaptureError) return null
    throw error
  }
}
