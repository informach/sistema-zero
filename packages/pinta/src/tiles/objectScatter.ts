import {
  effectiveLayer,
  isObjectLayer,
  PINTA_LIMITS,
  type TilemapAsset,
  type TilemapObject,
} from '../core/project'
import type { CellPos } from './cellGeometry'
import { addMapObjects, createMapObject } from './mapObjects'
import { objectBounds } from './objectGeometry'
import { cloneObjects } from './objectSelection'
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
export interface ObjectScatterResult {
  map: TilemapAsset
  addedIds: string[]
  overflow: boolean
}
type Center = { x: number; y: number }

/** O mesmo conjunto de amostras e semente gera a mesma composição e a mesma prévia. */
export function scatterMapObjects(
  map: TilemapAsset,
  layerId: string,
  template: TilemapObject,
  tileSize: number,
  positions: readonly CellPos[],
  settings: ObjectScatterSettings,
  gestureId: string,
): ObjectScatterResult {
  const unchanged = (overflow = false): ObjectScatterResult => ({ map, addedIds: [], overflow })
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
      Number.isInteger(col) &&
      Number.isInteger(row) &&
      col >= 0 &&
      row >= 0 &&
      col < map.cols &&
      row < map.rows
    )
      samples.add(row * map.cols + col)
  const additions: TilemapObject[] = []
  for (const key of [...samples].sort((a, b) => a - b)) {
    const col = key % map.cols,
      row = Math.floor(key / map.cols)
    if (seededChoice(seed, col, row) >= density) continue
    const turn = settings.rotate ? 90 * Math.floor(seededChoice(seed + 1009, col, row) * 4) : 0
    const variant = createMapObject({
      ...template,
      rotation: (template.rotation ?? 0) + turn,
      flipX:
        !!template.flipX !== (settings.mirror && seededChoice(seed + 2017, col, row) < 0.5) ||
        undefined,
      flipY:
        !!template.flipY !== (settings.mirror && seededChoice(seed + 3037, col, row) < 0.5) ||
        undefined,
    })
    const box = objectBounds(variant)
    const x = (col + 0.5) * tileSize - offset.offsetX,
      y = (row + 0.5) * tileSize - offset.offsetY
    const dx = Math.round(x - box.x - box.width / 2),
      dy = Math.round(y - box.y - box.height / 2)
    // Não deixar o clamp da clonagem deslocar silenciosamente o centro para outra amostra.
    if (variant.x + dx < 0 || variant.y + dy < 0) continue
    const object = cloneObjects(
      [variant],
      dx,
      dy,
      (_source, index) => `${gestureId}:${key}:${index}`,
    )[0]!
    const b = objectBounds(object)
    const world = { x: b.x + offset.offsetX, y: b.y + offset.offsetY }
    if (
      world.x < -1e-7 ||
      world.y < -1e-7 ||
      world.x + b.width > map.cols * tileSize + 1e-7 ||
      world.y + b.height > map.rows * tileSize + 1e-7
    )
      continue
    const center = { x: world.x + b.width / 2, y: world.y + b.height / 2 }
    if (near(center)) continue
    if (layer.objects.length + additions.length >= PINTA_LIMITS.maxTilemapObjects)
      return unchanged(true)
    register(center)
    additions.push(object)
  }
  if (!additions.length) return unchanged()
  const result = addMapObjects(map, layerId, additions)
  return result === map
    ? unchanged()
    : { map: result, addedIds: additions.map((o) => o.id), overflow: false }
}
