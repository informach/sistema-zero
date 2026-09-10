import type { SceneMeshGeometry } from './document'
import { meshComponentIds, type SceneComponentSelection } from './meshComponents'
import { meshEdgeKey } from './meshTopology'
import { requireScene } from './validation'

/** Explicit deletion plan: deleting a point/edge also removes its incident faces, never repairs them. */
export function prepareMeshRemoval(
  mesh: SceneMeshGeometry,
  selection: Pick<SceneComponentSelection, 'mode' | 'ids'>,
) {
  const chosen = new Set(selection.ids)
  const alive = new Set(meshComponentIds(mesh, selection.mode))
  for (const id of chosen)
    requireScene(
      alive.has(id),
      'selection',
      'Essa parte da malha não existe mais. Escolha novamente.',
    )
  const removedVertices = selection.mode === 'vertex' ? chosen : new Set<string>()
  const removedFaces = new Set<string>()
  for (const [id, face] of Object.entries(mesh.faces)) {
    if (selection.mode === 'face') {
      if (chosen.has(id)) removedFaces.add(id)
      continue
    }
    if (
      face.corners.some((corner, i) =>
        selection.mode === 'vertex'
          ? chosen.has(corner.vertexId)
          : chosen.has(
              meshEdgeKey(corner.vertexId, face.corners[(i + 1) % face.corners.length]!.vertexId),
            ),
      )
    )
      removedFaces.add(id)
  }
  const removedLoose = new Set<number>()
  mesh.looseEdges.forEach(([a, b], index) => {
    if (
      removedVertices.has(a) ||
      removedVertices.has(b) ||
      (selection.mode === 'edge' && chosen.has(meshEdgeKey(a, b)))
    )
      removedLoose.add(index)
  })
  return {
    points: removedVertices.size,
    faces: removedFaces.size,
    looseEdges: removedLoose.size,
    apply(): SceneMeshGeometry {
      if (!removedVertices.size && !removedFaces.size && !removedLoose.size) return mesh
      return {
        ...mesh,
        vertices: removedVertices.size
          ? Object.fromEntries(
              Object.entries(mesh.vertices).filter(([id]) => !removedVertices.has(id)),
            )
          : mesh.vertices,
        faces: removedFaces.size
          ? Object.fromEntries(Object.entries(mesh.faces).filter(([id]) => !removedFaces.has(id)))
          : mesh.faces,
        looseEdges: removedLoose.size
          ? mesh.looseEdges.filter((_edge, index) => !removedLoose.has(index))
          : mesh.looseEdges,
      }
    },
  }
}
