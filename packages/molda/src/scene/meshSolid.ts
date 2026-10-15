import type { Vec3 } from '../core/model'
import { cross, dot, sub } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { indexMeshEdges } from './meshTopology'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

/** Oriented, closed authorial topology is required; renderable triangles alone are insufficient. */
export function requireClosedSceneMesh(mesh: SceneMeshGeometry) {
  requireScene(
    mesh.looseEdges.length === 0 && Object.keys(mesh.faces).length >= 4,
    'mesh',
    'Escolha uma peça sólida e fechada para cortar.',
  )
  for (const edges of indexMeshEdges(mesh).edges.values()) {
    requireScene(
      edges.length === 2 && edges[0]!.a === edges[1]!.b && edges[0]!.b === edges[1]!.a,
      'mesh',
      'A peça tem bordas abertas, sobrepostas ou viradas. Revise a malha antes de cortar.',
    )
  }
  for (const face of Object.values(mesh.faces)) {
    requireScene(
      triangulateFace(face.corners.map((corner) => mesh.vertices[corner.vertexId]!)).status ===
        'ok',
      'mesh',
      'A peça tem uma face inválida. Revise a malha antes de cortar.',
    )
  }
}

/** Translate the integration origin near the geometry to avoid cancellation at distant coordinates. */
export function sceneMeshVolume(mesh: SceneMeshGeometry) {
  const origin = Object.values(mesh.vertices)[0] ?? ([0, 0, 0] as Vec3)
  let volume = 0
  for (const face of Object.values(mesh.faces)) {
    const points = face.corners.map((corner) => mesh.vertices[corner.vertexId]!)
    const triangles = triangulateFace(points)
    requireScene(triangles.status === 'ok', 'mesh', 'A peça tem uma face inválida.')
    for (const [a, b, c] of triangles.triangles) {
      volume +=
        dot(sub(points[a]!, origin), cross(sub(points[b]!, origin), sub(points[c]!, origin))) / 6
    }
  }
  requireScene(
    Number.isFinite(volume),
    'mesh',
    'O volume da peça ultrapassa a precisão disponível.',
  )
  return volume
}
