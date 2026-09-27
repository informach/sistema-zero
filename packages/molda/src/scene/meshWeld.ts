import type { SceneMeshFace, SceneMeshGeometry } from './document'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { requireScene } from './validation'

/** Exact-coordinate repair only. Unselected points never join; positions and per-corner UV never move. */
export function prepareMeshWeld(mesh: SceneMeshGeometry, ids: readonly string[]) {
  const selected = [...new Set(ids)]
  const positions = new Map<string, string>()
  const replacement = new Map<string, string>()
  const survivors = new Set<string>()
  for (const id of selected) {
    requireScene(Object.hasOwn(mesh.vertices, id), 'vertices', 'Esse ponto não existe mais.')
    const key = JSON.stringify(mesh.vertices[id])
    const first = positions.get(key)
    if (first === undefined) positions.set(key, id)
    else {
      replacement.set(id, first)
      survivors.add(first)
    }
  }
  const mapped = (id: string) => replacement.get(id) ?? id
  const changedFaces = new Map<string, SceneMeshFace>()
  let blockedReason: string | null = null
  for (const [id, face] of Object.entries(mesh.faces)) {
    if (!face.corners.some((corner) => replacement.has(corner.vertexId))) continue
    const corners = face.corners.map((corner) =>
      replacement.has(corner.vertexId) ? { ...corner, vertexId: mapped(corner.vertexId) } : corner,
    )
    if (new Set(corners.map((corner) => corner.vertexId)).size !== corners.length)
      blockedReason =
        'Dois desses pontos estão na mesma face. A união repetiria um canto; ajuste essa face primeiro.'
    changedFaces.set(id, { ...face, corners })
  }
  if (replacement.size && !blockedReason) {
    const joinedEdges = new Map<
      string,
      { sources: Set<string>; directions: Array<readonly [string, string]> }
    >()
    for (const [key, incident] of indexMeshEdges(mesh).edges) {
      const a = mapped(incident[0]!.a)
      const b = mapped(incident[0]!.b)
      const target = meshEdgeKey(a, b)
      const joined = joinedEdges.get(target) ?? { sources: new Set(), directions: [] }
      joined.sources.add(key)
      for (const edge of incident) joined.directions.push([mapped(edge.a), mapped(edge.b)])
      joinedEdges.set(target, joined)
    }
    for (const { sources, directions } of joinedEdges.values()) {
      if (sources.size <= 1) continue
      if (
        directions.length > 2 ||
        (directions.length === 2 && directions[0]![0] !== directions[1]![1])
      ) {
        blockedReason =
          'A união sobreporia faces ou juntaria lados virados. Escolha outro grupo de pontos.'
        break
      }
    }
  }
  // Preserve all unrelated lines, even preexisting duplicates. Only remapped lines can collapse or combine.
  const existing = new Set(
    mesh.looseEdges
      .filter(([a, b]) => !replacement.has(a) && !replacement.has(b))
      .map(([a, b]) => meshEdgeKey(a, b)),
  )
  const looseEdges: SceneMeshGeometry['looseEdges'] = []
  for (const edge of mesh.looseEdges) {
    const [a, b] = edge
    if (!replacement.has(a) && !replacement.has(b)) {
      looseEdges.push(edge)
      continue
    }
    const next: [string, string] = [mapped(a), mapped(b)]
    const key = meshEdgeKey(...next)
    if (next[0] === next[1] || existing.has(key)) continue
    existing.add(key)
    looseEdges.push(next)
  }
  return {
    points: replacement.size,
    groups: survivors.size,
    faces: changedFaces.size,
    looseEdges: mesh.looseEdges.length - looseEdges.length,
    blockedReason,
    ids: [...new Set(selected.map(mapped))],
    apply(): SceneMeshGeometry {
      requireScene(!blockedReason, 'vertices', blockedReason ?? '')
      if (!replacement.size) return mesh
      return {
        ...mesh,
        vertices: Object.fromEntries(
          Object.entries(mesh.vertices).filter(([id]) => !replacement.has(id)),
        ),
        faces: Object.fromEntries(
          Object.entries(mesh.faces).map(([id, face]) => [id, changedFaces.get(id) ?? face]),
        ),
        looseEdges,
      }
    },
  }
}
