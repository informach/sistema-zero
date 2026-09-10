import { isMoldaAssetId } from '../core/id'
import type { SceneMeshGeometry } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneGeometry } from '../scene/readGeometry'
import * as v from '../scene/validation'
import { readSceneMeshPacket, type SceneMeshPacket } from './sceneMeshPacket'

export type SceneSurfaceTool = 'extrude' | 'inset' | 'subdivide' | 'thickness'
export interface SceneSurfaceToken {
  documentId: string
  revision: number
}
export interface SceneSurfaceInit extends SceneSurfaceToken {
  type: 'init'
  mesh: SceneMeshGeometry
  faceIds: readonly string[]
  tool: SceneSurfaceTool
  idSeed: string
}
export interface SceneSurfaceApply {
  type: 'apply'
  requestId: number
  amount: number
}
export type SceneSurfaceReply = SceneSurfaceToken &
  (
    | { type: 'ready' }
    | { type: 'result'; requestId: number; mesh: SceneMeshGeometry }
    | { type: 'error'; requestId: number; message: string }
  )
export type SceneSurfaceMessage =
  | Exclude<SceneSurfaceReply, { type: 'result' }>
  | (SceneSurfaceToken & { type: 'result'; requestId: number; packet: SceneMeshPacket })

type SceneSurfaceEnvelope =
  | Exclude<SceneSurfaceReply, { type: 'result' }>
  | (SceneSurfaceToken & { type: 'result'; requestId: number; packet: unknown })

export function readSceneSurfaceInit(raw: unknown): SceneSurfaceInit {
  const row = v.record(raw, 'worker', [
    'type',
    'documentId',
    'revision',
    'mesh',
    'faceIds',
    'tool',
    'idSeed',
  ])
  v.requireScene(row.type === 'init', 'worker', 'Preparação desconhecida.')
  const mesh = readSceneGeometry(row.mesh)
  v.requireScene(mesh.kind === 'mesh', 'mesh', 'Escolha uma malha.')
  const faceIds = v
    .list(row.faceIds, 'faceIds', SCENE_LIMITS.triangles)
    .map((raw) => v.id(raw, 'faceIds'))
  v.requireScene(
    faceIds.every((id) => Object.hasOwn(mesh.faces, id)),
    'faceIds',
    'Essa face não existe mais.',
  )
  v.requireScene(isMoldaAssetId(row.documentId), 'documentId', 'Identificador de criação inválido.')
  const idSeed = v.id(row.idSeed, 'idSeed')
  v.requireScene(idSeed.length <= 64, 'idSeed', 'Identificador longo demais.')
  return {
    type: 'init',
    documentId: row.documentId,
    revision: v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true),
    mesh,
    faceIds,
    tool: v.choice(row.tool, ['extrude', 'inset', 'subdivide', 'thickness'], 'tool'),
    idSeed,
  }
}

export function readSceneSurfaceApply(raw: unknown): SceneSurfaceApply {
  const row = v.record(raw, 'worker', ['type', 'requestId', 'amount'])
  v.requireScene(row.type === 'apply', 'worker', 'Ajuste desconhecido.')
  return {
    type: 'apply',
    requestId: v.number(row.requestId, 'requestId', 1, Number.MAX_SAFE_INTEGER, true),
    amount: v.number(row.amount, 'amount'),
  }
}

/** Read the bounded transport header before deciding whether a large payload is still needed. */
export function readSceneSurfaceEnvelope(
  raw: unknown,
  expected: SceneSurfaceToken,
): SceneSurfaceEnvelope {
  const token = { documentId: expected.documentId, revision: expected.revision }
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.documentId === token.documentId && row.revision === token.revision,
    'reply',
    'A resposta pertence a outra criação ou revisão.',
  )
  const type = v.choice(row.type, ['ready', 'result', 'error'], 'reply.type')
  if (type === 'ready') {
    v.record(row, 'reply', ['type', 'documentId', 'revision'])
    return { ...token, type }
  }
  const requestId = v.number(
    row.requestId,
    'reply.requestId',
    type === 'error' ? 0 : 1,
    Number.MAX_SAFE_INTEGER,
    true,
  )
  if (type === 'error') {
    v.record(row, 'reply', ['type', 'documentId', 'revision', 'requestId', 'message'])
    return { ...token, type, requestId, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['type', 'documentId', 'revision', 'requestId', 'packet'])
  return { ...token, type, requestId, packet: row.packet }
}

/** Only current results enter the authoring domain; never cast worker payloads to geometry. */
export function readSceneSurfaceReply(raw: unknown, token: SceneSurfaceToken): SceneSurfaceReply {
  const reply = readSceneSurfaceEnvelope(raw, token)
  if (reply.type !== 'result') return reply
  const mesh = readSceneMeshPacket(reply.packet)
  return {
    type: 'result',
    documentId: reply.documentId,
    revision: reply.revision,
    requestId: reply.requestId,
    mesh,
  }
}
