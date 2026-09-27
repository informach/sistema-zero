import type { SceneMeshGeometry, Vec2 } from '../scene/document'
import { triangulateFace } from '../scene/triangulate'

/** Independent test oracle: polygon clipping/area, not the unfolding kernel's separating axes. */
export function sceneUvOverlapArea(mesh: SceneMeshGeometry) {
  const triangles = Object.values(mesh.faces).flatMap((face) => {
    const result = triangulateFace(face.corners.map(({ uv }) => [uv[0], uv[1], 0]))
    if (result.status !== 'ok') throw new Error('Invalid UV oracle input')
    return result.triangles.map((triangle) => triangle.map((i) => face.corners[i]!.uv))
  })
  const cross = (a: Vec2, b: Vec2, p: Vec2) =>
    (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  let total = 0
  for (let i = 0; i < triangles.length; i++)
    for (let j = i + 1; j < triangles.length; j++) {
      const clip = triangles[j]!
      const sign = Math.sign(cross(clip[0]!, clip[1]!, clip[2]!))
      let polygon = triangles[i]!
      for (let edge = 0; edge < 3 && polygon.length; edge++) {
        const a = clip[edge]!,
          b = clip[(edge + 1) % 3]!,
          result: Vec2[] = []
        for (let k = 0; k < polygon.length; k++) {
          const p = polygon[k]!,
            q = polygon[(k + 1) % polygon.length]!
          const from = cross(a, b, p) * sign,
            to = cross(a, b, q) * sign
          if (from >= 0) result.push(p)
          if (from >= 0 !== to >= 0) {
            const t = from / (from - to)
            result.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
          }
        }
        polygon = result
      }
      for (let k = 1; k < polygon.length - 1; k++)
        total += Math.abs(cross(polygon[0]!, polygon[k]!, polygon[k + 1]!)) / 2
    }
  return total
}
