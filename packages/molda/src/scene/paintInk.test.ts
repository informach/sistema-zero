import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { createScenePaintGesture } from '../state/scenePaintGesture'
import { makeModel } from '../testing/fixtures'
import { compositeSceneImage, scenePalette } from './composite'
import { migrateLegacyModel } from './migrateLegacy'
import { prepareSceneInk, sampleSceneInk } from './paintInk'
import { patchScenePieceAppearance } from './pieceAppearance'

test('a new visual ink joins the first stroke, one undo also removes the prepared color', () => {
  const source = migrateLegacyModel(makeModel()).document
  const image = source.images[0]!,
    material = source.materials.find((entry) => entry.colorImageId === image.id)!
  const target = {
    nodeId: 'body',
    materialId: material.id,
    imageId: image.id,
    layerId: image.layers[0]!.id,
  }
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  try {
    const gesture = createScenePaintGesture(editor, (error) => {
      throw error
    })
    expect(gesture.begin(target, [11, 77, 199, 255], 2)).toBe(true)
    expect(editor.getState().content).toBe(source)
    expect(gesture.segment([0, 0], [1, 0])).toBe(true)
    gesture.end(true)
    expect(
      compositeSceneImage(
        editor.getState().content.images[0]!,
        scenePalette(editor.getState().content),
      ).slice(0, 4),
    ).toEqual(new Uint8Array([11, 77, 199, 255]))
    editor.getState().undo()
    expect(editor.getState().content.extraColors).toEqual(source.extraColors)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    editor.getState().dispose()
  }
})

test('picker composites lower layers and base; changing the base preserves drawings and other pieces', () => {
  const source = migrateLegacyModel(makeModel()).document
  const image = source.images[0]!,
    material = source.materials.find((entry) => entry.colorImageId === image.id)!
  const empty = {
    ...image,
    layers: image.layers.map((layer) => ({
      ...layer,
      pixels: new Uint8Array(layer.pixels.length),
    })),
  }
  expect(sampleSceneInk(source, material, empty)).toEqual(
    sampleSceneInk(source, material, undefined),
  )
  const next = patchScenePieceAppearance(source, 'body', {
    baseColor: { kind: 'rgba', value: [1, 0, 0, 1] },
  })
  expect(next.images).toBe(source.images)
  expect(next.materials.find((entry) => entry.id === 'material:wing')).toBe(
    source.materials.find((entry) => entry.id === 'material:wing'),
  )
  const free = prepareSceneInk(source, image.id, [11, 77, 199, 128])
  expect(free.document.images[0]!.encoding).toBe('rgba')
  expect(free.color).toEqual([11, 77, 199, 128])
  expect(source.images[0]!.encoding).toBe('indexed')
})
