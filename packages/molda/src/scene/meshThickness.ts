import { newId } from '../core/id'
import type { SceneMeshFace, SceneMeshGeometry } from './document'
import { SCENE_LIMITS } from './limits'
import { prepareMeshExtrusion } from './meshExtrude'
import { meshFaceFrame, requireAffineFaceUv } from './meshFaceFrame'
import { indexMeshEdges, meshFaceRegion, meshIdAllocator } from './meshTopology'
import { number, requireScene } from './validation'

/** One planar sheet becomes a closed shell; source holes remain holes with their own side walls. */
export function thickenMeshFaces(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  distance: number,
  nextId: () => string = newId,
): SceneMeshGeometry {
  const prepared = prepareMeshThickness(mesh, ids)
  try {
    return prepared.apply(distance, nextId)
  } finally {
    prepared.dispose()
  }
}

export function prepareMeshThickness(mesh: SceneMeshGeometry, ids: readonly string[]) {
  const chosen = new Set(ids)
  const extrusion = prepareMeshExtrusion(mesh, [...chosen])
  let bottom: Map<string, SceneMeshFace> | null = null
  let bottomBytes = 0
  let disposed = false
  function prepareBottom() {
    const topology = indexMeshEdges(mesh)
    let boundary = 0
    for (const incident of topology.edges.values()) {
      const inside = incident.filter((edge) => chosen.has(edge.faceId)).length
      if (!inside) continue
      requireScene(
        inside === incident.length,
        'faces',
        'Escolha uma superfície solta inteira para dar espessura. Para levantar só uma parte, use Puxar faces.',
      )
      if (inside === 1) boundary++
    }
    let extraVertices = 0
    const visited = new Set<string>()
    for (const seed of chosen) {
      if (visited.has(seed)) continue
      const region = meshFaceRegion(topology, [seed], chosen)
      const vertices = new Set<string>()
      for (const id of region) {
        visited.add(id)
        for (const corner of mesh.faces[id]!.corners) vertices.add(corner.vertexId)
      }
      extraVertices += vertices.size
    }
    const sourceTriangles = Object.values(mesh.faces).reduce(
      (sum, face) => sum + face.corners.length - 2,
      0,
    )
    const addedTriangles = [...chosen].reduce(
      (sum, id) => sum + mesh.faces[id]!.corners.length - 2,
      boundary * 2,
    )
    requireScene(
      sourceTriangles + addedTriangles <= SCENE_LIMITS.triangles,
      'faces',
      'Essa espessura ultrapassa o orçamento de triângulos.',
    )
    requireScene(
      Object.keys(mesh.vertices).length + extraVertices <= SCENE_LIMITS.vertices,
      'vertices',
      'Essa espessura ultrapassa o orçamento de pontos.',
    )
    const faces = new Map<string, SceneMeshFace>()
    let bytes = 0
    for (const id of chosen) {
      const frame = meshFaceFrame(mesh, id)
      requireAffineFaceUv(frame)
      const { face } = frame
      faces.set(id, { ...face, corners: [face.corners[0]!, ...face.corners.slice(1).reverse()] })
      bytes += 256 + id.length * 2 + face.corners.length * 32
    }
    bottomBytes = bytes
    return faces
  }
  return {
    apply(distance: number, nextId: () => string = newId): SceneMeshGeometry {
      requireScene(!disposed, 'gesture', 'Esse ajuste já terminou. Escolha as faces novamente.')
      number(distance, 'distance', 0)
      for (const id of chosen)
        requireScene(Object.hasOwn(mesh.faces, id), 'faces', 'Essa face não existe mais.')
      if (!distance || !chosen.size) return mesh
      bottom ??= prepareBottom()
      const raised = extrusion.apply(distance, nextId)
      const allocate = meshIdAllocator(raised, nextId)
      const faces = { ...raised.faces }
      for (const face of bottom.values()) faces[allocate()] = face
      return { ...raised, faces }
    },
    get retainedBytes() {
      // Conservative owned payload accounting, not a JavaScript heap measurement.
      return bottomBytes + extrusion.retainedBytes
    },
    dispose() {
      disposed = true
      bottom?.clear()
      bottom = null
      bottomBytes = 0
      extrusion.dispose()
    },
  }
}
