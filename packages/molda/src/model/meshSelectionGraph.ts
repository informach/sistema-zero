import type { MeshFaceKey, MoldaMesh } from '../core/model'
import { meshEdges } from './mesh'
import { type MeshPick, pruneMeshSelection } from './meshSelection'
import { type MeshSelectionAction, selectTopology } from './topologySelection'

export { MESH_SELECTION_ACTIONS, type MeshSelectionAction } from './topologySelection'

const edgeKey = ([a, b]: readonly string[]) => JSON.stringify(a! < b! ? [a, b] : [b, a])

/** Legacy adapter only. Both document versions use the same read-only selection algorithms. */
export function selectMeshTopology(
  mesh: MoldaMesh,
  mode: MeshPick['kind'],
  selection: readonly MeshPick[],
  action: MeshSelectionAction,
): MeshPick[] {
  if (action === 'none') return []
  const edges = new Map(meshEdges(mesh).map((edge) => [edgeKey(edge), edge]))
  const topology = {
    vertices: Object.keys(mesh.vertices),
    edges,
    faces: new Map(
      Object.entries(mesh.faces).map(([id, face]) => [
        id,
        face.v.map((a, i) => edgeKey([a, face.v[(i + 1) % face.v.length]!])),
      ]),
    ),
  }
  const selected = pruneMeshSelection(mesh, selection)
    .filter((pick) => pick.kind === mode)
    .map((pick) => (pick.kind === 'edge' ? edgeKey(pick.keys) : pick.key))
  return selectTopology(topology, mode, selected, action).map(
    (id): MeshPick =>
      mode === 'edge'
        ? { kind: 'edge', keys: edges.get(id)! }
        : mode === 'face'
          ? { kind: 'face', key: id as MeshFaceKey }
          : { kind: 'vertex', key: id },
  )
}
