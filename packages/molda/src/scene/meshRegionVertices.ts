import type { SceneMeshGeometry } from './document'

/** Reuse internal points; duplicate the boundary and any points owned outside the region. */
export function prepareMeshRegionVertices(mesh: SceneMeshGeometry) {
  const vertexFaces = new Map<string, Set<string>>()
  for (const [id, face] of Object.entries(mesh.faces))
    for (const corner of face.corners) {
      let faces = vertexFaces.get(corner.vertexId)
      if (!faces) {
        faces = new Set()
        vertexFaces.set(corner.vertexId, faces)
      }
      faces.add(id)
    }
  const loose = new Set(mesh.looseEdges.flat())
  return (ids: readonly string[], boundaryIds: Iterable<string>) => {
    const members = new Set(ids)
    const boundary = new Set(boundaryIds)
    const points = new Set(ids.flatMap((id) => mesh.faces[id]!.corners.map((c) => c.vertexId)))
    const copied = new Set(
      [...points].filter(
        (id) =>
          boundary.has(id) ||
          loose.has(id) ||
          [...vertexFaces.get(id)!].some((faceId) => !members.has(faceId)),
      ),
    )
    return { points, copied }
  }
}
