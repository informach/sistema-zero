import { type GltfDocument, readGltfDocument } from '../import/gltfDocument'
import { GltfInputError } from '../import/gltfInput'
import { convertGltfDocument } from '../import/gltfNativeDocument'
import { SceneValidationError } from '../scene/validation'
import {
  type GltfImportInspection,
  type GltfImportResult,
  gltfImportReply,
} from './gltfImportProtocol'
import {
  type GltfImportToken,
  readGltfImportRequest,
  readGltfImportToken,
} from './gltfImportRequest'

declare const self: Pick<Worker, 'onmessage' | 'postMessage'>

function inspect(source: GltfDocument): GltfImportInspection {
  return {
    format: source.source.format,
    defaultScene: source.graph.defaultScene,
    scenes: source.graph.scenes.map((scene, index) => ({
      index,
      name: scene.name,
      roots: scene.roots.length,
    })),
    nodes: source.graph.nodes.length,
    meshes: source.meshes.length,
    skins: source.skins.length,
    animations: source.animations.length,
    unhandledExtensions: [...source.extensions.unhandled],
  }
}
self.onmessage = (event: MessageEvent<unknown>) => {
  let token: GltfImportToken | null = null
  try {
    token = readGltfImportToken(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'validating' })
    // Structured clone has already made worker-owned input. Do not recopy the entire bundle here.
    const request = readGltfImportRequest(event.data)
    self.postMessage({ ...token, type: 'progress', progress: 'reading' })
    const read = readGltfDocument(request.bytes, request.files, request.entryPath)
    let result: GltfImportResult
    if (read.status === 'missing') result = read
    else if (request.sceneIndex === 'inspect')
      result = { status: 'inspect', source: inspect(read.document) }
    else {
      self.postMessage({ ...token, type: 'progress', progress: 'converting' })
      result = {
        status: 'ready',
        ...convertGltfDocument(
          read.document,
          request.sceneIndex,
          request.identity,
          request.options,
        ),
      }
    }
    // Only derived, complete, owned pixel buffers leave this worker. No input is transferred.
    const transfers =
      result.status === 'ready'
        ? result.document.images.flatMap((image) =>
            image.layers.map((layer) => layer.pixels.buffer),
          )
        : []
    self.postMessage(gltfImportReply(token, result), transfers)
  } catch (error) {
    if (!token) throw error
    const known = error instanceof GltfInputError || error instanceof SceneValidationError
    self.postMessage({
      ...token,
      type: 'error',
      reason: error instanceof GltfInputError ? error.reason : 'invalid',
      path: known ? error.path : 'import',
      message:
        known && error.message.length <= 1024
          ? error.message
          : 'Não consegui preparar esse arquivo. Os arquivos originais e sua criação continuam intactos.',
    })
  }
}
