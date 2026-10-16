import type { Vec3 } from '../core/model'
import { cross, dot, sub } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

type Triangle = { face: string; ids: string[]; points: Vec3[]; min: Vec3; max: Vec3; normal: Vec3 }
const EPS = 1e-10
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

function barycentric(triangle: Triangle, p: Vec3): Vec3 {
  const [a, b, c] = triangle.points as [Vec3, Vec3, Vec3]
  const u = sub(b, a),
    v = sub(c, a),
    q = sub(p, a)
  // Cross products avoid subtracting two nearly equal squared dot products on thin triangles.
  const n = cross(u, v),
    denominator = dot(n, n)
  const y = dot(cross(q, v), n) / denominator,
    z = dot(cross(u, q), n) / denominator
  return [1 - y - z, y, z]
}

/** Interval of a segment inside a triangle. Coplanar segments are clipped by barycentric planes. */
function hits(a: Vec3, b: Vec3, triangle: Triangle): Vec3[] {
  const origin = triangle.points[0]!
  const da = dot(sub(a, origin), triangle.normal),
    db = dot(sub(b, origin), triangle.normal)
  if ((da > EPS && db > EPS) || (da < -EPS && db < -EPS)) return []
  if (Math.abs(da) <= EPS && Math.abs(db) <= EPS) {
    const ba = barycentric(triangle, a),
      bb = barycentric(triangle, b)
    let lo = 0,
      hi = 1
    for (let axis = 0; axis < 3; axis++) {
      const start = ba[axis]!,
        delta = bb[axis]! - start
      if (delta === 0) {
        if (start < -EPS) return []
        continue
      }
      const t = -start / delta
      if (delta > 0) lo = Math.max(lo, t)
      else hi = Math.min(hi, t)
    }
    return lo <= hi + EPS ? [mix(a, b, Math.max(0, lo)), mix(a, b, Math.min(1, hi))] : []
  }
  const t = da / (da - db)
  if (t < -EPS || t > 1 + EPS) return []
  const p = mix(a, b, Math.max(0, Math.min(1, t)))
  return barycentric(triangle, p).every((n) => n >= -EPS) ? [p] : []
}

function allowed(point: Vec3, shared: readonly Vec3[]) {
  if (!shared.length) return false
  if (shared.length === 1) return Math.hypot(...sub(point, shared[0]!)) <= EPS * 8
  const a = shared[0]!,
    b = shared[1]!,
    direction = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(point, a), direction) / dot(direction, direction)))
  return Math.hypot(...sub(point, mix(a, b, t))) <= EPS * 8
}

/** Worker-side geometric validation, including coplanar overlap. Shared topological edges are allowed. */
export function requireNonIntersectingSceneSolid(mesh: SceneMeshGeometry) {
  const coordinates = Object.values(mesh.vertices),
    origin = coordinates[0]!
  let extent = 0
  for (const p of coordinates)
    for (let axis = 0; axis < 3; axis++)
      extent = Math.max(extent, Math.abs(p[axis]! - origin[axis]!))
  requireScene(extent > 0 && Number.isFinite(extent), 'mesh', 'A peça não tem um volume válido.')
  const points = new Map(
    Object.entries(mesh.vertices).map(([id, p]) => [
      id,
      sub(p, origin).map((n) => n / extent) as Vec3,
    ]),
  )
  const triangles: Triangle[] = []
  for (const [face, data] of Object.entries(mesh.faces)) {
    const vertices = data.corners.map((corner) => points.get(corner.vertexId)!)
    const result = triangulateFace(vertices)
    requireScene(
      result.status === 'ok',
      'mesh',
      'A peça tem uma face inválida. Revise a malha antes de cortar.',
    )
    for (const indices of result.triangles) {
      const positions = indices.map((i) => vertices[i]!),
        normal = cross(sub(positions[1]!, positions[0]!), sub(positions[2]!, positions[0]!)),
        length = Math.hypot(...normal)
      requireScene(
        length > 0 && Number.isFinite(length),
        'mesh',
        'Uma face é estreita demais para verificar o corte.',
      )
      triangles.push({
        face,
        ids: indices.map((i) => data.corners[i]!.vertexId),
        points: positions,
        normal: normal.map((n) => n / length) as Vec3,
        min: [0, 1, 2].map((axis) => Math.min(...positions.map((p) => p[axis]!))) as Vec3,
        max: [0, 1, 2].map((axis) => Math.max(...positions.map((p) => p[axis]!))) as Vec3,
      })
    }
  }
  // Sweep on X prunes disjoint bounds; bounded work refuses adversarial all-overlapping inputs.
  triangles.sort((a, b) => a.min[0] - b.min[0])
  let candidates = 0
  for (let i = 0; i < triangles.length; i++) {
    const a = triangles[i]!
    for (let j = i + 1; j < triangles.length && triangles[j]!.min[0] <= a.max[0] + EPS; j++) {
      const b = triangles[j]!
      requireScene(
        ++candidates <= 8_000_000,
        'mesh',
        'Esta malha exige verificações demais para cortar. Simplifique-a antes de continuar.',
      )
      if (
        a.face === b.face ||
        [1, 2].some(
          (axis) => a.max[axis]! < b.min[axis]! - EPS || b.max[axis]! < a.min[axis]! - EPS,
        )
      )
        continue
      const shared = a.ids.filter((id) => b.ids.includes(id)).map((id) => points.get(id)!)
      requireScene(
        shared.length < 3,
        'mesh',
        'A peça tem faces sobrepostas. Revise a malha antes de cortar.',
      )
      for (const [source, target] of [
        [a, b],
        [b, a],
      ] as const)
        for (let edge = 0; edge < 3; edge++) {
          for (const point of hits(source.points[edge]!, source.points[(edge + 1) % 3]!, target))
            requireScene(
              allowed(point, shared),
              'mesh',
              'A peça tem faces que se atravessam ou se encostam sem conexão. Revise a malha antes de cortar.',
            )
        }
    }
  }
}
