import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry, Vec2 } from './document'
import { meshFaceFrame, requireAffineFaceUv, requireConvexMeshFace } from './meshFaceFrame'
import { meshIdAllocator } from './meshTopology'
import { triangulateFace } from './triangulate'
import { number, requireScene } from './validation'

/** Per-face proportional border, not a fixed-distance offset. Planar affine paint remains continuous. */
export function insetMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  ratio: number,
  nextId: () => string = newId,
): SceneMeshGeometry {
  number(ratio, 'ratio', 0, 0.95)
  const chosen = new Set(ids)
  for (const id of chosen)
    requireScene(Object.hasOwn(mesh.faces, id), 'faces', 'Essa face não existe mais.')
  if (!ratio || !chosen.size) return mesh
  const allocate = meshIdAllocator(mesh, nextId)
  const vertices = { ...mesh.vertices }
  const faces = { ...mesh.faces }
  for (const id of chosen) {
    const frame = meshFaceFrame(mesh, id)
    const { face, points } = frame
    requireConvexMeshFace(
      frame,
      'Essa face tem uma curva para dentro. Divida em triângulos antes de criar a borda.',
    )
    requireAffineFaceUv(frame)
    const center = [0, 1, 2].map((axis) =>
      points.reduce((sum, p) => sum + p[axis]! / points.length, 0),
    ) as Vec3
    const centerUv = [0, 1].map((axis) =>
      face.corners.reduce((sum, c) => sum + c.uv[axis]! / points.length, 0),
    ) as Vec2
    const inside = face.corners.map((corner, i) => {
      const vertexId = allocate()
      vertices[vertexId] = [0, 1, 2].map((axis) =>
        number(points[i]![axis]! * (1 - ratio) + center[axis]! * ratio, 'vertices'),
      ) as Vec3
      const uv = [0, 1].map((axis) =>
        number(corner.uv[axis]! * (1 - ratio) + centerUv[axis]! * ratio, 'uv'),
      ) as Vec2
      return { vertexId, uv }
    })
    faces[id] = { ...face, corners: inside }
    for (let i = 0; i < face.corners.length; i++) {
      const j = (i + 1) % face.corners.length
      const corners = [face.corners[i]!, face.corners[j]!, inside[j]!, inside[i]!]
      requireScene(
        triangulateFace(corners.map((c) => vertices[c.vertexId]!)).status === 'ok',
        'faces',
        'Essa borda ficou pequena demais para desenhar. Tente outro valor.',
      )
      faces[allocate()] = { ...face, corners }
    }
  }
  return { ...mesh, vertices, faces }
}
