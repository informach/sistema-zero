import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry, Vec2 } from './document'
import { mapMeshUv, meshUvFaces } from './meshUv'
import { projectMeshFaceMetric } from './meshUvProjection'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

/** Common metric scale for per-face and connected charts, without moving authorial positions. */
export function projectMeshUvFaces(mesh: SceneMeshGeometry, ids: readonly string[]) {
  const selected = meshUvFaces(mesh, ids)
  if (!selected.length) return { selected, planar: mesh }
  // Subtract first whenever finite, preserving small faces far from zero. Use a
  // common factor only when a face spans both ends of Double; inter-face distance is irrelevant.
  const factor = selected.some((id) => {
    const points = mesh.faces[id]!.corners.map((c) => mesh.vertices[c.vertexId]!)
    return [0, 1, 2].some(
      (axis) =>
        !Number.isFinite(
          Math.max(...points.map((p) => p[axis]!)) - Math.min(...points.map((p) => p[axis]!)),
        ),
    )
  })
    ? 0.5
    : 1
  const metrics = new Map(
    selected.map((id) => {
      const face = mesh.faces[id]!
      const origin = mesh.vertices[face.corners[0]!.vertexId]!
      const local: SceneMeshGeometry = {
        id: mesh.id,
        kind: 'mesh',
        looseEdges: [],
        faces: { [id]: face },
        vertices: Object.fromEntries(
          face.corners.map(({ vertexId }) => {
            const point = mesh.vertices[vertexId]!
            const translated = point.map((value, axis) => {
              const delta = value - origin[axis]!
              return Number.isFinite(delta)
                ? delta * factor
                : value * factor - origin[axis]! * factor
            }) as Vec3
            return [vertexId, translated]
          }),
        ),
      }
      return [id, projectMeshFaceMetric(local, id)] as const
    }),
  )
  let extent = 0
  for (const metric of metrics.values()) extent = Math.max(extent, metric.extent)
  const planar = mapMeshUv(mesh, selected, (_uv, id, corner): Vec2 => {
    const metric = metrics.get(id)!
    const scale = metric.extent / extent
    return [metric.points[corner]![0] * scale, metric.points[corner]![1] * scale]
  })
  return { selected, planar }
}

export function requireMeshUvFaceArea(mesh: SceneMeshGeometry, selected: readonly string[]) {
  for (const id of selected)
    requireScene(
      triangulateFace(mesh.faces[id]!.corners.map(({ uv }): Vec3 => [uv[0], uv[1], 0])).status ===
        'ok',
      'uv',
      'As faces têm tamanhos muito diferentes para caber juntas sem perder precisão. Organize em grupos menores.',
    )
}
