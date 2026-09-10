import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from './document'
import { type AffineMatrix, composeTransform, transformPoint } from './matrix'
import { number, requireScene } from './validation'

export function verticesOfMeshFaces(mesh: SceneMeshGeometry, faceIds: readonly string[]) {
  const selected = new Set<string>()
  for (const id of faceIds) {
    const face = mesh.faces[id]
    requireScene(Object.hasOwn(mesh.faces, id) && face, 'faces', 'Essa face não existe mais.')
    for (const corner of face.corners) selected.add(corner.vertexId)
  }
  return [...selected]
}

/** Move authorial points once, including connections to adjacent unselected faces. No UV reprojection. */
export function transformMeshVertices(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  delta: AffineMatrix,
): SceneMeshGeometry {
  const matrix = composeTransform({ kind: 'affine', matrix: delta })
  const selected = new Set(ids)
  const changed: Record<string, Vec3> = Object.create(null)
  for (const id of selected) {
    const point = mesh.vertices[id]
    requireScene(
      Object.hasOwn(mesh.vertices, id) && point,
      'vertices',
      'Esse ponto não existe mais.',
    )
    const next = transformPoint(matrix, point).map((value) => number(value, 'vertices')) as Vec3
    if (next.some((value, axis) => value !== point[axis])) changed[id] = next
  }
  if (!Object.keys(changed).length) return mesh
  return { ...mesh, vertices: { ...mesh.vertices, ...changed } }
}

/** Bounding center in the requested space, without spreading an unbounded vertex list. */
export function meshVertexCenter(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  matrix: Readonly<AffineMatrix>,
): Vec3 | null {
  if (!ids.length) return null
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const id of ids) {
    const point = mesh.vertices[id]
    requireScene(
      Object.hasOwn(mesh.vertices, id) && point,
      'vertices',
      'Esse ponto não existe mais.',
    )
    const world = transformPoint(matrix, point)
    for (const axis of [0, 1, 2] as const) {
      number(world[axis], 'vertices')
      min[axis] = Math.min(min[axis], world[axis])
      max[axis] = Math.max(max[axis], world[axis])
    }
  }
  return [min[0] / 2 + max[0] / 2, min[1] / 2 + max[1] / 2, min[2] / 2 + max[2] / 2]
}
