import type { TilemapObject } from '../core/project'
export interface ObjectBounds {
  x: number
  y: number
  width: number
  height: number
}
export function objectLocalPoint(o: TilemapObject, x: number, y: number): { x: number; y: number } {
  const a = (-(o.rotation ?? 0) * Math.PI) / 180,
    dx = x - o.x,
    dy = y - o.y
  let px = dx * Math.cos(a) - dy * Math.sin(a),
    py = dx * Math.sin(a) + dy * Math.cos(a)
  if (o.flipX) px = o.width - px
  if (o.flipY) py = o.height - py
  return { x: px, y: py }
}
export function objectBounds(o: TilemapObject): ObjectBounds {
  const points = o.points?.length
      ? o.points
      : [
          { x: 0, y: 0 },
          { x: o.width, y: 0 },
          { x: o.width, y: o.height },
          { x: 0, y: o.height },
        ],
    a = ((o.rotation ?? 0) * Math.PI) / 180
  const world = points.map((p) => ({
    x:
      o.x +
      (o.flipX ? o.width - p.x : p.x) * Math.cos(a) -
      (o.flipY ? o.height - p.y : p.y) * Math.sin(a),
    y:
      o.y +
      (o.flipX ? o.width - p.x : p.x) * Math.sin(a) +
      (o.flipY ? o.height - p.y : p.y) * Math.cos(a),
  }))
  const x = Math.min(...world.map((p) => p.x)),
    y = Math.min(...world.map((p) => p.y))
  return {
    x,
    y,
    width: Math.max(...world.map((p) => p.x)) - x,
    height: Math.max(...world.map((p) => p.y)) - y,
  }
}
export function objectContains(o: TilemapObject, x: number, y: number, slack = 0): boolean {
  const p = objectLocalPoint(o, x, y)
  if (o.shape === 'point' || (!o.shape && !o.width && !o.height))
    return Math.hypot(p.x, p.y) <= Math.max(1, slack)
  if (o.shape === 'ellipse')
    return (
      ((p.x - o.width / 2) / Math.max(0.001, o.width / 2 + slack)) ** 2 +
        ((p.y - o.height / 2) / Math.max(0.001, o.height / 2 + slack)) ** 2 <=
      1
    )
  const pts = o.points
  if ((o.shape === 'polygon' || o.shape === 'polyline') && pts?.length) {
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i]!,
        b = pts[j]!
      if (
        o.shape !== 'polyline' &&
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside
      if (o.shape === 'polyline' && i === 0) continue
      const dx = b.x - a.x,
        dy = b.y - a.y,
        t = Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
        )
      if (Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) <= Math.max(slack, 1)) return true
    }
    return inside
  }
  return p.x >= -slack && p.y >= -slack && p.x <= o.width + slack && p.y <= o.height + slack
}
