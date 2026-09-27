import type { Vec3 } from '../core/model'
import { cross, dot, normalize, sub } from '../model/vec'
import type { SceneMeshGeometry, Vec2 } from './document'
import { meshFaceFrame } from './meshFaceFrame'

/** A face-local isometry with a separately recorded metric scale; no per-face density normalization. */
export function projectMeshFaceMetric(mesh: SceneMeshGeometry, id: string) {
  const frame = meshFaceFrame(mesh, id)
  const local = frame.points.map((p): Vec3 => {
    const delta = sub(p, frame.origin)
    return [delta[0] / frame.extent, delta[1] / frame.extent, delta[2] / frame.extent]
  })
  const u = normalize(sub(local[frame.first[1]]!, local[frame.first[0]]!))
  const vertical = cross(frame.normal, u)
  const points = local.map((p): Vec2 => [dot(p, u), dot(p, vertical)])
  const minimum: Vec2 = [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))]
  const span = Math.max(
    ...points.map((p) => p[0] - minimum[0]),
    ...points.map((p) => p[1] - minimum[1]),
  )
  return {
    points: points.map((p): Vec2 => [p[0] - minimum[0], p[1] - minimum[1]]),
    span,
    extent: frame.extent,
  }
}
