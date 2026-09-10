import { isMoldaAssetId } from '../core/id'
import { MAX_SCENE_GLB_BYTES } from '../export/GlbBinary'
import type { encodeSceneGlb } from '../export/sceneGlb'
import { MAX_SCENE_GLB_ANIMATION_CHANNELS } from '../export/sceneGlbAnimations'
import { MAX_SCENE_GLB_NODES } from '../export/sceneGlbHierarchy'
import type { SceneGlbClip, SceneGlbIssue } from '../export/sceneGlbReport'
import { MAX_SCENE_GLB_ANIMATION_KEYS } from '../export/sceneGlbTrack'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneDocument } from '../scene/readDocument'
import { SCENE_SKIN_LIMITS } from '../scene/skin'
import * as v from '../scene/validation'
import type { TaskReply } from './workerTask'

export type SceneGlbExportResult = ReturnType<typeof encodeSceneGlb>
export type SceneGlbProgress = 'validating' | 'encoding'
export interface SceneGlbToken {
  documentId: string
  revision: number
  /** Destination encoding. Part of the identity: a reply for the other one is not this one. */
  animatedPaint: boolean
}
export interface SceneGlbRequest extends SceneGlbToken {
  document: MoldaSceneDocument
}
export const MAX_SCENE_GLB_ISSUES =
  SCENE_LIMITS.nodes * 2 + // Visibility/dependency and an optional bend rule per node.
  SCENE_LIMITS.triangles +
  SCENE_LIMITS.geometries +
  SCENE_LIMITS.materials +
  SCENE_LIMITS.images +
  SCENE_LIMITS.animationTracks +
  SCENE_LIMITS.animationClips +
  SCENE_SKIN_LIMITS.bindings * 3

export function readSceneGlbToken(raw: unknown): SceneGlbToken {
  const row = v.record(raw, 'request')
  v.requireScene(isMoldaAssetId(row.documentId), 'documentId', 'Identificador de criação inválido.')
  return {
    documentId: row.documentId,
    revision: v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true),
    animatedPaint: v.boolean(row.animatedPaint, 'animatedPaint'),
  }
}
export function readSceneGlbRequest(raw: unknown): SceneGlbRequest {
  const row = v.record(raw, 'request', ['documentId', 'revision', 'animatedPaint', 'document']),
    token = readSceneGlbToken(row)
  const read = readSceneDocument(row.document)
  v.requireScene(
    read.status === 'valid',
    'document',
    read.status === 'invalid' ? read.message : 'Formato de criação não suportado.',
  )
  v.requireScene(
    read.document.id === token.documentId,
    'documentId',
    'Essa criação não pertence ao pedido.',
  )
  return { ...token, document: read.document }
}

function readIssue(raw: unknown): SceneGlbIssue {
  const row = v.record(raw, 'issue'),
    sourceId = v.id(row.sourceId, 'sourceId')
  const code = v.choice(
    row.code,
    [
      'hidden-node',
      'skin-dependency',
      'skin-precision',
      'skin-zero-slots',
      'skin-render-space',
      'bend-limit-omitted',
      'face-omitted',
      'loose-geometry',
      'flipbook-first-frame',
      'runtime-tangent-space',
      'animation-resampled',
      'clip-omitted',
      'clip-renamed',
    ],
    'code',
  )
  if (code === 'face-omitted') {
    v.record(row, 'issue', ['code', 'sourceId', 'faceId', 'reason'])
    return {
      code,
      sourceId,
      faceId: v.id(row.faceId, 'faceId'),
      reason: v.choice(row.reason, ['degenerate', 'self-intersection', 'precision'], 'reason'),
    }
  }
  if (code === 'loose-geometry') {
    v.record(row, 'issue', ['code', 'sourceId', 'edges', 'vertices'])
    return {
      code,
      sourceId,
      edges: v.number(row.edges, 'edges', 0, SCENE_LIMITS.looseEdges, true),
      vertices: v.number(row.vertices, 'vertices', 0, SCENE_LIMITS.vertices, true),
    }
  }
  if (code === 'animation-resampled') {
    v.record(row, 'issue', ['code', 'sourceId', 'nodeId', 'channel', 'samples'])
    return {
      code,
      sourceId,
      nodeId: v.id(row.nodeId, 'nodeId'),
      channel: v.choice(row.channel, ['translation', 'rotation', 'scale'], 'channel'),
      samples: v.number(row.samples, 'samples', 1, MAX_SCENE_GLB_ANIMATION_KEYS, true),
    }
  }
  if (code === 'clip-omitted') {
    v.record(row, 'issue', ['code', 'sourceId', 'reason'])
    return { code, sourceId, reason: v.choice(row.reason, ['empty', 'hidden'], 'reason') }
  }
  if (code === 'clip-renamed') {
    v.record(row, 'issue', ['code', 'sourceId', 'originalName', 'name'])
    const originalName = v.text(row.originalName, 'originalName'),
      name = v.text(row.name, 'name')
    v.requireScene(name !== originalName, 'issue', 'O nome do movimento não mudou.')
    return { code, sourceId, originalName, name }
  }
  v.record(row, 'issue', ['code', 'sourceId'])
  return { code, sourceId }
}

