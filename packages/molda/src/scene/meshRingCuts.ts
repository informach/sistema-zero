import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { requireMeshOperationBudget } from './meshComponentOperations'
import { meshFaceFrame, requireConvexMeshFace } from './meshFaceFrame'
import { indexMeshEdges, meshEdgeKey, meshIdAllocator } from './meshTopology'
import { requireScene } from './validation'

/** Orient the strip from the seed, so off-center cuts never flip on alternate faces. */
export function cutMeshEdgeRings(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  count = 1,
  offset = 0,
  nextId = newId,
) {
  requireScene(ids.length === 1, 'edges', 'Escolha uma linha para começar o corte da faixa.')
  requireScene(
    Number.isInteger(count) && count >= 1 && count <= 16,
    'count',
    'Escolha de 1 a 16 cortes.',
  )
  const positions = Array.from({ length: count }, (_, i) => (i + 1) / (count + 1) + offset)
  requireScene(
    Number.isFinite(offset) && positions.every((t) => t > 1e-8 && t < 1 - 1e-8),
    'position',
    'Mantenha todos os cortes dentro das linhas da faixa.',
  )
  const topology = indexMeshEdges(mesh),
    seed = topology.edges.get(ids[0]!)?.[0]
  requireScene(seed, 'edges', 'Escolha uma linha ligada a uma face com 4 lados.')
  const directions = new Map<string, readonly [string, string]>([
      [ids[0]!, [seed.a, seed.b].sort() as [string, string]],
    ]),
    queue = [ids[0]!],
    affected = new Set<string>(),
    borders = new Set<string>()
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i]!,
      [u] = directions.get(key)!,
      incidents = topology.edges.get(key)!
    requireScene(
      incidents.length <= 2 && (incidents.length === 1 || incidents[0]!.a === incidents[1]!.b),
      'edges',
      'Essa faixa tem uma bifurcação ou faces viradas. Tente o corte Livre.',
    )
    for (const incident of incidents) {
      const face = mesh.faces[incident.faceId]!,
        cycle = topology.byFace.get(incident.faceId)!
      if (cycle.length !== 4) {
        borders.add(incident.faceId)
        continue
      }
      affected.add(incident.faceId)
      const at = cycle.indexOf(key),
        opposite = cycle[(at + 2) % 4]!,
        c = face.corners[(at + 2) % 4]!.vertexId,
        d = face.corners[(at + 3) % 4]!.vertexId
      const direction: readonly [string, string] = u === incident.a ? [d, c] : [c, d]
      const old = directions.get(opposite)
      requireScene(
        !old || old[0] === direction[0],
        'faces',
        'Essa faixa cruza a si mesma. Escolha outra linha para começar.',
      )
      if (!old) {
        directions.set(opposite, direction)
        queue.push(opposite)
      }
    }
  }
  requireScene(affected.size > 0, 'faces', 'Escolha uma linha ligada a uma face com 4 lados.')
  for (const id of affected) {
    requireScene(
      topology.byFace.get(id)!.filter((key) => directions.has(key)).length === 2,
      'faces',
      'Essa faixa cruza a si mesma. Tente o corte Livre.',
    )
    const frame = meshFaceFrame(mesh, id, { allowNonPlanar: true })
    requireConvexMeshFace(
      frame,
      'Esse caminho precisa de faces com 4 lados sem dobras. Tente o corte Livre.',
    )
  }
  let borderTriangles = 0
  for (const id of borders) {
    const added = topology.byFace.get(id)!.filter((key) => directions.has(key)).length * count
    requireScene(
      mesh.faces[id]!.corners.length + added <= SCENE_LIMITS.faceCorners,
      'faces',
      'Uma face ligada teria pontos demais. Use menos cortes.',
    )
    meshFaceFrame(mesh, id, { allowNonPlanar: true })
    borderTriangles += added
  }
  requireMeshOperationBudget(
    mesh,
    directions.size * count,
    affected.size * count * 2 + borderTriangles,
  )
  requireScene(
    mesh.looseEdges.length +
      mesh.looseEdges.filter(([a, b]) => directions.has(meshEdgeKey(a, b))).length * count <=
      SCENE_LIMITS.looseEdges,
    'edges',
    'Esse corte ultrapassa o orçamento de linhas da malha.',
  )
  const allocate = meshIdAllocator(mesh, nextId),
    vertices = { ...mesh.vertices },
    faces = { ...mesh.faces },
    points = new Map<string, string[]>(),
    edgeIds: string[] = [],
    faceIds: string[] = [],
    segments: Array<readonly [Vec3, Vec3]> = []
  for (const [key, [a, b]] of directions)
    points.set(
      key,
      positions.map((t) => {
        const id = allocate()
        vertices[id] = mesh.vertices[a]!.map(
          (n, axis) => n * (1 - t) + mesh.vertices[b]![axis]! * t,
        ) as Vec3
        return id
      }),
    )
  const lerp = (u: Vec2, v: Vec2, t: number): Vec2 => [
    u[0] * (1 - t) + v[0] * t,
    u[1] * (1 - t) + v[1] * t,
  ]
  for (const id of borders) {
    const face = mesh.faces[id]!
    faces[id] = {
      ...face,
      corners: face.corners.flatMap((corner, i) => {
        const next = face.corners[(i + 1) % face.corners.length]!
        const key = meshEdgeKey(corner.vertexId, next.vertexId)
        const inserted = points.get(key)
        if (!inserted) return [corner]
        const forward = directions.get(key)![0] === corner.vertexId
        const ids = forward ? inserted : [...inserted].reverse()
        const ts = forward ? positions : positions.map((t) => 1 - t).reverse()
        return [
          corner,
          ...ids.map((vertexId, j) => ({ vertexId, uv: lerp(corner.uv, next.uv, ts[j]!) })),
        ]
      }),
    }
  }
  for (const id of affected) {
    const face = mesh.faces[id]!,
      cycle = topology.byFace.get(id)!,
      at = cycle.findIndex((key) => directions.has(key)),
      key = cycle[at]!,
      opposite = cycle[(at + 2) % 4]!
    const [a, b, c, d] = Array.from({ length: 4 }, (_, i) => face.corners[(at + i) % 4]!) as [
      (typeof face.corners)[number],
      (typeof face.corners)[number],
      (typeof face.corners)[number],
      (typeof face.corners)[number],
    ]
    const forward = directions.get(key)![0] === a.vertexId,
      ts = forward ? positions : positions.map((t) => 1 - t).reverse(),
      first = forward ? points.get(key)! : [...points.get(key)!].reverse()
    const last =
      directions.get(opposite)![0] === d.vertexId
        ? points.get(opposite)!
        : [...points.get(opposite)!].reverse()
    const left = [
        a,
        ...first.map((vertexId, i) => ({ vertexId, uv: lerp(a.uv, b.uv, ts[i]!) })),
        b,
      ],
      right = [d, ...last.map((vertexId, i) => ({ vertexId, uv: lerp(d.uv, c.uv, ts[i]!) })), c]
    for (let j = 0; j <= count; j++) {
      const target = j === 0 ? id : allocate()
      faces[target] = { ...face, corners: [left[j]!, left[j + 1]!, right[j + 1]!, right[j]!] }
      faceIds.push(target)
    }
    for (let j = 0; j < count; j++) {
      edgeIds.push(meshEdgeKey(first[j]!, last[j]!))
      segments.push([vertices[first[j]!]!, vertices[last[j]!]!])
    }
  }
  const looseEdges = mesh.looseEdges.flatMap(([a, b]) => {
    const key = meshEdgeKey(a, b),
      inserted = points.get(key)
    if (!inserted) return [[a, b] as [string, string]]
    const chain = [a, ...(directions.get(key)![0] === a ? inserted : [...inserted].reverse()), b]
    return chain.slice(1).map((end, i) => [chain[i]!, end] as [string, string])
  })
  return { mesh: { ...mesh, vertices, faces, looseEdges }, faceIds, edgeIds, segments }
}
