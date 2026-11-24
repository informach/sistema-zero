import { cloneObjectsWithResources } from '../core/mapClone'
import { mergeMapResourceVersions, stampMapResourceVersions } from '../core/mapResourceVersions'
import {
  effectiveLayer,
  isObjectLayer,
  PINTA_LIMITS,
  sanitizeRegionTilemapAsset,
  type TilemapAsset,
  type TilemapObject,
} from '../core/project'
import type { CellPos } from './cellGeometry'
import type { AuthorMap } from './mapCellEdits'
import { addMapObjects, createMapObject, createRegionMapObject } from './mapObjects'
import { objectBounds } from './objectGeometry'
import { REGION_EDIT_LIMIT } from './regionCells'
import { mapResourceVersionsForObjects } from './resourceVersions'
import { seededChoice } from './terrain'

export interface ObjectScatterSettings {
  width: number
  density: number
  /** Distância mínima entre centros, em casas do mapa. Zero desliga o afastamento. */
  spacing: number
  seed: number
  rotate: boolean
  mirror: boolean
}
export const DEFAULT_OBJECT_SCATTER: ObjectScatterSettings = {
  width: 3,
  density: 0.35,
  spacing: 2,
  seed: 17,
  rotate: false,
  mirror: false,
}
export interface ObjectScatterResult<Map extends AuthorMap = TilemapAsset> {
  map: Map
  addedIds: string[]
  overflow: boolean
  reason?: 'work-budget' | 'object-budget' | 'resources' | 'invalid-template'
}
type Center = { x: number; y: number }

