import { COPY } from '../core/copy'
import {
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  type MapSetAsset,
  PINTA_LIMITS,
  type TilemapAsset,
} from '../core/project'
import { objectBounds } from './objectGeometry'
import { createMapSet } from './sets'

/** Guarda o objeto inteiro, inclusive sua caixa girada, no contrato de conjunto existente. */
export function createObjectTemplate(
  map: TilemapAsset,
  layerId: string,
  objectId: string,
  tileSize: number,
  name: string,
): MapSetAsset | null {
  const layer = map.layers.find((l) => l.id === layerId)
  if (!layer || !isObjectLayer(layer) || !Number.isFinite(tileSize) || tileSize <= 0) return null
  const object = layer.objects.find((o) => o.id === objectId)
  if (!object || object.setId) return null
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
  const source = {
    ...map,
    layers: map.layers.map((l) =>
      isObjectLayer(l)
        ? { ...l, objects: l.id === layerId ? [object] : [] }
        : isTileLayer(l)
          ? { ...l, cells: new Int16Array(l.cells.length).fill(-1) }
          : l,
    ),
  }
  const set = createMapSet(source, { col, row, cols, rows }, tileSize, name)
  // Modelo de objeto tem base neutra; não herda a colisão/propriedades do chão.
  set.map.layers = [
    {
      id: `${set.id}-base`,
      name: COPY.scene.base,
      visible: true,
      cells: new Int16Array(cols * rows).fill(-1),
    },
    ...set.map.layers.filter((l) => l.kind === 'group' || isObjectLayer(l)),
  ]
  return set
}
