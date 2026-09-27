import { dot, sub } from '../model/vec'
import type { SceneMeshFace, SceneMeshGeometry } from './document'
import { SCENE_LIMITS } from './limits'
import { meshFaceFrame, requireMatchingFaceUv } from './meshFaceFrame'
import { indexMeshEdges, meshEdgeKey, meshFaceRegion, type SceneHalfEdge } from './meshTopology'
import { requireScene } from './validation'

/** Dissolve internal boundaries of each selected disk, never fill holes or reinterpret paint. */
export function mergeMeshFaces(mesh: SceneMeshGeometry, ids: readonly string[]): SceneMeshGeometry {
  return mergeRegions(mesh, ids, indexMeshEdges(mesh))
}

/** Only chosen internal lines disappear. A partially chosen cycle is not silently completed. */
export function dissolveMeshEdges(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
): SceneMeshGeometry {
  if (!ids.length) return mesh
  const topology = indexMeshEdges(mesh)
  const chosen = new Set(ids)
  const faces = new Set<string>()
  for (const id of chosen) {
    const incident = topology.edges.get(id)
    requireScene(
      incident?.length === 2,
      'edges',
      'Escolha linhas entre duas faces. Para retirar bordas ou linhas soltas, use Apagar.',
    )
    for (const edge of incident) faces.add(edge.faceId)
  }
  const merged = mergeRegions(mesh, [...faces], topology, chosen)
  const looseEdges = mesh.looseEdges.filter(([a, b]) => !chosen.has(meshEdgeKey(a, b)))
  return looseEdges.length === mesh.looseEdges.length ? merged : { ...merged, looseEdges }
}

function mergeRegions(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  topology: ReturnType<typeof indexMeshEdges>,
  cross?: ReadonlySet<string>,
): SceneMeshGeometry {
  const chosen = new Set(ids)
  for (const id of chosen)
    requireScene(Object.hasOwn(mesh.faces, id), 'faces', 'Essa face não existe mais.')
  if (chosen.size < 2) return mesh
  const visited = new Set<string>()
  const replacements = new Map<string, SceneMeshFace>()
  const removed = new Set<string>()
  for (const seed of chosen) {
    if (visited.has(seed)) continue
    const region = meshFaceRegion(topology, [seed], chosen, cross)
    for (const id of region) visited.add(id)
    if (region.length === 1) continue
    const members = new Set(region)
    const first = meshFaceFrame(mesh, seed)
    const boundary: SceneHalfEdge[] = []
    for (const id of region) {
      const current = meshFaceFrame(mesh, id)
      requireScene(
        first.face.materialId === current.face.materialId,
        'materials',
        'Essas faces usam materiais diferentes. Escolha faces com o mesmo material para juntar.',
      )
      requireScene(
        dot(first.normal, current.normal) >= 1 - 1e-10 &&
          current.points.every((point) => {
            const delta = sub(point, first.origin)
            const extent = Math.max(first.extent, current.extent, ...delta.map(Math.abs))
            return (
              Math.abs(
                dot([delta[0] / extent, delta[1] / extent, delta[2] / extent], first.normal),
              ) <= 1e-10
            )
          }),
        'faces',
        'Escolha faces planas voltadas para o mesmo lado para juntar.',
      )
      for (const key of topology.byFace.get(id)!) {
        const incident = topology.edges.get(key)!
        requireScene(
          incident.length <= 2 && (incident.length === 1 || incident[0]!.a === incident[1]!.b),
          'faces',
          'Há faces sobrepostas ou viradas nessa ligação. Ajuste a ligação antes de juntar.',
        )
        if (incident.filter((edge) => members.has(edge.faceId)).length === 1)
          boundary.push(incident.find((edge) => edge.faceId === id)!)
        else
          requireScene(
            !cross || cross.has(key),
            'edges',
            'Faltam linhas dentro dessa região. Escolha todas as linhas internas para juntar suas faces.',
          )
      }
    }
    const corners = boundaryCorners(mesh, boundary)
    const merged = { ...first.face, corners }
    const frame = meshFaceFrame({ ...mesh, faces: { [seed]: merged } }, seed)
    requireMatchingFaceUv(
      frame,
      region.flatMap((id) =>
        mesh.faces[id]!.corners.map((corner) => ({
          point: mesh.vertices[corner.vertexId]!,
          uv: corner.uv,
        })),
      ),
      'A pintura muda nessas ligações. Mantenha as faces separadas para preservar o desenho.',
    )
    replacements.set(seed, merged)
    for (const id of region) if (id !== seed) removed.add(id)
  }
  if (!removed.size) return mesh
  return {
    ...mesh,
    faces: Object.fromEntries(
      Object.entries(mesh.faces)
        .filter(([id]) => !removed.has(id))
        .map(([id, face]) => [id, replacements.get(id) ?? face]),
    ),
  }
}

function boundaryCorners(mesh: SceneMeshGeometry, boundary: readonly SceneHalfEdge[]) {
  requireScene(boundary.length >= 3, 'faces', 'Escolha faces com um contorno aberto ao redor.')
  requireScene(
    boundary.length <= SCENE_LIMITS.faceCorners,
    'faces',
    'O contorno tem pontos demais para uma só face. Junte menos faces por vez.',
  )
  const outgoing = new Map<string, SceneHalfEdge>()
  const incoming = new Set<string>()
  for (const edge of boundary) {
    requireScene(
      !outgoing.has(edge.a) && !incoming.has(edge.b),
      'faces',
      'O contorno se encontra num ponto. Escolha uma região menor para juntar.',
    )
    outgoing.set(edge.a, edge)
    incoming.add(edge.b)
  }
  const first = boundary[0]!
  const corners: SceneMeshFace['corners'] = []
  let vertex = first.a
  do {
    const edge = outgoing.get(vertex)
    requireScene(edge && outgoing.delete(edge.a), 'faces', 'O contorno não fecha corretamente.')
    corners.push(mesh.faces[edge.faceId]!.corners[edge.corner]!)
    vertex = edge.b
  } while (vertex !== first.a)
  requireScene(
    outgoing.size === 0,
    'faces',
    'Há um buraco entre essas faces. Escolha uma região sem buracos para juntar.',
  )
  return corners
}