/** O mesmo conjunto de amostras e semente gera a mesma composição e a mesma prévia. */
export function scatterMapObjects<Map extends AuthorMap>(
  map: Map,
  layerId: string,
  template: TilemapObject,
  tileSize: number,
  positions: readonly CellPos[],
  settings: ObjectScatterSettings,
  gestureId: string,
): ObjectScatterResult<Map> {
  const unchanged = (reason?: ObjectScatterResult['reason']): ObjectScatterResult<Map> => ({
    map,
    addedIds: [],
    overflow: !!reason,
    ...(reason ? { reason } : {}),
  })
  // Bound input work before deduplication, sorting or constructing any resource graph.
  if (positions.length > REGION_EDIT_LIMIT) return unchanged('work-budget')
  const layer = map.layers.find((l) => l.id === layerId)
  if (
    !layer ||
    !isObjectLayer(layer) ||
    (!template.art && !template.setId) ||
    !Number.isFinite(tileSize) ||
    tileSize <= 0
  )
    return unchanged()
  const offset = effectiveLayer(map, layer)
  if (offset.locked) return unchanged()
  const density = Number.isFinite(settings.density) ? Math.max(0, Math.min(1, settings.density)) : 0
  if (density === 0) return unchanged()
  const signed = 'origin' in map,
    origin = signed ? map.origin : { col: 0, row: 0 },
    left = origin.col * tileSize,
    top = origin.row * tileSize,
    right = (origin.col + map.cols) * tileSize,
    bottom = (origin.row + map.rows) * tileSize
  const needed = mapResourceVersionsForObjects(map, [template])
  let resources = map.resources ?? []
  if (signed) {
    const stamped = stampMapResourceVersions(map)
    if (!stamped) return unchanged('resources')
    resources = stamped
  }
  const sourceResources = needed.map(
    (version) => resources.find((v) => v.asset.id === version.asset.id) ?? version,
  )
  // Asset IDs cannot contain the storage separator; generated references must fit properties.
  if (sourceResources.length && (!gestureId || gestureId.length > 120 || gestureId.includes(':')))
    return unchanged('invalid-template')
  const spacing =
    (Number.isFinite(settings.spacing)
      ? Math.max(0, settings.spacing)
      : DEFAULT_OBJECT_SCATTER.spacing) * tileSize
  const bucketSize = Math.max(1, spacing)
  const seed = Number.isFinite(settings.seed)
    ? Math.trunc(settings.seed)
    : DEFAULT_OBJECT_SCATTER.seed
  const centers = new Map<string, Center[]>()
  function register(center: Center): void {
    const key = `${Math.floor(center.x / bucketSize)}:${Math.floor(center.y / bucketSize)}`
    const bucket = centers.get(key)
    if (bucket) bucket.push(center)
    else centers.set(key, [center])
  }
  function near(center: Center): boolean {
    if (spacing === 0) return false
    const x = Math.floor(center.x / bucketSize),
      y = Math.floor(center.y / bucketSize)
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (
          centers
            .get(`${x + dx}:${y + dy}`)
            ?.some((other) => Math.hypot(center.x - other.x, center.y - other.y) < spacing - 1e-7)
        )
          return true
    return false
  }
  for (const object of layer.objects)
    if (object.art || object.setId) {
      const b = objectBounds(object)
      register({ x: b.x + b.width / 2 + offset.offsetX, y: b.y + b.height / 2 + offset.offsetY })
    }
  const samples = new Set<number>()
  for (const { col, row } of positions)
    if (
      Number.isSafeInteger(col) &&
      Number.isSafeInteger(row) &&
      col >= origin.col &&
      row >= origin.row &&
      col < origin.col + map.cols &&
      row < origin.row + map.rows
    )
      samples.add((row - origin.row) * map.cols + col - origin.col)
  const additions: TilemapObject[] = []
  for (const key of [...samples].sort((a, b) => a - b)) {
    const col = (key % map.cols) + origin.col,
      row = Math.floor(key / map.cols) + origin.row
    if (seededChoice(seed, col, row) >= density) continue
    const turn = settings.rotate ? 90 * Math.floor(seededChoice(seed + 1009, col, row) * 4) : 0
    const input = {
      ...template,
      rotation: ((((template.rotation ?? 0) + turn) % 360) + 360) % 360,
      flipX:
        !!template.flipX !== (settings.mirror && seededChoice(seed + 2017, col, row) < 0.5) ||
        undefined,
      flipY:
        !!template.flipY !== (settings.mirror && seededChoice(seed + 3037, col, row) < 0.5) ||
        undefined,
    }
    const variant = signed ? createRegionMapObject(input) : createMapObject(input)
    if (!variant) return unchanged('invalid-template')
    const box = objectBounds(variant)
    const x = (col + 0.5) * tileSize - offset.offsetX,
      y = (row + 0.5) * tileSize - offset.offsetY
    const moveX = x - box.x - box.width / 2,
      moveY = y - box.y - box.height / 2,
      dx = signed ? moveX : Math.round(moveX),
      dy = signed ? moveY : Math.round(moveY)
    // Não deixar o clamp da clonagem deslocar silenciosamente o centro para outra amostra.
    if (!signed && (variant.x + dx < 0 || variant.y + dy < 0)) continue
    const positioned = { ...variant, x: variant.x + dx, y: variant.y + dy }
    const b = objectBounds(positioned)
    const world = { x: b.x + offset.offsetX, y: b.y + offset.offsetY }
    if (
      world.x < left - 1e-7 ||
      world.y < top - 1e-7 ||
      world.x + b.width > right + 1e-7 ||
      world.y + b.height > bottom + 1e-7
    )
      continue
    const center = { x: world.x + b.width / 2, y: world.y + b.height / 2 }
    if (near(center)) continue
    if (layer.objects.length + additions.length >= PINTA_LIMITS.maxTilemapObjects)
      return unchanged('object-budget')
    const graph = cloneObjectsWithResources(
      [positioned],
      sourceResources,
      (_source, index) => `${gestureId}:${key}:${index}`,
      (_source, index) => `${gestureId}-${key}-resource-${index}`,
    )
    const merged = mergeMapResourceVersions(resources, graph.resources)
    if (!merged) return unchanged('resources')
    resources = merged
    register(center)
    additions.push(graph.objects[0]!)
  }
  if (!additions.length) return unchanged()
  const result = addMapObjects(map, layerId, additions)
  if (result === map) return unchanged('invalid-template')
  const candidate = resources.length ? { ...result, resources } : result
  if ('origin' in candidate && !sanitizeRegionTilemapAsset(candidate))
    return unchanged('invalid-template')
  return { map: candidate, addedIds: additions.map((o) => o.id), overflow: false }
}
