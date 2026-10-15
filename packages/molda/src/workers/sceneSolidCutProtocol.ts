import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from '../scene/document'
import type { MeshCutPlane } from '../scene/meshPlaneCut'
import { readSceneGeometry } from '../scene/readGeometry'
import * as v from '../scene/validation'
import { readSceneMeshPacket } from './sceneMeshPacket'
import type { TaskReply } from './workerTask'

export interface SolidCutRequest {
  documentId: string
  revision: number
  mesh: SceneMeshGeometry
  plane: MeshCutPlane
  capId: string
}
export function readSolidCutRequest(raw: unknown): SolidCutRequest {
  const row = v.record(raw, 'request', ['documentId', 'revision', 'mesh', 'plane', 'capId'])
  const mesh = readSceneGeometry(row.mesh)
  v.requireScene(mesh.kind === 'mesh', 'mesh', 'Escolha uma peça para cortar.')
  const plane = v.record(row.plane, 'plane', ['origin', 'normal'])
  return {
    documentId: v.id(row.documentId, 'documentId'),
    revision: v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true),
    mesh,
    plane: {
      origin: v.tuple(plane.origin, 3, 'origin') as Vec3,
      normal: v.tuple(plane.normal, 3, 'normal') as Vec3,
    },
    capId: v.id(row.capId, 'capId'),
  }
}

export function readSolidCutReply(
  raw: unknown,
  request: SolidCutRequest,
): TaskReply<[SceneMeshGeometry, SceneMeshGeometry], never> {
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.documentId === request.documentId && row.revision === request.revision,
    'reply',
    'Este corte pertence a outra revisão.',
  )
  const type = v.choice(row.type, ['result', 'error'], 'reply.type')
  if (type === 'error') {
    v.record(row, 'reply', ['type', 'documentId', 'revision', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['type', 'documentId', 'revision', 'pieces'])
  const pieces = v.list(row.pieces, 'pieces', 2)
  v.requireScene(pieces.length === 2, 'pieces', 'O corte precisa produzir duas peças.')
  const first = readSceneMeshPacket(pieces[0]),
    second = readSceneMeshPacket(pieces[1])
  v.requireScene(
    first.id === request.mesh.id && second.id === request.mesh.id,
    'pieces',
    'A identidade da malha mudou durante o corte.',
  )
  const materials = new Set([
    request.capId,
    ...Object.values(request.mesh.faces).map((face) => face.materialId),
  ])
  for (const mesh of [first, second])
    for (const face of Object.values(mesh.faces))
      v.requireScene(
        materials.has(face.materialId),
        'pieces',
        'O corte introduziu uma superfície desconhecida.',
      )
  return { type, result: [first, second] }
}
