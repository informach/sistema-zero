import { newId } from '../core/id'
import { requireScenePaintCapacity } from './appearanceCommands'
import { requireEditableAppearance, sceneAppearanceUsage } from './appearanceUsage'
import { finishSceneCommand } from './commandContext'
import { scenePalette } from './composite'
import type { MoldaSceneDocument, SceneImage } from './document'
import { convertSceneImageRgba } from './imageOperations'
import { SCENE_LIMITS } from './limits'
import * as v from './validation'

export type SceneLayerOperation =
  | { kind: 'add'; name: string }
  | { kind: 'rename'; layerId: string; name: string }
  | { kind: 'opacity'; layerId: string; value: number }
  | { kind: 'visible'; layerId: string; value: boolean }
  | { kind: 'move'; layerId: string; direction: -1 | 1 }
  | { kind: 'duplicate'; layerId: string }
  | { kind: 'remove'; layerId: string }
  | { kind: 'rgba' }

export function editSceneImageLayers(
  document: MoldaSceneDocument,
  imageId: string,
  operation: SceneLayerOperation,
  nextId: () => string = newId,
) {
  const usage = sceneAppearanceUsage(document)
  const image = usage.index.images.get(imageId)
  v.requireScene(image, 'image', 'Essa imagem não existe mais.')
  requireEditableAppearance(usage, usage.images.get(imageId) ?? [])
  const kind = v.choice(
    operation.kind,
    ['add', 'rename', 'opacity', 'visible', 'move', 'duplicate', 'remove', 'rgba'],
    'layer.kind',
  )
  const keys = {
    add: ['name'],
    rename: ['layerId', 'name'],
    opacity: ['layerId', 'value'],
    visible: ['layerId', 'value'],
    move: ['layerId', 'direction'],
    duplicate: ['layerId'],
    remove: ['layerId'],
    rgba: [],
  }
  v.record(operation, 'layer', ['kind', ...keys[kind]])
  let result: SceneImage
  if (operation.kind === 'rgba') {
    if (image.encoding === 'rgba') return document
    requireScenePaintCapacity(document, image.width * image.height * image.layers.length * 3)
    result = convertSceneImageRgba(image, scenePalette(document))
  } else {
    const layers = [...image.layers]
    const index =
      'layerId' in operation ? layers.findIndex((layer) => layer.id === operation.layerId) : -1
    v.requireScene(operation.kind === 'add' || index >= 0, 'layer', 'Essa camada não existe mais.')
    const layer = layers[index]
    if (operation.kind === 'add' || operation.kind === 'duplicate') {
      v.requireScene(
        layers.length < SCENE_LIMITS.layersPerImage,
        'layers',
        'Essa imagem já tem o máximo de camadas.',
      )
      const name = operation.kind === 'add' ? v.text(operation.name, 'layer.name') : layer!.name
      requireScenePaintCapacity(
        document,
        image.width * image.height * (image.encoding === 'rgba' ? 4 : 1),
        1,
      )
      const id = v.id(nextId(), 'layer.id')
      v.requireScene(
        !layers.some((layer) => layer.id === id),
        'layer.id',
        'Essa identidade de camada já existe.',
      )
      const added =
        operation.kind === 'add'
          ? {
              id,
              name,
              visible: true,
              opacity: 1,
              pixels: new Uint8Array(
                image.width * image.height * (image.encoding === 'rgba' ? 4 : 1),
              ),
            }
          : { ...layer!, id, pixels: layer!.pixels.slice() }
      layers.splice(operation.kind === 'add' ? layers.length : index + 1, 0, added)
    } else if (operation.kind === 'remove') {
      v.requireScene(layers.length > 1, 'layers', 'Mantenha pelo menos uma camada na imagem.')
      layers.splice(index, 1)
    } else if (operation.kind === 'move') {
      v.requireScene(
        operation.direction === -1 || operation.direction === 1,
        'layer.direction',
        'Escolha subir ou descer uma camada.',
      )
      const to = index + operation.direction
      if (to < 0 || to >= layers.length) return document
      layers[index] = layers[to]!
      layers[to] = layer!
    } else if (operation.kind === 'rename') {
      const name = v.text(operation.name, 'layer.name')
      if (name === layer!.name) return document
      layers[index] = { ...layer!, name }
    } else if (operation.kind === 'visible') {
      const visible = v.boolean(operation.value, 'layer.visible')
      if (visible === layer!.visible) return document
      layers[index] = { ...layer!, visible }
    } else {
      const opacity = v.number(operation.value, 'layer.opacity', 0, 1)
      if (opacity === layer!.opacity) return document
      layers[index] = { ...layer!, opacity }
    }
    result = { ...image, layers }
  }
  return finishSceneCommand({
    ...document,
    images: document.images.map((entry) => (entry.id === imageId ? result : entry)),
  })
}
