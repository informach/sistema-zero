import {
  assertPintaImageDimensions,
  PINTA_IMAGE_WORLD_LIMITS,
  type PintaImageTargetLimits,
} from '@sistemazero/core/studio/pinta-image'
import { WORLD_BUDGET_MESSAGE } from '@sistemazero/core/studio/pinta-region-image-limits'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { isTileLayer, type PintaAsset, type TilemapAsset } from '../core/project'
import { sceneMapClosure } from '../core/sceneMapClosure'

export { WORLD_BUDGET_MESSAGE } from '@sistemazero/core/studio/pinta-region-image-limits'

/** Counts the actual expanded scene definitions, including a set shared by several maps. */
export function pintaImageSceneCells(scene: PintaScene): number {
  return [scene, ...(scene.sets ?? [])].reduce(
    (sum, part) =>
      sum +
      part.layers.reduce(
        (cells, layer) => cells + (layer.kind === 'tiles' ? layer.cells.length : 0),
        0,
      ),
    0,
  )
}

/** Conservative working set of the native compositor: source set buffer, scale, flip and
 * rotation. Hidden objects count too, so changing visibility cannot bypass admission. */
export function pintaImageSceneTemporaryPixels(
  scene: PintaScene,
  scale: number,
  limits: PintaImageTargetLimits,
): number {
  const area = (width: number, height: number) => {
    const w = Math.max(1, Math.ceil(width)),
      h = Math.max(1, Math.ceil(height))
    try {
      assertPintaImageDimensions(w, h, limits)
    } catch {
      throw new Error(WORLD_BUDGET_MESSAGE)
    }
    return w * h
  }
  let pixels = 0
  for (const part of [scene, ...(scene.sets ?? [])])
    for (const layer of part.layers) {
      if (layer.kind !== 'objects') continue
      for (const object of layer.objects) {
        if (!object.setId && !object.art) continue
        if (!object.setId && (!object.width || !object.height)) continue
        const set = scene.sets?.find((set) => set.id === object.setId)
        if (set)
          pixels += area(set.cols * scene.tileSize * scale, set.rows * scene.tileSize * scale)
        const w = Math.max(1, Math.ceil(object.width * scale)),
          h = Math.max(1, Math.ceil(object.height * scale))
        pixels += 2 * area(w, h)
        const rotation = object.rotation ?? 0
        if (rotation % 360) {
          const a = (rotation * Math.PI) / 180
          const c = Math.abs(Math.cos(a)) < 1e-12 ? 0 : Math.abs(Math.cos(a))
          const s = Math.abs(Math.sin(a)) < 1e-12 ? 0 : Math.abs(Math.sin(a))
          const padding = rotation % 90 ? 2 : 0
          pixels += area(w * c + h * s + padding, w * s + h * c + padding)
        }
        if (pixels > limits.totalImagePixels) throw new Error(WORLD_BUDGET_MESSAGE)
      }
    }
  return pixels
}

/** One bounded native snapshot, shared by world encoding and read-only inspection. */
export function collectPintaImageWorld(root: TilemapAsset, assets: readonly PintaAsset[]) {
  const world = sceneMapClosure(root, assets)
  let cells = 0
  for (const asset of world.assets) {
    const map = asset.kind === 'tilemap' ? asset : asset.kind === 'map-set' ? asset.map : null
    if (!map) continue
    for (const layer of map.layers) if (isTileLayer(layer)) cells += layer.cells.length
    if (cells > PINTA_IMAGE_WORLD_LIMITS.cells) throw new Error(WORLD_BUDGET_MESSAGE)
  }
  return world
}
