import type { ShapeFaceId, Vec3 } from '../core/model'
import { cross, dot, normalize, sub } from '../model/vec'
import type { SceneMeshFace, SceneMeshGeometry, ScenePathGeometry, Vec2 } from './document'
import { pathDirections, pathTangents, readPathParameters } from './pathParameters'
import { number, requireScene } from './validation'

/** Parallel-transport frames avoid arbitrary per-segment spins. Parameters, not GPU data, are canonical. */
export function pathMesh(source: ScenePathGeometry) {
  const { points: knots, radius, around, endCaps, closed = false } = readPathParameters(source)
  const points = knots.map((knot) => knot.position)
  const directions = pathDirections(points, closed)
  const tangents = pathTangents(directions, closed)
  const total = (closed ? [...points.slice(1), points[0]!] : points.slice(1))
    .map((p, i) => number(Math.hypot(...sub(p, points[i]!)), 'points'))
    .reduce((sum, length) => number(sum + length, 'points'), 0)
  let distance = 0
  const first = tangents[0]!
  const seed: Vec3 = [0, 0, 0]
  seed[first.map(Math.abs).indexOf(Math.min(...first.map(Math.abs)))] = 1
  let u = normalize(cross(first, seed))
  const vertices: SceneMeshGeometry['vertices'] = {}
  const faces: SceneMeshGeometry['faces'] = {}
  const surfaceByFace = new Map<string, ShapeFaceId>()
  const ring = (i: number, j: number) => `ring:${closed ? i % points.length : i}:${j % around}`
  const lengths: number[] = []
  const transport = (normal: Vec3, previous: Vec3, tangent: Vec3): Vec3 => {
    const axis = cross(previous, tangent)
    const denominator = 1 + dot(previous, tangent)
    requireScene(denominator > 1e-10, 'points', 'Abra um pouco a curva do caminho.')
    const once = cross(axis, normal),
      twice = cross(axis, once)
    return normalize(normal.map((value, k) => value + once[k]! + twice[k]! / denominator) as Vec3)
  }
  const frames = points.map((point, i) => {
    if (i) {
      u = transport(u, tangents[i - 1]!, tangents[i]!)
      distance += Math.hypot(...sub(point, points[i - 1]!))
    }
    lengths.push(distance / total)
    return u
  })
  // Distribute holonomy by arc length: the virtual final frame meets the first
  // without a sudden twist at the closing edge, including non-planar loops.
  const end = closed ? transport(frames.at(-1)!, tangents.at(-1)!, first) : frames[0]!
  const twist = closed ? Math.atan2(dot(first, cross(end, frames[0]!)), dot(end, frames[0]!)) : 0
  points.forEach((point, i) => {
    const tangent = tangents[i]!
    let normal = frames[i]!
    if (closed && twist !== 0) {
      const angle = twist * lengths[i]!,
        sine = Math.sin(angle),
        cosine = Math.cos(angle)
      const perpendicular = cross(tangent, normal)
      normal = normalize(
        normal.map((value, k) => value * cosine + perpendicular[k]! * sine) as Vec3,
      )
    }
    const v = normalize(cross(tangent, normal))
    for (let j = 0; j < around; j++) {
      const angle = (j / around) * Math.PI * 2
      vertices[ring(i, j)] = point.map((value, k) =>
        number(
          value + radius * (Math.cos(angle) * normal[k]! + Math.sin(angle) * v[k]!),
          'vertices',
        ),
      ) as Vec3
    }
  })
  const face = (id: string, surfaceId: ShapeFaceId, corners: SceneMeshFace['corners']) => {
    const surface = source.surfaces[surfaceId]
    faces[id] = {
      ...(surface?.materialId === undefined ? {} : { materialId: surface.materialId }),
      corners: corners.map((corner) => ({
        ...corner,
        uv: surface
          ? [
              number(
                surface.uv.origin[0] +
                  corner.uv[0] * surface.uv.u[0] +
                  corner.uv[1] * surface.uv.v[0],
                'uv',
              ),
              number(
                surface.uv.origin[1] +
                  corner.uv[0] * surface.uv.u[1] +
                  corner.uv[1] * surface.uv.v[1],
                'uv',
              ),
            ]
          : corner.uv,
      })),
    }
    surfaceByFace.set(id, surfaceId)
  }
  for (let i = 0; i < points.length - (closed ? 0 : 1); i++)
    for (let j = 0; j < around; j++) {
      const corners = [
        { vertexId: ring(i, j), uv: [j / around, lengths[i]!] as Vec2 },
        { vertexId: ring(i, j + 1), uv: [(j + 1) / around, lengths[i]!] as Vec2 },
        { vertexId: ring(i + 1, j + 1), uv: [(j + 1) / around, lengths[i + 1] ?? 1] as Vec2 },
        { vertexId: ring(i + 1, j), uv: [j / around, lengths[i + 1] ?? 1] as Vec2 },
      ]
      face(`side:${i}:${j}:a`, 'side', [corners[0]!, corners[1]!, corners[2]!])
      face(`side:${i}:${j}:b`, 'side', [corners[0]!, corners[2]!, corners[3]!])
    }
  if (endCaps)
    for (const [i, surfaceId] of [
      [0, 'bottom'],
      [points.length - 1, 'top'],
    ] as const) {
      const center = `center:${surfaceId}`
      vertices[center] = points[i]!
      const corner = (j: number) => ({
        vertexId: ring(i, j),
        uv: [
          (Math.cos(((j % around) / around) * Math.PI * 2) + 1) / 2,
          (Math.sin(((j % around) / around) * Math.PI * 2) + 1) / 2,
        ] as Vec2,
      })
      for (let j = 0; j < around; j++)
        face(`${surfaceId}:${j}`, surfaceId, [
          { vertexId: center, uv: [0.5, 0.5] },
          ...(i === 0 ? [corner(j + 1), corner(j)] : [corner(j), corner(j + 1)]),
        ])
    }
  const mesh: SceneMeshGeometry = { id: source.id, kind: 'mesh', vertices, faces, looseEdges: [] }
  return { mesh, surfaceByFace }
}
