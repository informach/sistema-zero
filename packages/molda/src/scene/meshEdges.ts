import { newId } from '../core/id'
import type { SceneMeshGeometry } from './document'
import { SCENE_LIMITS } from './limits'
import { meshComponentEdges } from './meshComponents'
import { meshFaceFrame, requireAffineFaceUv } from './meshFaceFrame'
import { uvMidpoint, vertexMidpoint } from './meshMidpoint'
import { meshEdgeKey, meshIdAllocator } from './meshTopology'
import { triangulateFace } from './triangulate'
import { requireScene } from './validation'

/** Split selected topological edges once, preserving every incidence and each corner's UV seam. */
export function splitMeshEdges(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  nextId: () => string = newId,
): { mesh: SceneMeshGeometry; edgeIds: string[]; midpoints: ReadonlyMap<string, string> } {
  const chosen = new Set(ids)
  if (!chosen.size) return { mesh, edgeIds: [], midpoints: new Map() }
  const edges = meshComponentEdges(mesh)
  const selected = new Map<
    string,
    { endpoints: readonly [string, string]; point: ReturnType<typeof vertexMidpoint>; id: string }
  >()
  for (const key of chosen) {
    const endpoints = edges.get(key)
    requireScene(endpoints, 'edges', 'Essa linha não existe mais. Escolha novamente.')
    const a = mesh.vertices[endpoints[0]]!
    const b = mesh.vertices[endpoints[1]]!
    const point = vertexMidpoint(a, b)
    requireScene(
      point.some((value, axis) => value !== a[axis]) &&
        point.some((value, axis) => value !== b[axis]),
      'edges',
      'Essa linha é curta demais para criar outro ponto. Sua malha foi mantida.',
    )
    selected.set(key, { endpoints, point, id: '' })
  }
  const affected = new Set<string>()
  let triangles = 0
  for (const [id, face] of Object.entries(mesh.faces)) {
    let added = 0
    for (let i = 0; i < face.corners.length; i++) {
      if (
        selected.has(
          meshEdgeKey(
            face.corners[i]!.vertexId,
            face.corners[(i + 1) % face.corners.length]!.vertexId,
          ),
        )
      )
        added++
    }
    triangles += face.corners.length - 2 + added
    if (!added) continue
    requireScene(
      face.corners.length + added <= SCENE_LIMITS.faceCorners,
      'faces',
      'Uma face ligada teria pontos demais. Divida essa face em triângulos primeiro.',
    )
    requireAffineFaceUv(meshFaceFrame(mesh, id))
    affected.add(id)
  }
  requireScene(
    triangles <= SCENE_LIMITS.triangles,
    'faces',
    'Essa divisão ultrapassa o orçamento de triângulos. Escolha menos linhas.',
  )
  requireScene(
    Object.keys(mesh.vertices).length + selected.size <= SCENE_LIMITS.vertices,
    'vertices',
    'Essa divisão ultrapassa o orçamento de pontos.',
  )
  const looseAdded = mesh.looseEdges.filter(([a, b]) => selected.has(meshEdgeKey(a, b))).length
  requireScene(
    mesh.looseEdges.length + looseAdded <= SCENE_LIMITS.looseEdges,
    'edges',
    'Essa divisão ultrapassa o orçamento de linhas.',
  )
  // No new identity or result allocation until every connected face and budget passes preflight.
  const allocate = meshIdAllocator(mesh, nextId)
  const vertices = { ...mesh.vertices }
  const edgeIds: string[] = []
  for (const edge of selected.values()) {
    edge.id = allocate()
    vertices[edge.id] = edge.point
    edgeIds.push(meshEdgeKey(edge.endpoints[0], edge.id), meshEdgeKey(edge.id, edge.endpoints[1]))
  }
  const faces = { ...mesh.faces }
  for (const id of affected) {
    const source = mesh.faces[id]!
    const corners = source.corners.flatMap((corner, i) => {
      const next = source.corners[(i + 1) % source.corners.length]!
      const edge = selected.get(meshEdgeKey(corner.vertexId, next.vertexId))
      return edge ? [corner, { vertexId: edge.id, uv: uvMidpoint(corner.uv, next.uv) }] : [corner]
    })
    requireScene(
      triangulateFace(corners.map((corner) => vertices[corner.vertexId]!)).status === 'ok',
      'faces',
      'Essa divisão ficou pequena demais para desenhar. Escolha outras linhas.',
    )
    faces[id] = { ...source, corners }
  }
  const looseEdges = mesh.looseEdges.flatMap(([a, b]): SceneMeshGeometry['looseEdges'] => {
    const edge = selected.get(meshEdgeKey(a, b))
    return edge
      ? [
          [a, edge.id],
          [edge.id, b],
        ]
      : [[a, b]]
  })
  return {
    mesh: { ...mesh, vertices, faces, looseEdges },
    edgeIds,
    midpoints: new Map([...selected].map(([key, edge]) => [key, edge.id])),
  }
}
