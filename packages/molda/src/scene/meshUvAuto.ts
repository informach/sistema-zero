import type { SceneMeshGeometry } from './document'
import { projectMeshUvFaces, requireMeshUvFaceArea } from './meshUvAutoProjection'
import { packMeshUvGroups } from './meshUvPacking'
import * as v from './validation'

/** Deliberate per-face charts, not a curved-surface solver. Pixels, topology and unselected faces stay untouched. */
export function autoMeshUv(mesh: SceneMeshGeometry, ids: readonly string[], padding: number) {
  v.number(padding, 'uv.padding', 0, 0.25)
  const { selected, planar } = projectMeshUvFaces(mesh, ids)
  if (!selected.length) return mesh
  const packed = packMeshUvGroups(
    planar,
    selected.map((id) => [id]),
    padding,
  )
  requireMeshUvFaceArea(packed, selected)
  return packed
}
