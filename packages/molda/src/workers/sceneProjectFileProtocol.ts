import { isMoldaAssetId } from '../core/id'
import {
  checkSceneProjectFileSize,
  readSceneProjectContent,
  SceneProjectFileError,
} from '../import/sceneProjectFile'
import type { MoldaSceneDocument } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import type { TaskReply } from './workerTask'

export interface SceneProjectFileRequest {
  taskId: string
  bytes: Uint8Array
}
export type SceneProjectFileProgress = 'validating'

export function readSceneProjectFileTaskId(raw: unknown): string {
  const row = v.record(raw, 'request')
  v.requireScene(isMoldaAssetId(row.taskId), 'taskId', 'Identificador de tarefa inválido.')
  return row.taskId
}
export function readSceneProjectFileRequest(
  raw: unknown,
  snapshot: boolean,
): SceneProjectFileRequest {
  const row = v.record(raw, 'request', ['taskId', 'bytes']),
    taskId = readSceneProjectFileTaskId(row)
  v.requireScene(
    row.bytes instanceof Uint8Array && row.bytes.buffer instanceof ArrayBuffer,
    'bytes',
    'Memória de arquivo inválida.',
  )
  checkSceneProjectFileSize(row.bytes.byteLength)
  return { taskId, bytes: snapshot ? new Uint8Array(row.bytes) : row.bytes }
}
export function sceneProjectFileReply(taskId: string, document: MoldaSceneDocument) {
  return { taskId, type: 'result' as const, document }
}
export function readSceneProjectFileReply(
  raw: unknown,
  taskId: string,
): TaskReply<MoldaSceneDocument, SceneProjectFileProgress> {
  const row = v.record(raw, 'reply')
  v.requireScene(row.taskId === taskId, 'taskId', 'A cópia pertence a outra tarefa.')
  const type = v.choice(row.type, ['result', 'progress', 'error'], 'type')
  if (type === 'error') {
    v.record(row, 'reply', ['taskId', 'type', 'reason'])
    throw new SceneProjectFileError(
      v.choice(row.reason, ['invalid', 'version', 'budget'], 'reason'),
    )
  }
  if (type === 'progress') {
    v.record(row, 'reply', ['taskId', 'type', 'progress'])
    return { type, progress: v.choice(row.progress, ['validating'], 'progress') }
  }
  v.record(row, 'reply', ['taskId', 'type', 'document'])
  // The worker returns native owned pixels, never base64, shared memory or a
  // small view hiding an oversized backing buffer. Check the whole batch before cloning.
  let pixels = 0,
    layers = 0
  const document = v.record(row.document, 'document')
  for (const rawImage of v.list(document.images, 'images', SCENE_LIMITS.images)) {
    const image = v.record(rawImage, 'image')
    for (const rawLayer of v.list(image.layers, 'layers', SCENE_LIMITS.layersPerImage)) {
      const layer = v.record(rawLayer, 'layer'),
        bytes = layer.pixels
      v.requireScene(
        bytes instanceof Uint8Array &&
          bytes.buffer instanceof ArrayBuffer &&
          bytes.byteOffset === 0 &&
          bytes.byteLength === bytes.buffer.byteLength,
        'pixels',
        'Memória de pintura inválida.',
      )
      pixels += bytes.byteLength
      layers++
      v.requireScene(
        pixels <= SCENE_LIMITS.pixelBytes && layers <= SCENE_LIMITS.images,
        'pixels',
        'Pintura fora do orçamento.',
      )
    }
  }
  return { type, result: readSceneProjectContent(row.document) }
}
