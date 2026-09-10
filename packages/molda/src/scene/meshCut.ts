import { newId } from '../core/id'
import { dot } from '../model/vec'
import type { SceneMeshGeometry } from './document'
import { SCENE_LIMITS } from './limits'
import { meshComponentEdges } from './meshComponents'
import { meshFaceFrame, requireAffineFaceUv } from './meshFaceFrame'
import { indexMeshEdges, meshEdgeKey, meshIdAllocator } from './meshTopology'
import { requireScene } from './validation'

function selectedPair(mesh: SceneMeshGeometry, ids: readonly string[]): [string, string] {
  const chosen = [...new Set(ids)]
  requireScene(chosen.length === 2, 'vertices', 'Escolha exatamente dois pontos para ligar.')
  for (const id of chosen)
    requireScene(Object.hasOwn(mesh.vertices, id), 'vertices', 'Esse ponto não existe mais.')
  const [a, b] = chosen as [string, string]
  requireScene(
    mesh.vertices[a]!.some((value, axis) => value !== mesh.vertices[b]![axis]),
    'vertices',
    'Esses pontos estão no mesmo lugar. Escolha pontos separados.',
  )
  return [a, b]
}

/** Construction lines never imply a face or modify paint. */
export function createMeshLooseEdge(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
): SceneMeshGeometry {
  const edge = selectedPair(mesh, ids)
  requireScene(
    !meshComponentEdges(mesh).has(meshEdgeKey(...edge)),
    'edges',
    'Esses pontos já têm uma linha entre eles.',
  )
  requireScene(
    mesh.looseEdges.length < SCENE_LIMITS.looseEdges,
    'edges',
    'Essa criação atingiu o orçamento de linhas soltas.',
  )
  return { ...mesh, looseEdges: [...mesh.looseEdges, edge] }
}

/** A straight cut of one unambiguous face. No rounding, UV reprojection or inferred surface filling. */
export function cutMeshFaceBetweenVertices(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  nextId: () => string = newId,
): SceneMeshGeometry {
  const [a, b] = selectedPair(mesh, ids)
  requireScene(
    !indexMeshEdges(mesh).edges.has(meshEdgeKey(a, b)),
    'edges',
    'Já existe uma linha de face entre esses pontos. Escolha dois pontos de lados diferentes.',
  )
  const candidates = Object.entries(mesh.faces).filter(([, face]) => {
    const vertices = new Set(face.corners.map((corner) => corner.vertexId))
    return vertices.has(a) && vertices.has(b)
  })
  requireScene(
    candidates.length === 1,
    'faces',
    candidates.length === 0
      ? 'Escolha dois pontos de uma mesma face para cortar.'
      : 'Esses pontos atravessam mais de uma face. Escolha outro par para cortar.',
  )
  const faceId = candidates[0]![0]
  const [first, second] = prepareMeshFaceCut(mesh, faceId, [a, b])
  const allocated = meshIdAllocator(mesh, nextId)()
  return { ...mesh, faces: { ...mesh.faces, [faceId]: first, [allocated]: second } }
}

/** Two candidate faces, validated before assigning identities or publishing any topology. */
export function prepareMeshFaceCut(
  mesh: SceneMeshGeometry,
  faceId: string,
  ids: readonly [string, string],
) {
  const frame = meshFaceFrame(mesh, faceId)
  const { face } = frame
  requireAffineFaceUv(frame)
  const ends = ids
    .map((id) => face.corners.findIndex((c) => c.vertexId === id))
    .sort((a, b) => a - b)
  const start = ends[0]!
  const end = ends[1]!
  requireScene(
    start >= 0 && end - start > 1 && end - start < face.corners.length - 1,
    'vertices',
    'Escolha dois pontos de lados diferentes da mesma face.',
  )
  const left = { ...face, corners: face.corners.slice(start, end + 1) }
  const right = {
    ...face,
    corners: [...face.corners.slice(end), ...face.corners.slice(0, start + 1)],
  }
  const divided = { ...mesh, faces: { left, right } }
  for (const id of ['left', 'right']) {
    const child = meshFaceFrame(divided, id)
    requireScene(
      dot(frame.normal, child.normal) >= 1 - 1e-10,
      'faces',
      'Esse corte passaria por fora da face. Escolha outro par de pontos.',
    )
  }
  // Keep the source identity with its original first corner.
  return start === 0 ? ([left, right] as const) : ([right, left] as const)
}
