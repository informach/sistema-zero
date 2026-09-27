import { SceneValidationError } from '../scene/validation'
import { type MeshCheckRequest, readMeshCheckReply } from './sceneMeshCheckProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

/** One cancellable owner per explicit scan/repair. Neither paint nor live buffers cross this boundary. */
export function checkMeshInWorker(
  request: MeshCheckRequest,
  signal?: AbortSignal,
  createWorker: () => TaskWorker = () =>
    new Worker(new URL('./sceneMeshCheck.worker.ts', import.meta.url), { type: 'module' }),
) {
  return runWorkerTask({
    createWorker,
    request,
    signal,
    readReply: (reply) => {
      const result = readMeshCheckReply(reply, request)
      if (result.type === 'error') throw new SceneValidationError('worker', result.message)
      return result
    },
  })
}
