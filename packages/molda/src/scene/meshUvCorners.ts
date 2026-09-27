import type { SceneMeshGeometry, Vec2 } from './document'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { mapMeshUv, meshUvFaces } from './meshUv'
import * as v from './validation'

function selectedCorner(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  faceId: string,
  corner: number,
) {
  const selected = meshUvFaces(mesh, ids)
  v.requireScene(selected.includes(faceId), 'uv.face', 'Escolha a face que contém esse canto.')
  const face = mesh.faces[faceId]!
  v.number(corner, 'uv.corner', 0, face.corners.length - 1, true)
  return { selected, face, point: face.corners[corner]! }
}

export function moveMeshUvCorner(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  faceId: string,
  corner: number,
  raw: Vec2,
) {
  selectedCorner(mesh, ids, faceId, corner)
  const uv = v.tuple(raw, 2, 'uv.position') as Vec2
  return mapMeshUv(mesh, [faceId], (value, _id, index) => (index === corner ? uv : value))
}

/** Explicit local stitching: the reference edge stays still; only its selected neighbor's two UVs move. */
export function prepareMeshUvStitch(
  mesh: SceneMeshGeometry,
  ids: readonly string[],
  faceId: string,
  corner: number,
) {
  const { selected, face, point } = selectedCorner(mesh, ids, faceId, corner)
  const end = face.corners[(corner + 1) % face.corners.length]!
  const edges = indexMeshEdges(mesh).edges.get(meshEdgeKey(point.vertexId, end.vertexId)) ?? []
  const opposite = edges.find(
    (edge) => edge.faceId !== faceId && edge.a === end.vertexId && edge.b === point.vertexId,
  )
  const target = opposite ? mesh.faces[opposite.faceId] : undefined
  const blockedReason =
    edges.length !== 2 || !target || !opposite
      ? 'Esta borda precisa ligar exatamente duas faces orientadas para o mesmo lado.'
      : !selected.includes(opposite.faceId)
        ? 'Escolha também a face vizinha antes de alinhar esta borda.'
        : target.materialId !== face.materialId
          ? 'Estas faces usam materiais diferentes. Escolha uma borda do mesmo material.'
          : null
  const anchors = new Map([
    [point.vertexId, point.uv],
    [end.vertexId, end.uv],
  ])
  const changedCorners =
    blockedReason || !target
      ? 0
      : target.corners.filter((entry) => {
          const uv = anchors.get(entry.vertexId)
          return uv?.some((value, axis) => value !== entry.uv[axis])
        }).length
  return {
    targetFaceId: opposite?.faceId ?? null,
    blockedReason,
    changedCorners,
    apply() {
      v.requireScene(!blockedReason && opposite, 'uv.edge', blockedReason ?? 'Essa borda mudou.')
      return mapMeshUv(mesh, [opposite.faceId], (uv, id, corner) => {
        const anchor = anchors.get(mesh.faces[id]!.corners[corner]!.vertexId)
        return anchor ? [...anchor] : uv
      })
    },
  }
}
