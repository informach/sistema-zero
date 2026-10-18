import type { Vec3 } from '../core/model'
import { dot, scale, sub } from '../model/vec'
import type { ScenePathGeometry, ScenePrimitiveGeometry } from './document'
import { type AffineMatrix, transformDirection } from './matrix'
import { parametricMesh } from './parametricGeometry'
import { triangulateFace } from './triangulate'

/** UV tangent stretch in the placed piece, including nonuniform parent transforms. */
export function surfacePixelScale(
  geometry: ScenePrimitiveGeometry | ScenePathGeometry,
  world: Readonly<AffineMatrix>,
) {
  const basis = (
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] satisfies Vec3[]
  ).map((axis) => transformDirection(world, axis))
  const result = new Map<string, [number, number]>()
  if (
    basis.every((axis, i) =>
      basis.every((other, j) => Math.abs(dot(axis, other) - Number(i === j)) < 1e-10),
    )
  )
    return result
  const { mesh, surfaceByFace } = parametricMesh({ ...geometry, surfaces: {} })
  const totals = new Map<string, { u: number; v: number; area: number }>()
  for (const [id, face] of Object.entries(mesh.faces)) {
    const points = face.corners.map((corner) => mesh.vertices[corner.vertexId]!)
    const triangles = triangulateFace(points)
    if (triangles.status !== 'ok') continue
    const key = surfaceByFace.get(id)!
    const total = totals.get(key) ?? { u: 0, v: 0, area: 0 }
    for (const [a, b, c] of triangles.triangles) {
      const auv = face.corners[a]!.uv,
        buv = face.corners[b]!.uv,
        cuv = face.corners[c]!.uv
      const du1 = buv[0] - auv[0],
        dv1 = buv[1] - auv[1],
        du2 = cuv[0] - auv[0],
        dv2 = cuv[1] - auv[1]
      const det = du1 * dv2 - du2 * dv1
      if (Math.abs(det) < 1e-12) continue
      const e1 = sub(points[b]!, points[a]!),
        e2 = sub(points[c]!, points[a]!)
      const u = scale(sub(scale(e1, dv2), scale(e2, dv1)), 1 / det)
      const v = scale(sub(scale(e2, du1), scale(e1, du2)), 1 / det)
      const weight = Math.abs(det)
      total.u += (Math.hypot(...transformDirection(world, u)) / Math.hypot(...u)) * weight
      total.v += (Math.hypot(...transformDirection(world, v)) / Math.hypot(...v)) * weight
      total.area += weight
    }
    totals.set(key, total)
  }
  for (const [key, total] of totals)
    if (total.area > 0) result.set(key, [total.u / total.area, total.v / total.area])
  return result
}
