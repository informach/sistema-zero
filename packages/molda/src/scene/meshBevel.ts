import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { dot, normalize, sub } from '../model/vec'
import type { SceneMeshFace, SceneMeshGeometry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { meshFaceFrame } from './meshFaceFrame'
import { cutMeshByPlane } from './meshPlaneCut'
import { indexMeshEdges, meshEdgeKey, meshFaceRegion, meshIdAllocator } from './meshTopology'
import { number, requireScene } from './validation'

/** A localized flat chamfer of one outward corner. Other corners/solids cannot be clipped by this command. */
export function bevelMeshEdge(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  depth: number,
  nextId: () => string = newId,
) {
  number(depth, 'depth', 0)
  const chosen = [...new Set(ids)]
  requireScene(chosen.length === 1, 'edges', 'Escolha uma quina de cada vez para chanfrar.')
  const topology = indexMeshEdges(mesh)
  const incident = topology.edges.get(chosen[0]!)
  requireScene(
    incident?.length === 2 && incident[0]!.a === incident[1]!.b,
    'edges',
    'Escolha uma linha entre duas faces de uma peça fechada.',
  )
  if (depth === 0) return { mesh, edgeIds: [] }
  const first = meshFaceFrame(mesh, incident[0]!.faceId)
  const second = meshFaceFrame(mesh, incident[1]!.faceId)
  const alignment = dot(first.normal, second.normal)
  requireScene(
    Math.abs(alignment) < 1 - 1e-10,
    'edges',
    'Essa linha não forma uma quina para chanfrar.',
  )
  for (const [frame, neighbor] of [
    [first, second],
    [second, first],
  ] as const) {
    requireScene(
      neighbor.points.every(
        (p) =>
          dot(
            sub(p, frame.origin).map((v) => v / Math.max(frame.extent, neighbor.extent)) as Vec3,
            frame.normal,
          ) <= 1e-10,
      ),
      'edges',
      'Escolha uma quina voltada para fora da peça.',
    )
  }
  const a = incident[0]!.a,
    b = incident[0]!.b
  const normal = normalize(first.normal.map((v, axis) => v + second.normal[axis]!) as Vec3)
  const anchor = mesh.vertices[a]!
  const origin = anchor.map((v, axis) => number(v - normal[axis]! * depth, 'depth')) as Vec3
  const members = new Set(meshFaceRegion(topology, [incident[0]!.faceId]))
  const regionVertices = new Set<string>()
  for (const faceId of members)
    for (const c of mesh.faces[faceId]!.corners) regionVertices.add(c.vertexId)
  for (const edges of topology.edges.values()) {
    if (!members.has(edges[0]!.faceId)) continue
    requireScene(
      edges.length === 2 && edges[0]!.a === edges[1]!.b,
      'edges',
      'Feche as bordas e ajuste faces viradas antes de chanfrar essa peça.',
    )
  }
  for (const id of regionVertices) {
    const distance = number(dot(sub(mesh.vertices[id]!, origin), normal), 'depth')
    requireScene(
      id === a || id === b ? distance > 0 : distance <= 0,
      'depth',
      'Esse chanfro alcançaria outra quina. Use uma profundidade menor.',
    )
  }
  const region: SceneMeshGeometry = {
    ...mesh,
    vertices: Object.fromEntries([...regionVertices].map((id) => [id, mesh.vertices[id]!])),
    faces: Object.fromEntries([...members].map((id) => [id, mesh.faces[id]!])),
    looseEdges: [],
  }
  const allocate = meshIdAllocator(mesh, nextId)
  const cut = cutMeshByPlane(region, { origin, normal }, allocate)
  const retained = Object.fromEntries(
    Object.entries(cut.mesh.faces)
      .filter(([id]) => cut.faceSides.get(id) === -1)
      .map(([id, face]) => [cut.sourceFaceIds.get(id)!, face]),
  )
  requireScene(
    Object.keys(retained).length === members.size,
    'depth',
    'Esse chanfro apagaria uma face. Use uma profundidade menor.',
  )
  const open = indexMeshEdges({ ...cut.mesh, faces: retained })
  const boundary = [...open.edges.values()]
    .filter((edges) => edges.length === 1)
    .map((edges) => edges[0]!)
  requireScene(
    boundary.length >= 3 && boundary.length <= SCENE_LIMITS.faceCorners,
    'edges',
    'Não foi possível fechar esse chanfro dentro do limite de cantos.',
  )
  // Reverse the boundary of the retained solid to close it with a consistently oriented new face.
  const next = new Map<string, string>()
  const incoming = new Set<string>()
  for (const edge of boundary) {
    requireScene(
      !next.has(edge.b) && !incoming.has(edge.a),
      'edges',
      'Essa quina tem ligações sobrepostas. Ajuste os pontos antes de chanfrar.',
    )
    next.set(edge.b, edge.a)
    incoming.add(edge.a)
  }
  const cycle: string[] = []
  const seen = new Set<string>()
  let current = boundary[0]!.b
  while (!seen.has(current)) {
    seen.add(current)
    cycle.push(current)
    const target = next.get(current)
    requireScene(target !== undefined, 'edges', 'O chanfro não formou uma borda fechada.')
    current = target
  }
  requireScene(
    current === cycle[0] && cycle.length === boundary.length,
    'edges',
    'Essa quina precisa de mais de uma tampa. Escolha outra linha.',
  )
  const capId = allocate()
  const cap: SceneMeshFace = {
    ...(first.face.materialId === undefined ? {} : { materialId: first.face.materialId }),
    corners: cycle.map((vertexId) => ({ vertexId, uv: [0, 0] as Vec2 })),
  }
  const capFrame = meshFaceFrame({ ...cut.mesh, faces: { [capId]: cap } }, capId)
  requireScene(
    dot(capFrame.normal, normal) > 1 - 1e-10,
    'faces',
    'A tampa do chanfro ficou virada. Tente uma profundidade menor.',
  )
  cap.corners = cap.corners.map((corner) => ({
    ...corner,
    uv: capFrame.project(cut.mesh.vertices[corner.vertexId]!),
  }))
  const faces = { ...mesh.faces, ...retained, [capId]: cap }
  const used = new Set(Object.values(faces).flatMap((face) => face.corners.map((c) => c.vertexId)))
  for (const edge of mesh.looseEdges) for (const id of edge) used.add(id)
  const vertices = Object.fromEntries(
    Object.entries({ ...mesh.vertices, ...cut.mesh.vertices }).filter(
      ([id]) => used.has(id) || (Object.hasOwn(mesh.vertices, id) && !regionVertices.has(id)),
    ),
  )
  requireScene(
    Object.keys(vertices).length <= SCENE_LIMITS.vertices &&
      Object.values(faces).reduce((sum, face) => sum + face.corners.length - 2, 0) <=
        SCENE_LIMITS.triangles,
    'faces',
    'Esse chanfro ultrapassa o orçamento da malha.',
  )
  return {
    mesh: { ...mesh, vertices, faces },
    edgeIds: cycle.map((id, i) => meshEdgeKey(id, cycle[(i + 1) % cycle.length]!)),
  }
}

/**
 * Chanfra várias quinas, uma de cada vez, sobre o resultado da anterior.
 *
 * ⚠️ Cada chanfro reescreve a topologia, então os IDS de linha mudam entre as passadas:
 * a identidade que atravessa é o PAR DE PONTOS. Uma quina que desapareceu (porque a
 * anterior a consumiu, o caso de duas quinas vizinhas) recusa a operação INTEIRA, em vez
 * de deixar a peça pela metade. Multisseleção é atômica, como em todo o resto.
 */
export function bevelMeshEdges(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  depth: number,
  nextId: () => string = newId,
) {
  const chosen = [...new Set(ids)]
  requireScene(chosen.length > 0, 'edges', 'Escolha uma linha para chanfrar.')
  if (chosen.length === 1) return bevelMeshEdge(mesh, chosen, depth, nextId)
  const topology = indexMeshEdges(mesh)
  const pairs = chosen.map((id) => {
    const incident = topology.edges.get(id)
    requireScene(incident?.length === 2, 'edges', 'Escolha linhas entre duas faces da peça.')
    return [incident![0]!.a, incident![0]!.b] as const
  })
  let current = mesh
  const edgeIds: string[] = []
  for (const [a, b] of pairs) {
    if (depth === 0) break
    const edges = indexMeshEdges(current).edges
    const key = edges.has(meshEdgeKey(a, b)) ? meshEdgeKey(a, b) : null
    requireScene(
      key !== null,
      'edges',
      'Uma dessas quinas deixou de existir depois de chanfrar a anterior. Escolha quinas separadas.',
    )
    const result = bevelMeshEdge(current, [key!], depth, nextId)
    current = result.mesh
    edgeIds.push(...result.edgeIds)
  }
  return { mesh: current, edgeIds }
}
