import type { SceneMeshGeometry, Vec2 } from './document'
import { indexMeshUv, mapMeshUv, meshUvBounds, meshUvFaces } from './meshUv'
import { moveMeshUvCorner, prepareMeshUvStitch } from './meshUvCorners'
import { packMeshUvGroups } from './meshUvPacking'
import { projectMeshFaceMetric } from './meshUvProjection'
import * as v from './validation'

export type MeshUvOperation =
  | { kind: 'transform'; offset: Vec2; scale: Vec2; degrees: number }
  | { kind: 'project'; plane: 'xy' | 'xz' | 'yz' | 'face' }
  | { kind: 'pack'; padding: number }
  | { kind: 'corner'; faceId: string; corner: number; uv: Vec2 }
  | { kind: 'stitch'; faceId: string; corner: number }

/** A selection-local operation. Reprojection/packing changes paint placement, never the pixels. */
export function editMeshUv(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  operation: MeshUvOperation,
) {
  const selected = meshUvFaces(mesh, ids)
  v.choice(operation.kind, ['transform', 'project', 'pack', 'corner', 'stitch'], 'uv.kind')
  if (operation.kind === 'corner') {
    v.record(operation, 'uv', ['kind', 'faceId', 'corner', 'uv'])
    return moveMeshUvCorner(mesh, selected, operation.faceId, operation.corner, operation.uv)
  }
  if (operation.kind === 'stitch') {
    v.record(operation, 'uv', ['kind', 'faceId', 'corner'])
    return prepareMeshUvStitch(mesh, selected, operation.faceId, operation.corner).apply()
  }
  if (operation.kind === 'transform') {
    v.record(operation, 'uv', ['kind', 'offset', 'scale', 'degrees'])
    v.tuple(operation.offset, 2, 'uv.offset')
    v.tuple(operation.scale, 2, 'uv.scale')
    const angle = v.number(operation.degrees, 'uv.degrees') % 360
    const quarter = angle / 90
    const turn = ((quarter % 4) + 4) % 4
    const cos = Number.isInteger(quarter) ? [1, 0, -1, 0][turn]! : Math.cos((angle * Math.PI) / 180)
    const sin = Number.isInteger(quarter) ? [0, 1, 0, -1][turn]! : Math.sin((angle * Math.PI) / 180)
    const { min, max } = meshUvBounds(mesh, selected)
    const center: Vec2 = [min[0] / 2 + max[0] / 2, min[1] / 2 + max[1] / 2]
    return mapMeshUv(mesh, selected, (uv) => {
      // A unit transform is an exact no-op, even for large or subnormal authorial coordinates.
      if (angle === 0 && operation.scale.every((s) => s === 1))
        return [uv[0] + operation.offset[0], uv[1] + operation.offset[1]]
      const x = (uv[0] - center[0]) * operation.scale[0]
      const y = (uv[1] - center[1]) * operation.scale[1]
      return [
        center[0] + x * cos - y * sin + operation.offset[0],
        center[1] + x * sin + y * cos + operation.offset[1],
      ]
    })
  }
  if (operation.kind === 'pack') {
    v.record(operation, 'uv', ['kind', 'padding'])
    v.number(operation.padding, 'uv.padding', 0, 0.25)
    return pack(mesh, selected, operation.padding)
  }
  v.record(operation, 'uv', ['kind', 'plane'])
  v.choice(operation.plane, ['xy', 'xz', 'yz', 'face'], 'uv.plane')
  if (operation.plane === 'face') {
    const projected = new Map(
      selected.map((id) => {
        const { points, span } = projectMeshFaceMetric(mesh, id)
        return [id, points.map((p): Vec2 => [p[0] / span, p[1] / span])] as const
      }),
    )
    return mapMeshUv(mesh, selected, (_uv, id, corner) => projected.get(id)![corner]!)
  }
  const axes = operation.plane === 'xy' ? [0, 1] : operation.plane === 'xz' ? [0, 2] : [1, 2]
  // Normalize before subtraction so imported coordinates near either end of Double remain finite.
  let magnitude = 0
  for (const id of selected)
    for (const c of mesh.faces[id]!.corners)
      for (const axis of axes)
        magnitude = Math.max(magnitude, Math.abs(mesh.vertices[c.vertexId]![axis]!))
  if (!selected.length) return mesh
  const divisor = magnitude || 1
  const raw = (id: string, corner: number): Vec2 => {
    const p = mesh.vertices[mesh.faces[id]!.corners[corner]!.vertexId]!
    return [p[axes[0]!]! / divisor, p[axes[1]!]! / divisor]
  }
  const min: Vec2 = [Infinity, Infinity]
  const max: Vec2 = [-Infinity, -Infinity]
  for (const id of selected)
    mesh.faces[id]!.corners.forEach((_, i) => {
      const p = raw(id, i)
      for (const a of [0, 1] as const) {
        min[a] = Math.min(min[a], p[a])
        max[a] = Math.max(max[a], p[a])
      }
    })
  const span = Math.max(max[0] - min[0], max[1] - min[1])
  v.requireScene(span > 0, 'uv', 'Essa vista não mostra a área das faces. Escolha outro lado.')
  return mapMeshUv(mesh, selected, (_, id, i) => {
    const p = raw(id, i)
    return [(p[0] - min[0]) / span, (p[1] - min[1]) / span]
  })
}

/** Existing-island packing cannot split an unselected part of an island. */
function pack(mesh: SceneMeshGeometry, selected: string[], padding: number): SceneMeshGeometry {
  if (!selected.length) return mesh
  const chosen = new Set(selected)
  const groups = indexMeshUv(mesh).islands.filter((island) => island.some((id) => chosen.has(id)))
  v.requireScene(
    groups.every((island) => island.every((id) => chosen.has(id))),
    'uv',
    'Escolha as ilhas inteiras antes de organizar, para não abrir novas costuras.',
  )
  return packMeshUvGroups(mesh, groups, padding)
}
