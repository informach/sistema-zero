import { readObjBundle } from '../import/objBundle'
import { ObjInputError } from '../import/objInput'
import { convertObjDocument } from '../import/objNativeDocument'
import { SceneValidationError } from '../scene/validation'
import { type ObjImportResult, objImportReply } from './objImportProtocol'
import { type ObjImportToken, readObjImportRequest, readObjImportToken } from './objImportRequest'
import { announceWorkerLoaded } from './workerHandshake'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>

self.onmessage = (event: MessageEvent<unknown>) => {
  let token: ObjImportToken | null = null
  try {
    token = readObjImportToken(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'validating' })
    // Structured clone already owns the input. No second whole-bundle snapshot in the worker.
    const request = readObjImportRequest(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'reading' })
    const read = readObjBundle(request.bytes, request.files, request.entryPath)
    let result: ObjImportResult
    if (read.status === 'missing') result = read
    else {
      self.postMessage({ ...token, type: 'progress', progress: 'converting' })
      result = { status: 'ready', ...convertObjDocument(read, request.identity, request.options) }
    }
    const transfers =
      result.status === 'ready'
        ? result.document.images.flatMap((image) =>
            image.layers.map((layer) => layer.pixels.buffer),
          )
        : []
    // Only completed derived pixels are transferred. Never source buffers or a partial document.
    self.postMessage(objImportReply(token, result), transfers)
  } catch (error) {
    if (!token) throw error
    const known = error instanceof ObjInputError || error instanceof SceneValidationError
    self.postMessage({
      ...token,
      type: 'error',
      reason: error instanceof ObjInputError ? error.reason : 'invalid',
      path: known ? error.path : 'import',
      message:
        known && error.message.length <= 1024
          ? error.message
          : 'Não consegui preparar esse arquivo. Os arquivos originais e sua criação continuam intactos.',
    })
  }
}
announceWorkerLoaded()
