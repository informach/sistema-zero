import type { Vec2 } from './document'

export type SceneSelectionRegion =
  | { kind: 'box'; from: Vec2; to: Vec2 }
  | { kind: 'lasso'; points: readonly Vec2[] }

/** Includes the boundary. Self-crossing lassos use an even/odd fill, matching the visible overlay. */
export function pointInSelection(point: Vec2, region: SceneSelectionRegion): boolean {
  if (!point.every(Number.isFinite)) return false
  if (region.kind === 'box')
    return (
      region.from.every(Number.isFinite) &&
      region.to.every(Number.isFinite) &&
      point[0] >= Math.min(region.from[0], region.to[0]) &&
      point[0] <= Math.max(region.from[0], region.to[0]) &&
      point[1] >= Math.min(region.from[1], region.to[1]) &&
      point[1] <= Math.max(region.from[1], region.to[1])
    )
  if (region.points.length < 3 || !region.points.every((corner) => corner.every(Number.isFinite)))
    return false
  let inside = false
  for (let i = 0; i < region.points.length; i++) {
    const a = region.points[i]
    const b = region.points[(i + 1) % region.points.length]
    if (!a || !b) continue
    const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0])
    if (
      Math.abs(cross) <= 1e-12 &&
      point[0] >= Math.min(a[0], b[0]) &&
      point[0] <= Math.max(a[0], b[0]) &&
      point[1] >= Math.min(a[1], b[1]) &&
      point[1] <= Math.max(a[1], b[1])
    )
      return true
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}
