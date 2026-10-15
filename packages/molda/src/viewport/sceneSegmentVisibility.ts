import { type Box3, type Matrix4, type Vector3, Vector4 } from 'three'

export type Interval = [number, number]

/** Clip in homogeneous space before dividing by w, including triangles across the eye plane. */
export function clipCameraPolygon(points: Vector4[]): Vector4[] {
  for (const distance of [(p: Vector4) => p.w + p.z, (p: Vector4) => p.w - p.z]) {
    const next: Vector4[] = []
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!,
        b = points[(i + 1) % points.length]!
      const da = distance(a),
        db = distance(b)
      if (da >= 0) next.push(a)
      if (da < 0 !== db < 0) next.push(a.clone().lerp(b, da / (da - db)))
    }
    points = next
  }
  return points.filter((p) => p.w > 0)
}

/** The interval of a projected segment behind a projected triangle, with surface tolerance. */
export function triangleOcclusion(
  a: Vector3,
  b: Vector3,
  triangle: readonly Vector3[],
): Interval | null {
  const [p, q, r] = triangle as readonly [Vector3, Vector3, Vector3]
  const normal = q.clone().sub(p).cross(r.clone().sub(p))
  if (Math.abs(normal.z) < 1e-15) return null
  let lo = 0,
    hi = 1
  const clip = (atA: number, atB: number) => {
    if (atA < 0 && atB < 0) return false
    if (atA < 0 !== atB < 0) {
      const t = atA / (atA - atB)
      if (atA < 0) lo = Math.max(lo, t)
      else hi = Math.min(hi, t)
    }
    return hi > lo
  }
  const sign = Math.sign(normal.z)
  for (let i = 0; i < 3; i++) {
    const u = triangle[i]!,
      v = triangle[(i + 1) % 3]!
    const side = (point: Vector3) =>
      sign * ((v.x - u.x) * (point.y - u.y) - (v.y - u.y) * (point.x - u.x))
    if (!clip(side(a), side(b))) return null
  }
  const behind = (point: Vector3) => normal.dot(point.clone().sub(p)) / normal.z - 1e-7
  return clip(behind(a), behind(b)) ? [lo, hi] : null
}

export function subtractOcclusion(intervals: readonly Interval[], blocked: Interval): Interval[] {
  return intervals.flatMap(([a, b]) => {
    const lo = Math.max(a, blocked[0]),
      hi = Math.min(b, blocked[1])
    if (lo >= hi) return [[a, b] as Interval]
    const result: Interval[] = []
    if (lo > a) result.push([a, lo])
    if (hi < b) result.push([hi, b])
    return result
  })
}

/** Conservative BVH pruning; boxes crossing the camera plane are always traversed. */
export function projectedBoxOverlaps(
  box: Box3,
  projection: Matrix4,
  a: Vector3,
  b: Vector3,
): boolean {
  let left = Infinity,
    right = -Infinity,
    bottom = Infinity,
    top = -Infinity
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const p = new Vector4(x, y, z, 1).applyMatrix4(projection)
        if (p.w <= 0 || p.z < -p.w) return true
        left = Math.min(left, p.x / p.w)
        right = Math.max(right, p.x / p.w)
        bottom = Math.min(bottom, p.y / p.w)
        top = Math.max(top, p.y / p.w)
      }
  return (
    left <= Math.max(a.x, b.x) &&
    right >= Math.min(a.x, b.x) &&
    bottom <= Math.max(a.y, b.y) &&
    top >= Math.min(a.y, b.y)
  )
}
