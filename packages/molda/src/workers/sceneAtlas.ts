import { SceneValidationError } from '../scene/validation'
import { readSceneAtlasReply, type SceneAtlasRequest } from './sceneAtlasProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

export function bakeAtlasInWorker(
  request: SceneAtlasRequest,
  signal?: AbortSignal,
  createWorker: () => TaskWorker = () =>
    new Worker(new URL('./sceneAtlas.worker.ts', import.meta.url), { type: 'module' }),
) {
  return runWorkerTask({
    request,
    signal,
    createWorker,
    readReply: (raw) => {
      const reply = readSceneAtlasReply(raw, request)
      if (reply.type === 'error') throw new SceneValidationError('worker', reply.message)
      return reply
    },
  })
}
