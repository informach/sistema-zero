import { type MeshSelectionAction, selectTopology } from '../model/topologySelection'
import type { SceneMeshGeometry } from './document'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { verticesOfMeshFaces } from './meshVertices'
import { requireScene } from './validation'

export type SceneComponentMode = 'vertex' | 'edge' | 'face'
/** Session state only. Edge IDs are canonical endpoint pairs, never triangle diagonals. */
export interface SceneComponentSelection {
  nodeId: string
  mode: SceneComponentMode
  ids: readonly string[]
}
export type SceneComponentSession = SceneComponentSelection & { geometryId: string }

export function meshComponentEdges(mesh: SceneMeshGeometry) {
  const edges = new Map<string, readonly [string, string]>()
  const include = (a: string, b: string) => edges.set(meshEdgeKey(a, b), [a, b])
  for (const face of Object.values(mesh.faces)) {
    for (let i = 0; i < face.corners.length; i++) {
      const a = face.corners[i]?.vertexId
      const b = face.corners[(i + 1) % face.corners.length]?.vertexId
      if (a && b) include(a, b)
    }
  }
  for (const [a, b] of mesh.looseEdges) include(a, b)
  return edges
}

export function meshComponentIds(mesh: SceneMeshGeometry, mode: SceneComponentMode): string[] {
  if (mode === 'face') return Object.keys(mesh.faces)
  if (mode === 'vertex') return Object.keys(mesh.vertices)
  return [...meshComponentEdges(mesh).keys()]
}

export function meshComponentVertices(
  mesh: SceneMeshGeometry,
  selection: Pick<SceneComponentSelection, 'mode' | 'ids'>,
): string[] {
  if (selection.mode === 'face') return verticesOfMeshFaces(mesh, selection.ids)
  const vertices = new Set<string>()
  const edges = selection.mode === 'edge' ? meshComponentEdges(mesh) : null
  for (const id of selection.ids) {
    const points = edges ? edges.get(id) : Object.hasOwn(mesh.vertices, id) ? [id] : null
    requireScene(points, 'selection', 'Essa parte da malha não existe mais. Escolha novamente.')
    for (const point of points) vertices.add(point)
  }
  return [...vertices]
}

/**
 * An operation's result seen in the mode the person was editing in, so it never switches modes.
 * Faces and lines give their points and lines; lines and faces need all of their points chosen.
 */
export function convertMeshComponents(
  mesh: SceneMeshGeometry,
  from: Pick<SceneComponentSelection, 'mode' | 'ids'>,
  mode: SceneComponentMode,
): string[] {
  if (from.mode === mode) return [...from.ids]
  if (mode === 'edge' && from.mode === 'face') {
    const edges = new Set<string>()
    for (const id of from.ids) {
      const corners = mesh.faces[id]?.corners ?? []
      for (let i = 0; i < corners.length; i++)
        edges.add(meshEdgeKey(corners[i]!.vertexId, corners[(i + 1) % corners.length]!.vertexId))
    }
    return [...edges]
  }
  const points = new Set(meshComponentVertices(mesh, from))
  if (mode === 'vertex') return [...points]
  if (mode === 'edge')
    return [...meshComponentEdges(mesh)]
      .filter(([, [a, b]]) => points.has(a) && points.has(b))
      .map(([id]) => id)
  return Object.entries(mesh.faces)
    .filter(([, face]) => face.corners.every((corner) => points.has(corner.vertexId)))
    .map(([id]) => id)
}

/** Read-only IDs; both native and legacy adapters share the topology selection engine. */
export function selectMeshComponents(
  mesh: SceneMeshGeometry,
  selection: Pick<SceneComponentSelection, 'mode' | 'ids'>,
  action: MeshSelectionAction,
): string[] {
  if (action === 'none') return []
  return selectTopology(
    {
      vertices: Object.keys(mesh.vertices),
      edges: meshComponentEdges(mesh),
      faces: indexMeshEdges(mesh).byFace,
    },
    selection.mode,
    selection.ids,
    action,
  )
}
