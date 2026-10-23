import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { sub } from '../model/vec'
import type { SceneMeshGeometry, Vec2 } from './document'
import { SCENE_LIMITS } from './limits'
import { meshFaceFrame, meshFaceSurfaceUv } from './meshFaceFrame'
import { knifeFaceRegions, knifeInside, knifeOnSegment } from './meshKnifeGraph'
import { indexMeshEdges, meshEdgeKey, meshIdAllocator } from './meshTopology'
import { requireScene, tuple } from './validation'

export type MeshKnifePoint =
  | { kind: 'vertex'; vertexId: string }
  | { kind: 'edge'; edgeId: string; t: number }
  | { kind: 'face'; faceId: string; point: Vec3 }
type Point = {
  id: string
  position: Vec3
  faces: ReadonlySet<string>
  edge?: { id: string; t: number }
}

export function meshKnifePointPosition(
  mesh: SceneMeshGeometry,
  point: MeshKnifePoint,
  topology = indexMeshEdges(mesh),
): Vec3 {
  if (point.kind === 'face') {
    tuple(point.point, 3, 'point')
    return point.point
  }
  if (point.kind === 'vertex') {
    requireScene(
      Object.hasOwn(mesh.vertices, point.vertexId),
      'point',
      'Esse ponto não existe mais.',
    )
    return mesh.vertices[point.vertexId]!
  }
  const incident = topology.edges.get(point.edgeId)?.[0]
  requireScene(
    incident && Number.isFinite(point.t) && point.t >= 0 && point.t <= 1,
    'point',
    'Essa posição na linha não está disponível.',
  )
  const [a, b] = [incident.a, incident.b].sort() as [string, string]
  return [0, 1, 2].map(
    (axis) => (1 - point.t) * mesh.vertices[a]![axis]! + point.t * mesh.vertices[b]![axis]!,
  ) as Vec3
}

