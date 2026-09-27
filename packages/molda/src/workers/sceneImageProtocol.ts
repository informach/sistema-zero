import { isMoldaAssetId } from '../core/id'
import type { SceneRgba } from '../scene/composite'
import type { SceneImage } from '../scene/document'
import { readSceneImageOperation, type SceneImageOperation } from '../scene/imageOperations'
import { readSceneImage } from '../scene/readDocument'
import * as v from '../scene/validation'
import { readSceneWorkerPalette } from './scenePaletteProtocol'
import type { TaskReply } from './workerTask'

export interface SceneImageRequest {
  documentId: string
  revision: number
  image: SceneImage
  palette: SceneRgba[]
  operation: SceneImageOperation
}
export function readSceneImageRequest(raw: unknown): SceneImageRequest {
  const row = v.record(raw, 'request', ['documentId', 'revision', 'image', 'palette', 'operation'])
  v.requireScene(isMoldaAssetId(row.documentId), 'documentId', 'Identificador de criação inválido.')
  const revision = v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true)
  const palette = readSceneWorkerPalette(row.palette)
  const image = readSceneImage(row.image, 'image', { pixels: 0, layers: 0 }, palette.length)
  return {
    documentId: row.documentId,
    revision,
    image,
    palette,
    operation: readSceneImageOperation(row.operation, image, palette.length),
  }
}

/** Only changed layers cross back. Metadata/identity are retained from the source, not worker-authored. */
export function sceneImageReply(request: SceneImageRequest, result: SceneImage) {
  const layers = result.layers
    .filter((layer, i) => layer.pixels !== request.image.layers[i]?.pixels)
    .map(({ id, pixels }) => ({ id, pixels }))
  return {
    documentId: request.documentId,
    revision: request.revision,
    imageId: request.image.id,
    type: 'result' as const,
    encoding: result.encoding,
    layers,
  }
}

export function readSceneImageReply(
  raw: unknown,
  expected: SceneImageRequest,
): TaskReply<SceneImage, never> {
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.documentId === expected.documentId &&
      row.revision === expected.revision &&
      row.imageId === expected.image.id,
    'reply',
    'Esse resultado pertence a outra imagem, criação ou revisão.',
  )
  const type = v.choice(row.type, ['result', 'error'], 'reply.type')
  if (type === 'error') {
    v.record(row, 'reply', ['documentId', 'revision', 'imageId', 'type', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['documentId', 'revision', 'imageId', 'type', 'encoding', 'layers'])
  const image = expected.image
  const encoding = expected.operation.kind === 'rgba' ? 'rgba' : image.encoding
  v.requireScene(row.encoding === encoding, 'encoding', 'Formato de pixels inesperado.')
  const allowed = new Set(
    expected.operation.kind !== 'rgba'
      ? [expected.operation.layerId]
      : image.layers.map((layer) => layer.id),
  )
  const patches = new Map<string, Uint8Array>()
  const bytes = image.width * image.height * (encoding === 'rgba' ? 4 : 1)
  for (const raw of v.list(row.layers, 'layers', allowed.size)) {
    const layer = v.record(raw, 'layer', ['id', 'pixels'])
    const id = v.id(layer.id, 'layer.id')
    v.requireScene(
      allowed.has(id) && !patches.has(id),
      'layer.id',
      'Camada ausente, repetida ou fora da operação.',
    )
    v.requireScene(
      layer.pixels instanceof Uint8Array && layer.pixels.byteLength === bytes,
      'pixels',
      'Quantidade de pixels inválida.',
    )
    if (encoding === 'indexed')
      for (const color of layer.pixels)
        v.requireScene(color < expected.palette.length, 'pixel', 'Índice de cor ausente.')
    patches.set(id, layer.pixels.slice())
  }
  v.requireScene(
    image.encoding === encoding || patches.size === image.layers.length,
    'layers',
    'A conversão precisa conservar todas as camadas.',
  )
  return {
    type,
    result:
      patches.size === 0
        ? image
        : {
            ...image,
            encoding,
            layers: image.layers.map((layer) =>
              patches.has(layer.id) ? { ...layer, pixels: patches.get(layer.id)! } : layer,
            ),
          },
  }
}
