import { SceneValidationError } from '../scene/validation'
import { readSceneImageReply, type SceneImageRequest } from './sceneImageProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

export function operateImageInWorker(
  request: SceneImageRequest,
  signal?: AbortSignal,
  createWorker: () => TaskWorker = () =>
    new Worker(new URL('./sceneImage.worker.ts', import.meta.url), { type: 'module' }),
) {
  return runWorkerTask({
    request,
    signal,
    createWorker,
    readReply: (raw) => {
      const reply = readSceneImageReply(raw, request)
      if (reply.type === 'error') throw new SceneValidationError('worker', reply.message)
      return reply
    },
  })
}
