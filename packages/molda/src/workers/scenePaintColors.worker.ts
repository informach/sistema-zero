import { sceneImagePaintColors } from '../scene/paintIndicators'
import {
  readScenePaintColorsRequest,
  type ScenePaintColorsRequest,
} from './scenePaintColorsProtocol'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let request: ScenePaintColorsRequest | null = null
  try {
    request = readScenePaintColorsRequest(event.data)
    const colors = sceneImagePaintColors(request.image, request.palette, request.base)
    self.postMessage({
      documentId: request.documentId,
      revision: request.revision,
      imageId: request.image.id,
      type: 'result',
      colors,
    })
  } catch (error) {
    if (!request) throw error
    self.postMessage({
      documentId: request.documentId,
      revision: request.revision,
      imageId: request.image.id,
      type: 'error',
      message: 'Não foi possível conferir as cores dessa peça.',
    })
  }
}
announceWorkerLoaded()
