import { encodeSceneFile } from '../export/sceneFile'
import { SceneValidationError } from '../scene/validation'
import { readSceneGlbToken, type SceneGlbToken, sceneGlbReply } from './sceneGlbProtocol'
import { readSceneGlbWireRequest } from './sceneGlbRequest'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>
self.onmessage = async (event: MessageEvent<unknown>) => {
  let token: SceneGlbToken | null = null
  try {
    token = readSceneGlbToken(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'validating' })
    const request = readSceneGlbWireRequest(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'encoding' })
    // Preparing a review is not permission to download: UI must confirm the returned report.
    const result = await encodeSceneFile(request.document, {
      allowLosses: true,
      format: request.format,
      animatedPaint: request.animatedPaint,
    })
    self.postMessage(sceneGlbReply(token, result), [result.bytes.buffer])
  } catch (error) {
    if (!token) throw error
    self.postMessage({
      ...token,
      type: 'error',
      message:
        error instanceof SceneValidationError || error instanceof RangeError
          ? error.message
          : 'Não consegui preparar esse GLB. Seu projeto continua na oficina.',
    })
  }
}
