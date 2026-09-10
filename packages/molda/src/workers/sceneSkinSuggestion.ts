import { SceneValidationError } from '../scene/validation'
import {
  readSceneSkinSuggestionReply,
  readSceneSkinSuggestionRequest,
  type SceneSkinSuggestionRequest,
} from './sceneSkinSuggestionProtocol'
import { runWorkerTask, type TaskWorker } from './workerTask'

export async function suggestSkinInWorker(
  request: SceneSkinSuggestionRequest,
  signal?: AbortSignal,
  createWorker: () => TaskWorker = () =>
    new Worker(new URL('./sceneSkinSuggestion.worker.ts', import.meta.url), { type: 'module' }),
) {
  if (signal?.aborted) throw new DOMException('Task cancelled', 'AbortError')
  const owned = readSceneSkinSuggestionRequest(request)
  return runWorkerTask({
    request: owned,
    signal,
    createWorker,
    readReply: (raw) => {
      const reply = readSceneSkinSuggestionReply(raw, owned)
      if (reply.type === 'error') throw new SceneValidationError('worker', reply.message)
      return reply
    },
  })
}
