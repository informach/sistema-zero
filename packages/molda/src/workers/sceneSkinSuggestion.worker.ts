import { suggestSceneSkinWeights } from '../scene/skinSuggestion'
import { SceneValidationError } from '../scene/validation'
import {
  readSceneSkinSuggestionRequest,
  type SceneSkinSuggestionRequest,
  sceneSkinSuggestionReply,
} from './sceneSkinSuggestionProtocol'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let request: SceneSkinSuggestionRequest | null = null
  try {
    request = readSceneSkinSuggestionRequest(event.data)
    const reply = sceneSkinSuggestionReply(request, suggestSceneSkinWeights(request.data))
    self.postMessage(reply, [
      reply.indices.buffer as ArrayBuffer,
      reply.weights.buffer as ArrayBuffer,
    ])
  } catch (error) {
    if (!request) throw error
    self.postMessage({
      type: 'error',
      sourceKey: request.sourceKey,
      nodeId: request.data.nodeId,
      message:
        error instanceof SceneValidationError
          ? error.message
          : 'Não consegui preparar esses pesos.',
    })
  }
}
announceWorkerLoaded()
