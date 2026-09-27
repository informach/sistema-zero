import type { SceneMeshGeometry } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { mapMeshUv, meshUvFaces } from '../scene/meshUv'
import { readSceneGeometry } from '../scene/readGeometry'
import * as v from '../scene/validation'
import type { TaskReply } from './workerTask'

export interface SceneUvRequest {
  /** Opaque owner key supplied by the workshop: document ID, content revision and node ID. */
  sourceKey: string
  mesh: SceneMeshGeometry
  faceIds: readonly string[]
  padding: number
  /** Omitted preserves the independent-face operation. Cuts are instructions, not stored metadata. */
  unfold?: { cuts: readonly string[]; preserveCuts?: boolean }
}
export function readSceneUvRequest(raw: unknown): SceneUvRequest {
  const row = v.record(raw, 'request', ['sourceKey', 'mesh', 'faceIds', 'padding', 'unfold'])
  const sourceKey = v.text(row.sourceKey, 'sourceKey', 512)
  const padding = v.number(row.padding, 'padding', 0, 0.25)
  const unfold =
    row.unfold === undefined ? undefined : v.record(row.unfold, 'unfold', ['cuts', 'preserveCuts'])
  const cuts =
    unfold === undefined
      ? undefined
      : v
          .list(unfold.cuts, 'unfold.cuts', SCENE_LIMITS.triangles * 3)
          .map((key) => v.text(key, 'unfold.cut', 512))
  if (cuts)
    v.requireScene(new Set(cuts).size === cuts.length, 'unfold.cuts', 'Escolha cada corte uma vez.')
  const preserveCuts =
    unfold?.preserveCuts === undefined
      ? undefined
      : v.boolean(unfold.preserveCuts, 'unfold.preserveCuts')
  const mesh = readSceneGeometry(row.mesh)
  v.requireScene(mesh.kind === 'mesh', 'mesh', 'Escolha uma malha para organizar a pintura.')
  const ids = v
    .list(row.faceIds, 'faceIds', SCENE_LIMITS.triangles)
    .map((raw) => v.id(raw, 'faceId'))
  const faceIds = meshUvFaces(mesh, ids)
  v.requireScene(
    faceIds.length > 0 && faceIds.length === ids.length,
    'faceIds',
    'Escolha faces sem repetições.',
  )
  return {
    sourceKey,
    mesh,
    faceIds,
    padding,
    ...(cuts === undefined
      ? {}
      : { unfold: { cuts, ...(preserveCuts === undefined ? {} : { preserveCuts }) } }),
  }
}

/** Only derived UV doubles travel back. Position, topology and material ownership stay on the caller. */
export function sceneUvReply(request: SceneUvRequest, result: SceneMeshGeometry) {
  const length = request.faceIds.reduce(
    (count, id) => count + request.mesh.faces[id]!.corners.length * 2,
    0,
  )
  const uv = new Float64Array(length)
  let offset = 0
  for (const id of request.faceIds)
    for (const corner of result.faces[id]!.corners) {
      uv[offset++] = corner.uv[0]
      uv[offset++] = corner.uv[1]
    }
  return { type: 'result' as const, sourceKey: request.sourceKey, geometryId: request.mesh.id, uv }
}

export function readSceneUvReply(
  raw: unknown,
  expected: SceneUvRequest,
): TaskReply<SceneMeshGeometry, never> {
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.sourceKey === expected.sourceKey && row.geometryId === expected.mesh.id,
    'reply',
    'Esse mapa pertence a outra malha ou revisão.',
  )
  const type = v.choice(row.type, ['result', 'error'], 'type')
  if (type === 'error') {
    v.record(row, 'reply', ['type', 'sourceKey', 'geometryId', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['type', 'sourceKey', 'geometryId', 'uv'])
  let length = 0
  const offsets = new Map(
    expected.faceIds.map((id) => {
      const offset = length
      length += expected.mesh.faces[id]!.corners.length * 2
      return [id, offset] as const
    }),
  )
  const uv = row.uv
  v.requireScene(
    uv instanceof Float64Array && uv.constructor === Float64Array && uv.length === length,
    'uv',
    'Coordenadas incompletas ou sem precisão suficiente.',
  )
  const result = mapMeshUv(expected.mesh, expected.faceIds, (_before, id, corner) => {
    const offset = offsets.get(id)! + corner * 2
    return [v.number(uv[offset], 'u', 0, 1), v.number(uv[offset + 1], 'v', 0, 1)]
  })
  return { type, result }
}
