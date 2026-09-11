import { operateSceneImage } from '../scene/imageOperations'
import { SceneValidationError } from '../scene/validation'
import {
  readSceneImageRequest,
  type SceneImageRequest,
  sceneImageReply,
} from './sceneImageProtocol'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let source: SceneImageRequest | null = null
  try {
    source = readSceneImageRequest(event.data)
    const result = operateSceneImage(source.image, source.operation, source.palette)
    const reply = sceneImageReply(source, result)
    self.postMessage(
      reply,
      reply.layers.map((layer) => layer.pixels.buffer as ArrayBuffer),
    )
  } catch (error) {
    if (!source) throw error
    self.postMessage({
      documentId: source.documentId,
      revision: source.revision,
      imageId: source.image.id,
      type: 'error',
      message:
        error instanceof SceneValidationError ? error.message : 'Não consegui ajustar essa imagem.',
    })
  }
}
announceWorkerLoaded()
