import { isMoldaAssetId } from '../core/id'
import type { SceneMeshGeometry } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { meshComponentIds, type SceneComponentMode } from '../scene/meshComponents'
import {
  MESH_FIX_KINDS,
  MESH_ISSUE_KINDS,
  MESH_ISSUE_MODES,
  type MeshFixKind,
  type SceneMeshIssue,
} from '../scene/meshDiagnosis'
import { readSceneGeometry } from '../scene/readGeometry'
import * as v from '../scene/validation'
import { readSceneMeshPacket } from './sceneMeshPacket'
import type { TaskReply } from './workerTask'

export interface MeshCheckToken {
  documentId: string
  revision: number
}
export type MeshCheckRequest = MeshCheckToken & { mesh: SceneMeshGeometry } & (
    | { action: 'inspect' }
    | { action: 'repair'; fix: MeshFixKind }
  )
export type MeshCheckResult =
  | { kind: 'report'; issues: SceneMeshIssue[] }
  | { kind: 'repair'; mesh: SceneMeshGeometry }

export function readMeshCheckRequest(raw: unknown): MeshCheckRequest {
  const row = v.record(raw, 'request')
  const action = v.choice(row.action, ['inspect', 'repair'], 'action')
  v.record(row, 'request', [
    'documentId',
    'revision',
    'mesh',
    'action',
    ...(action === 'repair' ? ['fix'] : []),
  ])
  v.requireScene(isMoldaAssetId(row.documentId), 'documentId', 'Identificador de criação inválido.')
  const revision = v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true)
  const mesh = readSceneGeometry(row.mesh)
  v.requireScene(mesh.kind === 'mesh', 'mesh', 'Escolha uma malha para conferir.')
  const token = { documentId: row.documentId, revision, mesh }
  return action === 'inspect'
    ? { ...token, action }
    : { ...token, action, fix: v.choice(row.fix, MESH_FIX_KINDS, 'fix') }
}

/** Validate the token before decoding a report or authorial mesh packet. */
export function readMeshCheckReply(
  raw: unknown,
  expected: MeshCheckRequest,
): TaskReply<MeshCheckResult, never> {
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.documentId === expected.documentId && row.revision === expected.revision,
    'reply',
    'Essa conferência pertence a outra criação ou revisão.',
  )
  const type = v.choice(row.type, ['result', 'error'], 'reply.type')
  if (type === 'error') {
    v.record(row, 'reply', ['documentId', 'revision', 'type', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['documentId', 'revision', 'type', 'result'])
  const result = v.record(row.result, 'result')
  if (expected.action === 'repair') {
    v.record(result, 'result', ['kind', 'packet'])
    v.requireScene(result.kind === 'repair', 'result', 'Resultado de reparo esperado.')
    const mesh = readSceneMeshPacket(result.packet)
    v.requireScene(mesh.id === expected.mesh.id, 'result', 'A identidade da malha mudou.')
    return { type, result: { kind: 'repair', mesh } }
  }
  v.record(result, 'result', ['kind', 'issues'])
  v.requireScene(result.kind === 'report', 'result', 'Relatório esperado.')
  const alive = new Map<SceneComponentMode, Set<string>>()
  const kinds = new Set<string>()
  const issues = v
    .list(result.issues, 'issues', MESH_ISSUE_KINDS.length)
    .map((raw): SceneMeshIssue => {
      const issue = v.record(raw, 'issue', ['kind', 'ids', 'count'])
      const kind = v.choice(issue.kind, MESH_ISSUE_KINDS, 'issue.kind')
      v.requireScene(!kinds.has(kind), 'issue.kind', 'Tipo de observação repetido.')
      kinds.add(kind)
      const mode = MESH_ISSUE_MODES[kind]
      let allowed = alive.get(mode)
      if (!allowed) {
        allowed = new Set(meshComponentIds(expected.mesh, mode))
        alive.set(mode, allowed)
      }
      const ids = v
        .list(issue.ids, 'issue.ids', allowed.size)
        .map((id) => v.text(id, 'issue.ids', 264))
      v.requireScene(
        ids.length > 0 && new Set(ids).size === ids.length && ids.every((id) => allowed.has(id)),
        'issue.ids',
        'Parte ausente ou repetida no relatório.',
      )
      const count = v.number(
        issue.count,
        'issue.count',
        ids.length,
        Math.max(SCENE_LIMITS.vertices, SCENE_LIMITS.looseEdges, SCENE_LIMITS.triangles * 3),
        true,
      )
      v.requireScene(
        kind === 'empty-lines' || kind === 'duplicate-lines' || count === ids.length,
        'issue.count',
        'Contagem inconsistente.',
      )
      return { kind, ids, count }
    })
  return { type, result: { kind: 'report', issues } }
}
