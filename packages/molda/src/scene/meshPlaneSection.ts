import type { Vec3 } from '../core/model'
import { dot, sub } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import type { MeshCutPlane } from './meshPlaneCut'
import { triangulateFace } from './triangulate'

const cached = new WeakMap<SceneMeshGeometry, Vec3[][]>()
/** Surface segments, never a chord through the solid; concave faces keep separate intervals. */
export function meshPlaneSection(
  mesh: SceneMeshGeometry,
  plane: MeshCutPlane,
): Array<[Vec3, Vec3]> {
  let triangles = cached.get(mesh)
  if (!triangles) {
    triangles = []
    for (const face of Object.values(mesh.faces)) {
      const points = face.corners.map((corner) => mesh.vertices[corner.vertexId]!)
      const result = triangulateFace(points)
      if (result.status === 'ok')
        for (const triangle of result.triangles) triangles.push(triangle.map((i) => points[i]!))
    }
    cached.set(mesh, triangles)
  }
  const segments: Array<[Vec3, Vec3]> = []
  for (const triangle of triangles) {
    const distances = triangle.map((point) => dot(sub(point, plane.origin), plane.normal))
    if (distances.every((d) => d === 0)) continue
    const points: Vec3[] = []
    const add = (point: Vec3) => {
      if (!points.some((entry) => entry.every((n, i) => n === point[i]))) points.push(point)
    }
    for (let i = 0; i < 3; i++) {
      const a = triangle[i]!,
        b = triangle[(i + 1) % 3]!,
        da = distances[i]!,
        db = distances[(i + 1) % 3]!
      if (da === 0) add(a)
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db)
        add(a.map((n, axis) => (1 - t) * n + t * b[axis]!) as Vec3)
      }
    }
    if (points.length === 2) segments.push([points[0]!, points[1]!])
  }
  return segments
}
