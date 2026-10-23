import type { Vec3 } from '../core/model'
import type { SceneMeshFace, SceneMeshGeometry, Vec2 } from './document'
import { meshFaceFrame, requireConvexMeshFace, requireMatchingFaceUv } from './meshFaceFrame'
import type { indexMeshEdges, SceneHalfEdge } from './meshTopology'
import { requireScene } from './validation'

/** Derived contour only; the selected faces and their triangulation remain authorial. */
export function prepareMeshInsetRegion(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  topology: ReturnType<typeof indexMeshEdges>,
) {
  const members = new Set(ids)
  const boundary: SceneHalfEdge[] = []
  for (const id of ids) {
    meshFaceFrame(mesh, id)
    for (const key of topology.byFace.get(id)!) {
      const incident = topology.edges.get(key)!
      requireScene(
        incident.length <= 2 &&
          (incident.length === 1 ||
            (incident[0]!.a === incident[1]!.b && incident[0]!.b === incident[1]!.a)),
        'faces',
        'Há faces sobrepostas ou viradas nessa ligação. Ajuste a ligação antes de criar a borda.',
      )
      if (incident.filter((edge) => members.has(edge.faceId)).length === 1)
        boundary.push(incident.find((edge) => edge.faceId === id)!)
    }
  }
  const edges = boundaryLoop(boundary)
  const corners = edges.map((edge) => mesh.faces[edge.faceId]!.corners[edge.corner]!)
  const contour: SceneMeshFace = { corners }
  const frame = meshFaceFrame({ ...mesh, faces: { contour } }, 'contour')
  requireConvexMeshFace(
    frame,
    'Essa região tem uma curva para dentro. Escolha uma região convexa para criar a borda.',
    true,
  )
  requireMatchingFaceUv(
    frame,
    ids.flatMap((id) =>
      mesh.faces[id]!.corners.map((corner) => ({
        point: mesh.vertices[corner.vertexId]!,
        uv: corner.uv,
      })),
    ),
    'A pintura muda entre essas faces. Escolha uma região com pintura contínua para criar a borda.',
  )
  const center: Vec3 = [0, 0, 0]
  const centerUv: Vec2 = [0, 0]
  for (const corner of corners) {
    const point = mesh.vertices[corner.vertexId]!
    for (const axis of [0, 1, 2] as const) center[axis] += point[axis] / corners.length
    for (const axis of [0, 1] as const) centerUv[axis] += corner.uv[axis] / corners.length
  }
  return { ids, edges, center, centerUv }
}

function boundaryLoop(boundary: readonly SceneHalfEdge[]) {
  requireScene(boundary.length >= 3, 'faces', 'Escolha uma região com contorno para criar a borda.')
  const outgoing = new Map<string, SceneHalfEdge>()
  const incoming = new Set<string>()
  for (const edge of boundary) {
    requireScene(
      !outgoing.has(edge.a) && !incoming.has(edge.b),
      'faces',
      'O contorno se encontra num ponto. Escolha uma região menor para criar a borda.',
    )
    outgoing.set(edge.a, edge)
    incoming.add(edge.b)
  }
  const first = boundary[0]!
  const ordered: SceneHalfEdge[] = []
  let vertex = first.a
  do {
    const edge = outgoing.get(vertex)
    requireScene(edge && outgoing.delete(vertex), 'faces', 'O contorno não fecha corretamente.')
    ordered.push(edge)
    vertex = edge.b
  } while (vertex !== first.a)
  requireScene(
    !outgoing.size,
    'faces',
    'Há um buraco entre essas faces. Escolha uma região sem buracos para criar a borda.',
  )
  return ordered
}
