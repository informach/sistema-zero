import { readScenePaintColorsReply, type ScenePaintColorsRequest } from './scenePaintColorsProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

export function scenePaintColorsInWorker(
  request: ScenePaintColorsRequest,
  signal?: AbortSignal,
  createWorker: () => TaskWorker = () =>
    new Worker(new URL('./scenePaintColors.worker.ts', import.meta.url), { type: 'module' }),
) {
  return runWorkerTask({
    request,
    signal,
    createWorker,
    readReply: (raw) => readScenePaintColorsReply(raw, request),
  })
}
