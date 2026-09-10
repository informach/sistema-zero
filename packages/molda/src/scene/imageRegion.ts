import type { Texel } from '../paint/skinPaint'
import type { ScenePixelRegion } from './composite'
import type { SceneImage } from './document'
import * as v from './validation'

export function readImagePoint(raw: unknown, image: Pick<SceneImage, 'width' | 'height'>): Texel {
  const point = v.tuple(raw, 2, 'point') as Texel
  v.number(point[0], 'point.x', 0, image.width - 1, true)
  v.number(point[1], 'point.y', 0, image.height - 1, true)
  return point
}
export function imagePointRegion(from: Texel, to: Texel): ScenePixelRegion {
  return {
    x0: Math.min(from[0], to[0]),
    y0: Math.min(from[1], to[1]),
    x1: Math.max(from[0], to[0]),
    y1: Math.max(from[1], to[1]),
  }
}
export function readImageRegion(
  raw: unknown,
  image: Pick<SceneImage, 'width' | 'height'>,
): ScenePixelRegion {
  const row = v.record(raw, 'region', ['x0', 'y0', 'x1', 'y1'])
  const from = readImagePoint([row.x0, row.y0], image),
    to = readImagePoint([row.x1, row.y1], image)
  v.requireScene(
    from[0] <= to[0] && from[1] <= to[1],
    'region',
    'Escolha uma área válida da imagem.',
  )
  return { x0: from[0], y0: from[1], x1: to[0], y1: to[1] }
}
export function imageRegionContains(region: ScenePixelRegion | undefined, x: number, y: number) {
  return !region || (x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1)
}

export function intersectImageRegions(
  first: ScenePixelRegion,
  second: ScenePixelRegion,
): ScenePixelRegion | null {
  const x0 = Math.max(first.x0, second.x0),
    y0 = Math.max(first.y0, second.y0)
  const x1 = Math.min(first.x1, second.x1),
    y1 = Math.min(first.y1, second.y1)
  return x0 > x1 || y0 > y1 ? null : { x0, y0, x1, y1 }
}
