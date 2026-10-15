import { SceneValidationError } from '../scene/validation'
import { readSolidCutReply, type SolidCutRequest } from './sceneSolidCutProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

export function cutSolidInWorker(
  request: SolidCutRequest,
  signal?: AbortSignal,
  createWorker: () => TaskWorker = () =>
    new Worker(new URL('./sceneSolidCut.worker.ts', import.meta.url), { type: 'module' }),
) {
  return runWorkerTask({
    request,
    signal,
    createWorker,
    readReply: (raw) => {
      const reply = readSolidCutReply(raw, request)
      if (reply.type === 'error') throw new SceneValidationError('cut', reply.message)
      return reply
    },
  })
}
