import { createPintaProjectionGeometry } from '@sistemazero/core/creations'
import type { PintaProjectedScene } from '@sistemazero/core/studio/pinta-projected-scene'
import type { PintaWorkshopAsset } from '../core/assetMemory'
import type { WorkshopProjectedMap } from '../core/projectedDocument'
import { exportPintaProjectedScene } from './projectedScene'
import { drawScene, loadSceneImages } from './sceneDrawing'

/** Bounded output surface, shared by the gallery and Studio picker. No full-world raster. */
export function paintProjectedThumbnail(
  canvas: HTMLCanvasElement,
  scene: PintaProjectedScene,
  images: ReadonlyMap<string, CanvasImageSource>,
  side = 192,
): boolean {
  if (!Number.isInteger(side) || side < 1 || side > 256) return false
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const bounds = createPintaProjectionGeometry(scene.projection).worldBounds({
    ...scene.origin,
    cols: scene.cols,
    rows: scene.rows,
  })
  const scale = Math.min(side / bounds.width, side / bounds.height)
  canvas.width = canvas.height = side
  ctx.save()
  ctx.translate((side - bounds.width * scale) / 2, (side - bounds.height * scale) / 2)
  ctx.scale(scale, scale)
  ctx.translate(-bounds.x, -bounds.y)
  ctx.imageSmoothingEnabled = false
  drawScene(ctx, scene, images, 'back')
  drawScene(ctx, scene, images, 'front')
  ctx.restore()
  return true
}

export async function projectedMapThumbnail(
  asset: WorkshopProjectedMap,
  find: (id: string) => PintaWorkshopAsset | null,
  side = 128,
): Promise<string | null> {
  if (typeof document === 'undefined') return null
  const { scene } = await exportPintaProjectedScene(asset, find)
  const images = await loadSceneImages(scene)
  const canvas = document.createElement('canvas')
  return paintProjectedThumbnail(canvas, scene, images, side) ? canvas.toDataURL('image/png') : null
}
