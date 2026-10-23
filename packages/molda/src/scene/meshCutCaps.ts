import earcut, { deviation } from 'earcut'
import type { Vec3 } from '../core/model'
import { cross, dot, sub } from '../model/vec'
import type { SceneMeshFace, SceneMeshGeometry, Vec2 } from './document'
import { indexMeshEdges, meshIdAllocator } from './meshTopology'
import { requireScene } from './validation'

const cross2 = (a: Vec2, b: Vec2, c: Vec2) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

function contains(ring: readonly Vec2[], point: Vec2) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside
  }
  return inside
}

/** Cap every boundary ring, including holes and disconnected components, retaining boundary vertices. */
export function capSceneMesh(
  mesh: SceneMeshGeometry,
  normal: Vec3,
  materialId: string,
  nextId: () => string,
) {
  const edges = [...indexMeshEdges(mesh).edges.values()]
    .filter((entries) => entries.length === 1)
    .map((entries) => entries[0]!)
  requireScene(edges.length >= 3, 'cut', 'O plano precisa atravessar o volume da peça.')
  const next = new Map<string, string>(),
    incoming = new Set<string>()
  for (const edge of edges) {
    requireScene(
      !next.has(edge.b) && !incoming.has(edge.a),
      'cut',
      'A borda do corte se cruza ou se encosta. Afaste o plano dessa quina.',
    )
    next.set(edge.b, edge.a)
    incoming.add(edge.a)
  }
  const visited = new Set<string>(),
    rings: string[][] = []
  for (const start of next.keys()) {
    if (visited.has(start)) continue
    let cursor = start
    const ring: string[] = []
    while (!visited.has(cursor)) {
      visited.add(cursor)
      ring.push(cursor)
      const target = next.get(cursor)
      requireScene(target, 'cut', 'Não foi possível fechar a borda do corte.')
      cursor = target
    }
    requireScene(
      cursor === start && ring.length >= 3,
      'cut',
      'A borda do corte não forma um contorno fechado.',
    )
    rings.push(ring)
  }
  const origin = mesh.vertices[rings[0]![0]!]!
  const seed: Vec3 = Math.abs(normal[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]
  const tangent = cross(seed, normal)
  const u = tangent.map((n) => n / Math.hypot(...tangent)) as Vec3
  const v = cross(normal, u)
  const projected = new Map<string, Vec2>()
  let extent = 0
  for (const ring of rings)
    for (const id of ring) {
      const point = sub(mesh.vertices[id]!, origin)
      const xy: Vec2 = [dot(point, u), dot(point, v)]
      projected.set(id, xy)
      extent = Math.max(extent, Math.abs(xy[0]), Math.abs(xy[1]))
    }
  requireScene(extent > 0 && Number.isFinite(extent), 'cut', 'A tampa do corte ficou sem área.')
  // Normalized predicates keep tolerances independent of the piece's units and placement.
  const points = rings.map((ring) =>
    ring.map((id) => projected.get(id)!.map((n) => n / extent) as Vec2),
  )
  const parent = rings.map((_, i) => {
    const containers = points.flatMap((ring, j) =>
      i !== j && contains(ring, points[i]![0]!) ? [j] : [],
    )
    return (
      containers.find(
        (j) => !containers.some((k) => k !== j && contains(points[j]!, points[k]![0]!)),
      ) ?? -1
    )
  })
  const depths = parent.map((_, i) => {
    let depth = 0,
      p = parent[i]!
    while (p >= 0) {
      requireScene(depth++ < rings.length, 'cut', 'Os contornos do corte se sobrepõem.')
      p = parent[p]!
    }
    return depth
  })
  const faces: Record<string, SceneMeshFace> = { ...mesh.faces }
  const allocate = meshIdAllocator(mesh, nextId)
  for (let i = 0; i < rings.length; i++) {
    if (depths[i]! % 2) continue
    const indices = [i, ...parent.flatMap((p, j) => (p === i ? [j] : []))]
    const ids: string[] = [],
      flat: number[] = [],
      holes: number[] = [],
      simplified: number[] = []
    for (const [order, index] of indices.entries()) {
      if (order) holes.push(simplified.length)
      const offset = ids.length
      ids.push(...rings[index]!)
      flat.push(...points[index]!.flat())
      const ring = points[index]!
      // The caps share all boundary vertices. Earcut receives only corners: floating
      // collinearity must not produce sliver triangles along a straight cut edge.
      const remaining = ring.map((_, j) => j)
      let removed = true
      while (removed && remaining.length > 3) {
        removed = false
        for (let j = 0; j < remaining.length; j++) {
          const a = ring[remaining[(j + remaining.length - 1) % remaining.length]!]!
          const b = ring[remaining[j]!]!
          const c = ring[remaining[(j + 1) % remaining.length]!]!
          if (
            Math.abs(cross2(a, b, c)) <= 1e-12 &&
            (b[0] - a[0]) * (b[0] - c[0]) + (b[1] - a[1]) * (b[1] - c[1]) < 0
          ) {
            remaining.splice(j, 1)
            removed = true
            break
          }
        }
      }
      simplified.push(...remaining.map((j) => offset + j))
    }
    const corners = simplified.flatMap((j) => [flat[2 * j]!, flat[2 * j + 1]!])
    const triangles = earcut(corners, holes, 2)
    requireScene(
      triangles.length > 0 && deviation(corners, holes, 2, triangles) < 1e-8,
      'cut',
      'Não foi possível fechar a tampa sem perder área.',
    )
    const xy = (n: number): Vec2 => [flat[2 * n]!, flat[2 * n + 1]!]
    const conforming: Array<[number, number, number]> = []
    for (let t = 0; t < triangles.length; t += 3)
      conforming.push([
        simplified[triangles[t]!]!,
        simplified[triangles[t + 1]!]!,
        simplified[triangles[t + 2]!]!,
      ])
    // Earcut can omit collinear boundary points. Split those edges so caps share exact topology.
    for (let point = 0; point < ids.length; point++) {
      const p = xy(point)
      for (let t = 0; t < conforming.length; t++) {
        const triangle = conforming[t]!
        if (triangle.includes(point)) continue
        for (let e = 0; e < 3; e++) {
          const a = triangle[e]!,
            b = triangle[(e + 1) % 3]!,
            c = triangle[(e + 2) % 3]!
          const pa = xy(a),
            pb = xy(b)
          if (Math.abs(cross2(pa, pb, p)) > 1e-12) continue
          const along = (p[0] - pa[0]) * (p[0] - pb[0]) + (p[1] - pa[1]) * (p[1] - pb[1])
          if (along >= -1e-14) continue
          conforming[t] = [a, point, c]
          conforming.push([point, b, c])
          break
        }
      }
    }
    for (const triangle of conforming) {
      const [a, b, c] = triangle.map((index) => xy(index)) as [Vec2, Vec2, Vec2]
      requireScene(
        Math.abs(cross2(a, b, c)) > 1e-14,
        'cut',
        'A tampa ficou estreita demais. Afaste o corte da quina.',
      )
      if (cross2(a, b, c) < 0) triangle.reverse()
      faces[allocate()] = {
        materialId,
        corners: triangle.map((index) => ({
          vertexId: ids[index]!,
          uv: projected.get(ids[index]!)!,
        })),
      }
    }
  }
  return { ...mesh, faces }
}
