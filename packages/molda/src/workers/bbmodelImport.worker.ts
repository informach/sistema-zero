import { BbmodelInputError } from '../import/bbmodelInput'
import { convertBbmodelDocument } from '../import/bbmodelNativeDocument'
import { SceneValidationError } from '../scene/validation'
import { bbmodelImportReply } from './bbmodelImportProtocol'
import {
  type BbmodelImportToken,
  readBbmodelImportRequest,
  readBbmodelImportToken,
} from './bbmodelImportRequest'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>

self.onmessage = (event: MessageEvent<unknown>) => {
  let token: BbmodelImportToken | null = null
  try {
    token = readBbmodelImportToken(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'validating' })
    // Structured clone owns these bytes; no second whole-bundle snapshot inside the worker.
    const request = readBbmodelImportRequest(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'converting' })
    const result = convertBbmodelDocument(
        {
          bytes: request.bytes,
          files: request.files,
          entryPath: request.entryPath,
        },
        request.identity,
        request.options,
      ),
      transfers =
        result.status === 'ready'
          ? result.document.images.flatMap((image) =>
              image.layers.map((layer) => layer.pixels.buffer),
            )
          : []
    // Only complete derived pixels are transferred, never original source or partial authorial data.
    self.postMessage(bbmodelImportReply(token, result), transfers)
  } catch (error) {
    if (!token) throw error
    const known = error instanceof BbmodelInputError || error instanceof SceneValidationError
    self.postMessage({
      ...token,
      type: 'error',
      reason: error instanceof BbmodelInputError ? error.reason : 'invalid',
      path: known ? error.path : 'import',
      message:
        known && error.message.length <= 1024
          ? error.message
          : 'Não consegui preparar esse arquivo. Os arquivos originais e sua criação continuam intactos.',
    })
  }
}
announceWorkerLoaded()
