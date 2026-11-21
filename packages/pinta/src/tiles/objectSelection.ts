import { newId } from '../core/id'
import { cloneObjectsWithResources } from '../core/mapClone'
import { sameMapDocumentMetadata } from '../core/mapDocumentBoundary'
import { mergeMapResourceVersions, stampMapResourceVersions } from '../core/mapResourceVersions'
import {
  effectiveLayer,
  isObjectLayer,
  PINTA_LIMITS,
  sanitizeRegionTilemapAsset,
  type TilemapObject,
  type TilemapResourceVersion,
} from '../core/project'
import type { AuthorMap } from './mapCellEdits'
import { addMapObjects, createMapObject, type MapObjectPatch, updateMapObjects } from './mapObjects'
import { objectBounds } from './objectGeometry'
import { mapResourceVersionsForObjects } from './resourceVersions'
export type ObjectCoordinates = 'legacy' | 'signed'
export function cloneObjects(
  objects: readonly TilemapObject[],
  dx = 16,
  dy = 16,
  idFor: (sourceId: string, index: number) => string = newId,
  coordinates: ObjectCoordinates = 'legacy',
): TilemapObject[] {
  return cloneObjectsWithResources(objects, [], idFor).objects.map((o) => ({
    ...o,
    x: coordinates === 'signed' ? o.x + dx : Math.max(0, o.x + dx),
    y: coordinates === 'signed' ? o.y + dy : Math.max(0, o.y + dy),
  }))
}
/** Quanto deslocar os objetos copiados para o MEIO do grupo cair em `target` (sem sair do mapa). */
export function pasteOffset(
  objects: readonly TilemapObject[],
  target: { x: number; y: number },
  coordinates: ObjectCoordinates = 'legacy',
): [number, number] {
  if (!objects.length) return [0, 0]
  const boxes = objects.map(objectBounds)
  const minX = Math.min(...boxes.map((b) => b.x)),
    minY = Math.min(...boxes.map((b) => b.y)),
    maxX = Math.max(...boxes.map((b) => b.x + b.width)),
    maxY = Math.max(...boxes.map((b) => b.y + b.height))
  if (coordinates === 'signed') return [target.x - (minX + maxX) / 2, target.y - (minY + maxY) / 2]
  // Nenhum objeto pode passar de zero: o `cloneObjects` prenderia só ele e desmontaria o grupo.
  return [
    Math.max(-minX, Math.round(target.x - (minX + maxX) / 2)),
    Math.max(-minY, Math.round(target.y - (minY + maxY) / 2)),
  ]
}
export function pasteObjects<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  objects: readonly TilemapObject[],
  dx = 16,
  dy = 16,
  resources: readonly TilemapResourceVersion[] = [],
  sourceCoordinates: ObjectCoordinates = 'legacy',
): Map {
  return pasteObjectSelection(map, layerId, objects, dx, dy, resources, sourceCoordinates).map
}

export type ObjectPasteRefusal =
  | 'empty'
  | 'layer'
  | 'locked'
  | 'object-budget'
  | 'invalid-objects'
  | 'resources'
  | 'incompatible-format'
export function pasteObjectSelection<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  objects: readonly TilemapObject[],
  dx = 16,
  dy = 16,
  resources: readonly TilemapResourceVersion[] = [],
  sourceCoordinates: ObjectCoordinates = 'legacy',
): { map: Map; reason?: ObjectPasteRefusal } {
  const unchanged = (reason: ObjectPasteRefusal) => ({ map, reason })
  if (!objects.length) return unchanged('empty')
  const l = map.layers.find((l) => l.id === layerId)
  if (!l || !isObjectLayer(l)) return unchanged('layer')
  if (effectiveLayer(map, l).locked) return unchanged('locked')
  if (l.objects.length + objects.length > PINTA_LIMITS.maxTilemapObjects)
    return unchanged('object-budget')
  if (
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    new Set(objects.map((o) => o.id)).size !== objects.length
  )
    return unchanged('invalid-objects')
  const available = mergeMapResourceVersions(map.resources ?? [], resources)
  if (!available) return unchanged('resources')
  const needed = mapResourceVersionsForObjects({ resources: available }, objects),
    graph = cloneObjectsWithResources(objects, needed)
  const signed = 'origin' in map || sourceCoordinates === 'signed'
  const pasted = graph.objects.map((o) => ({
    ...o,
    x: signed ? o.x + dx : Math.max(0, o.x + dx),
    y: signed ? o.y + dy : Math.max(0, o.y + dy),
  }))
  if (
    sourceCoordinates === 'signed' &&
    !('origin' in map) &&
    pasted.some((o) => !sameMapDocumentMetadata(o, createMapObject(o)))
  )
    return unchanged('incompatible-format')
  const merged = mergeMapResourceVersions(map.resources ?? [], graph.resources)
  if (!merged) return unchanged('resources')
  const result = addMapObjects(map, layerId, pasted)
  if (result === map) return unchanged('invalid-objects')
  const candidate = merged.length ? { ...result, resources: merged } : result
  if ('origin' in candidate) {
    const stamped = stampMapResourceVersions(candidate)
    if (!stamped) return unchanged('resources')
    const prepared = candidate.resources ? { ...candidate, resources: stamped } : candidate
    if (!sanitizeRegionTilemapAsset(prepared)) return unchanged('invalid-objects')
    return { map: prepared }
  }
  return { map: candidate }
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
export function arrangeObjects<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  ids: readonly string[],
  action: ObjectArrange,
): Map {
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
  const patches = new Map<string, MapObjectPatch>()
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
    patches.set(o.id, { x: o.x + dx, y: o.y + dy })
  }
  return updateMapObjects(map, layerId, patches)
}