/** Pure surface subdivision: one piece, no caps, per-corner UVs, shared edge vertices. */
export function cutMeshWithKnife(
  mesh: SceneMeshGeometry,
  path: readonly MeshKnifePoint[],
  nextId: () => string = newId,
) {
  requireScene(
    path.length >= 2 && path.length <= 64,
    'cut',
    'Marque de 2 a 64 pontos para cortar as faces.',
  )
  const topology = indexMeshEdges(mesh),
    taken = new Set([...Object.keys(mesh.vertices), ...Object.keys(mesh.faces)])
  let serial = 0
  const temporary = () => {
    let id = `knife:${serial++}`
    while (taken.has(id)) id = `knife:${serial++}`
    taken.add(id)
    return id
  }
  const frames = new Map<string, ReturnType<typeof meshFaceFrame>>()
  function frame(id: string) {
    let value = frames.get(id)
    if (!value) {
      value = meshFaceFrame(mesh, id, { allowNonPlanar: true })
      frames.set(id, value)
    }
    return value
  }
  const vertices = { ...mesh.vertices },
    points: Point[] = []
  function vertex(id: string): Point {
    requireScene(
      Object.hasOwn(mesh.vertices, id),
      'vertices',
      'Esse ponto não existe mais. Marque o corte novamente.',
    )
    return {
      id,
      position: mesh.vertices[id]!,
      faces: new Set(
        Object.entries(mesh.faces)
          .filter(([, face]) => face.corners.some((corner) => corner.vertexId === id))
          .map(([id]) => id),
      ),
    }
  }
  function edge(id: string, t: number): Point {
    const incidents = topology.edges.get(id)
    requireScene(
      incidents && Number.isFinite(t) && t >= 0 && t <= 1,
      'edge',
      'Escolha uma posição válida em uma linha da peça.',
    )
    const [a, b] = [incidents[0]!.a, incidents[0]!.b].sort() as [string, string]
    if (t <= 1e-10) return vertex(a)
    if (t >= 1 - 1e-10) return vertex(b)
    const found = points.find((p) => p.edge?.id === id && Math.abs(p.edge.t - t) <= 1e-10)
    if (found) return found
    const position: Vec3 = [0, 1, 2].map(
      (axis) => (1 - t) * mesh.vertices[a]![axis]! + t * mesh.vertices[b]![axis]!,
    ) as Vec3
    return {
      id: temporary(),
      position,
      faces: new Set(incidents.map((entry) => entry.faceId)),
      edge: { id, t },
    }
  }
  function resolve(input: MeshKnifePoint): Point {
    if (input.kind === 'vertex') return vertex(input.vertexId)
    if (input.kind === 'edge') return edge(input.edgeId, input.t)
    tuple(input.point, 3, 'point')
    const current = frame(input.faceId),
      projected = current.project(input.point)
    requireScene(
      knifeInside(projected, current.projected),
      'point',
      'Marque os pontos sobre a superfície visível da face.',
    )
    meshFaceSurfaceUv(current, input.point)
    for (let i = 0; i < current.face.corners.length; i++) {
      const a = current.face.corners[i]!.vertexId,
        b = current.face.corners[(i + 1) % current.face.corners.length]!.vertexId
      const t = knifeOnSegment(
        current.projected[i]!,
        current.projected[(i + 1) % current.projected.length]!,
        projected,
      )
      if (t !== null) return edge(meshEdgeKey(a, b), Math.max(0, Math.min(1, a < b ? t : 1 - t)))
    }
    const found = points.find(
      (p) =>
        !p.edge &&
        p.faces.has(input.faceId) &&
        Math.hypot(...sub(p.position, input.point)) <= current.extent * 1e-10,
    )
    return found ?? { id: temporary(), position: [...input.point], faces: new Set([input.faceId]) }
  }
  for (const input of path) {
    const point = resolve(input)
    points.push(point)
    if (!Object.hasOwn(vertices, point.id)) vertices[point.id] = point.position
  }
  const cuts = new Map<string, Array<readonly [string, string]>>()
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!
    requireScene(a.id !== b.id, 'cut', 'Esse ponto já está marcado. Escolha outro lugar.')
    const common = [...a.faces].filter((id) => b.faces.has(id))
    requireScene(
      common.length === 1,
      'cut',
      common.length
        ? 'Já existe uma linha entre esses pontos. Corte por dentro de uma face.'
        : 'Ligue pontos de uma mesma face. Marque um ponto na borda antes de continuar na próxima face.',
    )
    const id = common[0]!
    frame(id)
    const list = cuts.get(id) ?? []
    list.push([a.id, b.id])
    cuts.set(id, list)
  }
  const edgePoints = new Map<string, Point[]>()
  for (const point of points)
    if (point.edge) {
      const list = edgePoints.get(point.edge.id) ?? []
      if (!list.some((other) => other.id === point.id)) list.push(point)
      edgePoints.set(
        point.edge.id,
        list.sort((a, b) => a.edge!.t - b.edge!.t),
      )
    }
  const faces = { ...mesh.faces },
    faceIds: string[] = [],
    segments: Array<readonly [Vec3, Vec3]> = []
  for (const [faceId, face] of Object.entries(mesh.faces)) {
    let split = false
    const corners = face.corners.flatMap((corner, i) => {
      const next = face.corners[(i + 1) % face.corners.length]!
      const inserted = edgePoints.get(meshEdgeKey(corner.vertexId, next.vertexId))
      if (!inserted) return [corner]
      split = true
      return [
        corner,
        ...(corner.vertexId < next.vertexId ? inserted : [...inserted].reverse()).map((point) => {
          const t = corner.vertexId < next.vertexId ? point.edge!.t : 1 - point.edge!.t
          return {
            vertexId: point.id,
            uv: [0, 1].map((axis) => (1 - t) * corner.uv[axis]! + t * next.uv[axis]!) as Vec2,
          }
        }),
      ]
    })
    if (!cuts.has(faceId)) {
      if (split) {
        frame(faceId)
        faces[faceId] = { ...face, corners }
      }
      continue
    }
    const current = frame(faceId),
      flat = new Map(
        corners.map((corner) => [corner.vertexId, current.project(vertices[corner.vertexId]!)]),
      )
    for (const point of points)
      if (point.faces.has(faceId)) flat.set(point.id, current.project(point.position))
    const result = knifeFaceRegions(
      corners.map((c) => c.vertexId),
      flat,
      cuts.get(faceId)!,
    )
    const retained = result.regions.findIndex((cycle) => cycle.includes(face.corners[0]!.vertexId))
    for (let i = 0; i < result.regions.length; i++) {
      const cycle = result.regions[i]!,
        id = i === retained ? faceId : temporary()
      faces[id] = {
        ...face,
        corners: cycle.map((vertexId) => {
          const old = corners.find((corner) => corner.vertexId === vertexId)
          if (old) return old
          return {
            vertexId,
            uv: meshFaceSurfaceUv(current, vertices[vertexId]!),
          }
        }),
      }
      faceIds.push(id)
    }
    for (const [a, b] of result.lines) segments.push([vertices[a]!, vertices[b]!])
  }
  const looseEdges = mesh.looseEdges.flatMap(([a, b]) => {
    const inserted = edgePoints.get(meshEdgeKey(a, b))
    if (!inserted) return [[a, b] as [string, string]]
    const chain = [a, ...(a < b ? inserted : [...inserted].reverse()).map((p) => p.id), b]
    return chain.slice(1).map((end, i) => [chain[i]!, end] as [string, string])
  })
  const candidate = { ...mesh, vertices, faces, looseEdges }
  requireScene(
    Object.keys(vertices).length <= SCENE_LIMITS.vertices &&
      looseEdges.length <= SCENE_LIMITS.looseEdges &&
      Object.values(faces).reduce((sum, face) => sum + face.corners.length - 2, 0) <=
        SCENE_LIMITS.triangles,
    'cut',
    'Esse corte ultrapassa o orçamento da malha. Faça um traçado menor.',
  )
  for (const [id, face] of Object.entries(faces))
    if (face !== mesh.faces[id]) {
      requireScene(
        face.corners.length <= SCENE_LIMITS.faceCorners,
        'cut',
        'Uma face teria pontos demais. Faça um corte menor.',
      )
      meshFaceFrame(candidate, id, { allowNonPlanar: true })
    }
  const allocate = meshIdAllocator(mesh, nextId),
    remap = new Map<string, string>()
  for (const id of Object.keys(vertices))
    if (!Object.hasOwn(mesh.vertices, id)) remap.set(id, allocate())
  for (const id of Object.keys(faces)) if (!Object.hasOwn(mesh.faces, id)) remap.set(id, allocate())
  return {
    mesh: {
      ...mesh,
      vertices: Object.fromEntries(
        Object.entries(vertices).map(([id, point]) => [remap.get(id) ?? id, point]),
      ),
      faces: Object.fromEntries(
        Object.entries(faces).map(([id, face]) => [
          remap.get(id) ?? id,
          face === mesh.faces[id]
            ? face
            : {
                ...face,
                corners: face.corners.map((corner) =>
                  remap.has(corner.vertexId)
                    ? { ...corner, vertexId: remap.get(corner.vertexId)! }
                    : corner,
                ),
              },
        ]),
      ),
      looseEdges: edgePoints.size
        ? looseEdges.map(([a, b]): [string, string] => [remap.get(a) ?? a, remap.get(b) ?? b])
        : mesh.looseEdges,
    },
    faceIds: faceIds.map((id) => remap.get(id) ?? id),
    segments,
  }
}
