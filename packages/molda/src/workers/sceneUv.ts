import { SceneValidationError } from '../scene/validation'
import { readSceneUvReply, type SceneUvRequest } from './sceneUvProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

export function autoUvInWorker(
  request: SceneUvRequest,
  signal?: AbortSignal,
  createWorker: () => TaskWorker = () =>
    new Worker(new URL('./sceneUv.worker.ts', import.meta.url), { type: 'module' }),
) {
  return runWorkerTask({
    request,
    signal,
    createWorker,
    readReply: (raw) => {
      const reply = readSceneUvReply(raw, request)
      if (reply.type === 'error') throw new SceneValidationError('worker', reply.message)
      return reply
    },
  })
}
