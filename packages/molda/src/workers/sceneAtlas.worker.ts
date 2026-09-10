import { bakeSceneImageAtlas } from '../scene/imageAtlas'
import { SceneValidationError } from '../scene/validation'
import {
  readSceneAtlasRequest,
  type SceneAtlasRequest,
  sceneAtlasReply,
} from './sceneAtlasProtocol'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = (event: MessageEvent<unknown>) => {
  let source: SceneAtlasRequest | null = null
  try {
    source = readSceneAtlasRequest(event.data)
    const raster = bakeSceneImageAtlas(source.images, source.tiles, source.palette)
    self.postMessage(sceneAtlasReply(source, raster), [raster.pixels.buffer as ArrayBuffer])
  } catch (error) {
    if (!source) throw error
    self.postMessage({
      documentId: source.documentId,
      revision: source.revision,
      type: 'error',
      message:
        error instanceof SceneValidationError
          ? error.message
          : 'Não consegui juntar essas pinturas.',
    })
  }
}
