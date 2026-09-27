import { newId } from '../core/id'
import type { SceneMeshGeometry } from './document'
import { selectMeshComponents } from './meshComponents'
import { prepareMeshFaceCut } from './meshCut'
import { splitMeshEdges } from './meshEdges'
import { indexMeshEdges, meshEdgeKey, meshIdAllocator } from './meshTopology'
import { requireScene } from './validation'

/** One midpoint cut through a quad strip, including shared endpoints in uncut neighboring faces. */
export function cutMeshEdgeRing(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  nextId: () => string = newId,
): { mesh: SceneMeshGeometry; edgeIds: string[] } {
  const seed = [...new Set(ids)]
  requireScene(seed.length === 1, 'edges', 'Escolha uma linha para começar o corte da faixa.')
  const topology = indexMeshEdges(mesh)
  requireScene(topology.edges.has(seed[0]!), 'edges', 'Escolha uma linha ligada a uma face.')
  const ring = selectMeshComponents(mesh, { mode: 'edge', ids: seed }, 'ring')
  const chosen = new Set(ring)
  const affected = new Set<string>()
  for (const id of ring) {
    const incident = topology.edges.get(id)!
    requireScene(
      incident.length <= 2 && (incident.length === 1 || incident[0]!.a === incident[1]!.b),
      'edges',
      'Essa faixa passa por uma ligação com faces sobrepostas ou viradas. Ajuste a ligação primeiro.',
    )
    for (const edge of incident) affected.add(edge.faceId)
  }
  const crossings = new Map<string, readonly [string, string]>()
  for (const id of affected) {
    const cycle = topology.byFace.get(id)!
    if (cycle.length !== 4) continue
    const entered = cycle.filter((key) => chosen.has(key))
    requireScene(
      entered.length === 2 && (cycle.indexOf(entered[0]!) + 2) % 4 === cycle.indexOf(entered[1]!),
      'faces',
      'Essa faixa volta e cruza a si mesma. Escolha outra linha para começar.',
    )
    crossings.set(id, [entered[0]!, entered[1]!])
  }
  requireScene(crossings.size > 0, 'faces', 'Escolha uma linha de uma face com quatro pontos.')
  // Splitting owns the budget, Double midpoint and per-corner seam checks for every incident face.
  const split = splitMeshEdges(mesh, ring, nextId)
  const prepared = new Map<string, ReturnType<typeof prepareMeshFaceCut>>()
  const edgeIds: string[] = []
  for (const [id, [a, b]] of crossings) {
    const endpoints: [string, string] = [split.midpoints.get(a)!, split.midpoints.get(b)!]
    prepared.set(id, prepareMeshFaceCut(split.mesh, id, endpoints))
    edgeIds.push(meshEdgeKey(...endpoints))
  }
  const allocate = meshIdAllocator(split.mesh, nextId)
  const faces = { ...split.mesh.faces }
  for (const [id, [first, second]] of prepared) {
    faces[id] = first
    faces[allocate()] = second
  }
  return { mesh: { ...split.mesh, faces }, edgeIds }
}
