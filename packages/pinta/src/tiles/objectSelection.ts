import { newId } from '../core/id'
import {
  effectiveLayer,
  isObjectLayer,
  PINTA_LIMITS,
  type TilemapAsset,
  type TilemapObject,
} from '../core/project'
import { updateMapObject } from './mapObjects'
import { objectBounds } from './objectGeometry'
export function cloneObjects(objects: readonly TilemapObject[], dx = 16, dy = 16): TilemapObject[] {
  const ids = new Map(objects.map((o) => [o.id, newId()]))
  return objects.map((o) => ({
    ...structuredClone(o),
    id: ids.get(o.id)!,
    x: Math.max(0, o.x + dx),
    y: Math.max(0, o.y + dy),
    properties: Object.fromEntries(
      Object.entries(o.properties).map(([k, v]) => [
        k,
        typeof v === 'object' && v.type === 'object'
          ? { ...v, value: ids.get(String(v.value)) ?? v.value }
          : v,
      ]),
    ),
  }))
}
/** Quanto deslocar os objetos copiados para o MEIO do grupo cair em `target` (sem sair do mapa). */
export function pasteOffset(
  objects: readonly TilemapObject[],
  target: { x: number; y: number },
): [number, number] {
  if (!objects.length) return [0, 0]
  const boxes = objects.map(objectBounds)
  const minX = Math.min(...boxes.map((b) => b.x)),
    minY = Math.min(...boxes.map((b) => b.y)),
    maxX = Math.max(...boxes.map((b) => b.x + b.width)),
    maxY = Math.max(...boxes.map((b) => b.y + b.height))
  // Nenhum objeto pode passar de zero: o `cloneObjects` prenderia só ele e desmontaria o grupo.
  return [
    Math.max(-minX, Math.round(target.x - (minX + maxX) / 2)),
    Math.max(-minY, Math.round(target.y - (minY + maxY) / 2)),
  ]
}
export function pasteObjects(
  map: TilemapAsset,
  layerId: string,
  objects: readonly TilemapObject[],
  dx = 16,
  dy = 16,
): TilemapAsset {
  const l = map.layers.find((l) => l.id === layerId)
  if (
    !l ||
    !isObjectLayer(l) ||
    effectiveLayer(map, l).locked ||
    l.objects.length + objects.length > PINTA_LIMITS.maxTilemapObjects
  )
    return map
  const pasted = cloneObjects(objects, dx, dy)
  return {
    ...map,
    layers: map.layers.map((layer) =>
      layer === l ? { ...l, objects: [...l.objects, ...pasted] } : layer,
    ),
  }
}
export type ObjectArrange =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'centerX'
  | 'centerY'
  | 'distributeX'
  | 'distributeY'
export function arrangeObjects(
  map: TilemapAsset,
  layerId: string,
  ids: readonly string[],
  action: ObjectArrange,
): TilemapAsset {
  const l = map.layers.find((l) => l.id === layerId)
  if (!l || !isObjectLayer(l) || effectiveLayer(map, l).locked) return map
  const selected = l.objects
    .filter((o) => ids.includes(o.id))
    .map((o) => ({ o, b: objectBounds(o) }))
  if (selected.length < 2 || (action.startsWith('distribute') && selected.length < 3)) return map
  const minX = Math.min(...selected.map((s) => s.b.x)),
    maxX = Math.max(...selected.map((s) => s.b.x + s.b.width)),
    minY = Math.min(...selected.map((s) => s.b.y)),
    maxY = Math.max(...selected.map((s) => s.b.y + s.b.height))
  const horizontal = action === 'distributeX',
    sorted = [...selected].sort((a, b) => (horizontal ? a.b.x - b.b.x : a.b.y - b.b.y))
  let result = map
  for (const { o, b } of selected) {
    const index = sorted.findIndex((s) => s.o.id === o.id)
    const dx =
      action === 'left'
        ? minX - b.x
        : action === 'right'
          ? maxX - b.x - b.width
          : action === 'centerX'
            ? (minX + maxX) / 2 - b.x - b.width / 2
            : horizontal
              ? sorted[0]!.b.x +
                ((sorted.at(-1)!.b.x - sorted[0]!.b.x) * index) / (sorted.length - 1) -
                b.x
              : 0
    const dy =
      action === 'top'
        ? minY - b.y
        : action === 'bottom'
          ? maxY - b.y - b.height
          : action === 'centerY'
            ? (minY + maxY) / 2 - b.y - b.height / 2
            : action === 'distributeY'
              ? sorted[0]!.b.y +
                ((sorted.at(-1)!.b.y - sorted[0]!.b.y) * index) / (sorted.length - 1) -
                b.y
              : 0
    result = updateMapObject(result, layerId, o.id, { x: o.x + dx, y: o.y + dy })
  }
  return result
}