function readClip(raw: unknown): SceneGlbClip {
  const row = v.record(raw, 'clip', ['id', 'name', 'duration', 'fps', 'loop'])
  return {
    id: v.id(row.id, 'clip.id'),
    name: v.text(row.name, 'clip.name'),
    duration: v.number(
      row.duration,
      'clip.duration',
      Number.MIN_VALUE,
      SCENE_LIMITS.animationSeconds,
    ),
    fps: v.number(row.fps, 'clip.fps', 1, 120, true),
    loop: v.boolean(row.loop, 'clip.loop'),
  }
}
const STAT_LIMITS = {
  nodes: MAX_SCENE_GLB_NODES,
  bones: MAX_SCENE_GLB_NODES,
  meshes: SCENE_LIMITS.renderedParts,
  materials: SCENE_LIMITS.materials,
  textures: SCENE_LIMITS.materials * 3,
  pixelBytes: SCENE_LIMITS.pixelBytes,
  triangles: SCENE_LIMITS.triangles,
  drawCalls: SCENE_LIMITS.triangles,
  renderedParts: SCENE_LIMITS.renderedParts,
  clips: SCENE_LIMITS.animationClips,
  animationKeys: MAX_SCENE_GLB_ANIMATION_KEYS,
  animationChannels: MAX_SCENE_GLB_ANIMATION_CHANNELS,
} as const

/** Transport/container check only, not a second geometry build or production Khronos validation. */
function readBytes(raw: unknown): Uint8Array<ArrayBuffer> {
  v.requireScene(
    raw instanceof Uint8Array &&
      raw.buffer instanceof ArrayBuffer &&
      raw.byteOffset === 0 &&
      raw.byteLength === raw.buffer.byteLength &&
      raw.byteLength >= 24 &&
      raw.byteLength <= MAX_SCENE_GLB_BYTES &&
      raw.byteLength % 4 === 0,
    'bytes',
    'Arquivo GLB fora do orçamento.',
  )
  const view = new DataView(raw.buffer)
  v.requireScene(
    view.getUint32(0, true) === 0x46546c67 &&
      view.getUint32(4, true) === 2 &&
      view.getUint32(8, true) === raw.byteLength &&
      view.getUint32(16, true) === 0x4e4f534a,
    'bytes',
    'Cabeçalho GLB inválido.',
  )
  const jsonLength = view.getUint32(12, true),
    binStart = 20 + jsonLength
  v.requireScene(
    jsonLength > 0 && jsonLength % 4 === 0 && binStart <= raw.byteLength,
    'bytes',
    'Bloco JSON inválido.',
  )
  if (binStart !== raw.byteLength) {
    v.requireScene(binStart + 8 <= raw.byteLength, 'bytes', 'Bloco binário incompleto.')
    const length = view.getUint32(binStart, true)
    v.requireScene(
      length > 0 &&
        length % 4 === 0 &&
        binStart + 8 + length === raw.byteLength &&
        view.getUint32(binStart + 4, true) === 0x004e4942,
      'bytes',
      'Bloco binário inválido.',
    )
  }
  // postMessage transferred this complete derived buffer; no extra 32 MiB copy on the UI thread.
  return new Uint8Array(raw.buffer)
}

export function sceneGlbReply(token: SceneGlbToken, result: ReturnType<typeof encodeSceneGlb>) {
  return {
    documentId: token.documentId,
    revision: token.revision,
    animatedPaint: token.animatedPaint,
    type: 'result' as const,
    result,
  }
}
export function readSceneGlbReply(
  raw: unknown,
  expected: SceneGlbToken,
): TaskReply<SceneGlbExportResult, SceneGlbProgress> {
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.documentId === expected.documentId &&
      row.revision === expected.revision &&
      row.animatedPaint === expected.animatedPaint,
    'reply',
    'Esse resultado pertence a outra criação, revisão ou destino.',
  )
  const type = v.choice(row.type, ['result', 'progress', 'error'], 'type')
  if (type === 'error') {
    v.record(row, 'reply', ['documentId', 'revision', 'animatedPaint', 'type', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  if (type === 'progress') {
    v.record(row, 'reply', ['documentId', 'revision', 'animatedPaint', 'type', 'progress'])
    return { type, progress: v.choice(row.progress, ['validating', 'encoding'], 'progress') }
  }
  v.record(row, 'reply', ['documentId', 'revision', 'animatedPaint', 'type', 'result'])
  const result = v.record(row.result, 'result', ['bytes', 'issues', 'stats', 'clips'])
  const stats = v.record(result.stats, 'stats', Object.keys(STAT_LIMITS))
  const count = (key: keyof typeof STAT_LIMITS) =>
    v.number(stats[key], key, 0, STAT_LIMITS[key], true)
  const clips = v.list(result.clips, 'clips', SCENE_LIMITS.animationClips).map(readClip)
  v.uniqueById(clips, 'clips')
  v.requireScene(
    clips.length === count('clips') &&
      new Set(clips.map((clip) => clip.name)).size === clips.length,
    'clips',
    'Lista de movimentos inconsistente.',
  )
  return {
    type,
    result: {
      bytes: readBytes(result.bytes),
      issues: v.list(result.issues, 'issues', MAX_SCENE_GLB_ISSUES).map(readIssue),
      clips,
      stats: {
        nodes: count('nodes'),
        bones: count('bones'),
        meshes: count('meshes'),
        materials: count('materials'),
        textures: count('textures'),
        pixelBytes: count('pixelBytes'),
        triangles: count('triangles'),
        drawCalls: count('drawCalls'),
        renderedParts: count('renderedParts'),
        clips: count('clips'),
        animationKeys: count('animationKeys'),
        animationChannels: count('animationChannels'),
      },
    },
  }
}
