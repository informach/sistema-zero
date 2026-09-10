import type { Texel } from '../paint/skinPaint'
import type { SceneImage, Vec2 } from './document'

/** Clamp UV before multiplying, with canonical row zero at V=0. No epsilon or authorial snapping. */
export function sceneImageTexel(
  image: Pick<SceneImage, 'width' | 'height'>,
  uv: Vec2,
): Texel | null {
  if (!uv.every(Number.isFinite)) return null
  return [
    Math.min(image.width - 1, Math.floor(Math.max(0, Math.min(1, uv[0])) * image.width)),
    Math.min(image.height - 1, Math.floor(Math.max(0, Math.min(1, uv[1])) * image.height)),
  ]
}
