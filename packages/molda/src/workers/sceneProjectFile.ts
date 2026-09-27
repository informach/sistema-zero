import {
  readSceneProjectFileReply,
  readSceneProjectFileRequest,
  type SceneProjectFileProgress,
  type SceneProjectFileRequest,
} from './sceneProjectFileProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

/** No synchronous parse fallback when workers are unavailable. */
export function prepareSceneProjectFileInWorker(
  request: SceneProjectFileRequest,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: SceneProjectFileProgress) => void
    createWorker?: () => TaskWorker
  } = {},
) {
  options.signal?.throwIfAborted()
  const owned = readSceneProjectFileRequest(request, true)
  return runWorkerTask({
    request: owned,
    signal: options.signal,
    onProgress: options.onProgress,
    createWorker:
      options.createWorker ??
      (() =>
        new Worker(new URL('./sceneProjectFile.worker.ts', import.meta.url), { type: 'module' })),
    readReply: (raw) => readSceneProjectFileReply(raw, owned.taskId),
  })
}
