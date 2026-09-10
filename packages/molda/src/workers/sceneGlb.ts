import { SceneValidationError } from '../scene/validation'
import { readSceneGlbReply, type SceneGlbProgress, type SceneGlbRequest } from './sceneGlbProtocol'
import { packSceneGlbRequest } from './sceneGlbRequest'
import { runWorkerTask, type TaskWorker } from './workerTask'

/** Prepares bytes and a loss report for explicit confirmation; does not save/download anything. */
export async function prepareSceneGlbInWorker(
  request: SceneGlbRequest,
  options: {
    signal?: AbortSignal
    onProgress?: (progress: SceneGlbProgress) => void
    createWorker?: () => TaskWorker
  } = {},
) {
  if (options.signal?.aborted) throw new DOMException('Task cancelled', 'AbortError')
  return runWorkerTask({
    request: packSceneGlbRequest(request),
    signal: options.signal,
    onProgress: options.onProgress,
    createWorker:
      options.createWorker ??
      (() => new Worker(new URL('./sceneGlb.worker.ts', import.meta.url), { type: 'module' })),
    readReply: (raw) => {
      const reply = readSceneGlbReply(raw, request)
      if (reply.type === 'error') throw new SceneValidationError('export', reply.message)
      return reply
    },
  })
}
