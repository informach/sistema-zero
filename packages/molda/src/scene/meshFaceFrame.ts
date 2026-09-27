import type { Vec3 } from '../core/model'
import { dot, sub, triangleUnitNormal } from '../model/vec'
import type { SceneMeshGeometry, Vec2 } from './document'
import { triangulateFace } from './triangulate'
import { requireScene, SceneValidationError } from './validation'

/** Relative, derived plane. It never snaps authorial points to a plane. */
function measureMeshFace(mesh: SceneMeshGeometry, id: string) {
  const face = mesh.faces[id]
  requireScene(Object.hasOwn(mesh.faces, id) && face, 'faces', 'Essa face não existe mais.')
  const points = face.corners.map(({ vertexId }) => {
    const point = mesh.vertices[vertexId]
    requireScene(point && Object.hasOwn(mesh.vertices, vertexId), 'vertices', 'Ponto ausente.')
    return point
  })
  const triangles = triangulateFace(points)
  if (triangles.status !== 'ok')
    return {
      status: 'degenerate' as const,
      message: 'A face se cruza ou não tem área. Ajuste seus pontos primeiro.',
    }
  const first = triangles.triangles[0]!
  const origin = points[first[0]]!
  const normal = triangleUnitNormal(origin, points[first[1]]!, points[first[2]]!)
  const extent = Math.max(...points.flatMap((p) => sub(p, origin).map(Math.abs)))
  const local = points.map(
    (p): Vec3 => [
      (p[0] - origin[0]) / extent,
      (p[1] - origin[1]) / extent,
      (p[2] - origin[2]) / extent,
    ],
  )
  if (!local.every((p) => Math.abs(dot(p, normal)) <= 1e-10))
    return {
      status: 'crooked' as const,
      message: 'Escolha faces planas para esse ajuste. Você pode dividir a face em triângulos.',
    }
  const axis = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)))
  const flatten = (p: Vec3): Vec2 =>
    axis === 0 ? [p[1], p[2]] : axis === 1 ? [p[0], p[2]] : [p[0], p[1]]
  const flat = local.map(flatten)
  const minimum = [0, 1].map((axis) => Math.min(...flat.map((p) => p[axis]!)))
  const span = [0, 1].map((axis) => Math.max(...flat.map((p) => p[axis]!)) - minimum[axis]!)
  if (!span.every((value) => value > 0))
    return { status: 'degenerate' as const, message: 'A face não tem área suficiente.' }
  const project = (point: Vec3): Vec2 => {
    const p = flatten([
      (point[0] - origin[0]) / extent,
      (point[1] - origin[1]) / extent,
      (point[2] - origin[2]) / extent,
    ])
    return [(p[0] - minimum[0]!) / span[0]!, (p[1] - minimum[1]!) / span[1]!]
  }
  const projected = points.map(project)
  return {
    status: 'ok' as const,
    frame: { face, points, normal, origin, extent, projected, first, project },
  }
}

export function meshFaceFrame(mesh: SceneMeshGeometry, id: string) {
  const measured = measureMeshFace(mesh, id)
  if (measured.status !== 'ok') throw new SceneValidationError('faces', measured.message)
  return measured.frame
}

/**
 * The same checks as `meshFaceFrame`, without throwing: `crooked` is a face that is not flat
 * (dividing it into triangles fixes it); `degenerate` crosses itself or has no area.
 */
export function inspectMeshFaceFrame(
  mesh: SceneMeshGeometry,
  id: string,
): 'ok' | 'crooked' | 'degenerate' {
  return measureMeshFace(mesh, id).status
}

export const faceTurn = (a: Vec2, b: Vec2, c: Vec2) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

export function requireConvexMeshFace(
  frame: ReturnType<typeof meshFaceFrame>,
  message: string,
  allowStraightCorners = false,
) {
  const { projected, first } = frame
  const sign = Math.sign(faceTurn(projected[first[0]]!, projected[first[1]]!, projected[first[2]]!))
  requireScene(
    projected.every((p, i) => {
      const turn =
        faceTurn(
          p,
          projected[(i + 1) % projected.length]!,
          projected[(i + 2) % projected.length]!,
        ) * sign
      return allowStraightCorners ? turn >= -1e-12 : turn > 1e-12
    }),
    'faces',
    message,
  )
}

/** Topology edits must not reinterpret a per-triangle, non-affine paint mapping. */
export function requireAffineFaceUv(frame: ReturnType<typeof meshFaceFrame>) {
  requireMatchingFaceUv(
    frame,
    frame.face.corners.map((corner, i) => ({ point: frame.points[i]!, uv: corner.uv })),
    'Divida essa face em triângulos antes desse ajuste, para manter a pintura no lugar.',
  )
}

/** Check every source corner, including interior seams that a new boundary would hide. */
export function requireMatchingFaceUv(
  frame: ReturnType<typeof meshFaceFrame>,
  samples: Iterable<{ point: Vec3; uv: Vec2 }>,
  message: string,
) {
  const { face, projected, first } = frame
  const [a, b, c] = first.map((i) => projected[i]!) as [Vec2, Vec2, Vec2]
  const determinant = faceTurn(a, b, c)
  for (const sample of samples) {
    const p = frame.project(sample.point)
    const v = faceTurn(a, p, c) / determinant
    const w = faceTurn(a, b, p) / determinant
    for (const axis of [0, 1] as const) {
      const av = face.corners[first[0]]!.uv[axis]
      const bv = face.corners[first[1]]!.uv[axis]
      const cv = face.corners[first[2]]!.uv[axis]
      const actual = sample.uv[axis]
      const expected = av + v * (bv - av) + w * (cv - av)
      const tolerance =
        Math.max(Math.abs(bv - av), Math.abs(cv - av)) * 1e-10 +
        Math.max(Math.abs(actual), Math.abs(expected)) * Number.EPSILON * 8
      requireScene(
        Number.isFinite(expected) && Math.abs(expected - actual) <= tolerance,
        'uv',
        message,
      )
    }
  }
}
