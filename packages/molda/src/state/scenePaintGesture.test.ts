import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'
import { createScenePaintGesture } from './scenePaintGesture'

function fixture() {
  const document = migrateLegacyModel(makeModel()).document
  const image = document.images[0]!
  const material = document.materials.find((entry) => entry.colorImageId === image.id)!
  const target = {
    nodeId: 'body',
    materialId: material.id,
    imageId: image.id,
    layerId: image.layers[0]!.id,
  }
  const editor = createDocumentEditorStore({
    asset: document,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const errors: unknown[] = []
  const gesture = createScenePaintGesture(editor, (error) => errors.push(error))
  return { editor, document, image, target, gesture, errors }
}

test('paint gesture owns a whole stroke, supports no-op strokes, cancel and exactly one undo/redo', () => {
  const { editor, document, image, target, gesture, errors } = fixture()
  try {
    expect(gesture.begin(target, 7, 1, image)).toBe(true)
    expect(gesture.segment([0, 0], [1, 0])).toBe(true)
    expect(gesture.segment([1, 0], [1, 2])).toBe(true)
    const painted = editor.getState().asset
    expect(gesture.end(true)).toBe(true)
    expect(gesture.end(true)).toBe(false)
    editor.getState().undo()
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.images).toEqual(painted.images)
    expect(gesture.begin(target, 7, 1)).toBe(true)
    expect(gesture.segment([0, 0], [0, 0])).toBe(true)
    expect(gesture.end(true)).toBe(true)
    editor.getState().undo()
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    expect(gesture.begin(target, 3, 1)).toBe(true)
    gesture.segment([0, 0], [2, 0])
    gesture.cancel()
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(errors).toEqual([])
  } finally {
    editor.getState().dispose()
  }
})

test('stale paint tokens never overwrite external edits, undo, locks or replacement images', () => {
  const { editor, document, image, target, gesture, errors } = fixture()
  try {
    expect(gesture.begin(target, 7, 1, { ...image })).toBe(false)
    expect(gesture.begin(target, 7, 1, image)).toBe(true)
    gesture.segment([0, 0], [1, 0])
    const external = { ...editor.getState().asset, name: 'Outra edição' }
    editor.getState().commit(external)
    const current = editor.getState().asset
    expect(gesture.segment([1, 0], [1, 2])).toBe(false)
    gesture.cancel()
    expect(editor.getState().asset).toBe(current)
    expect(gesture.end(true)).toBe(false)
    expect(errors.length).toBe(2)
    expect(document.images[0]).toBe(image)
  } finally {
    editor.getState().dispose()
  }
})

test('o limite vale por amostra: cada pedaço do traço fica na face em que caiu', () => {
  const { editor, document, image, target, gesture, errors } = fixture()
  const at = (x: number, y: number) =>
    editor.getState().asset.images[0]!.layers[0]!.pixels[y * image.width + x]
  try {
    expect(gesture.begin(target, 7, 3, image)).toBe(true)
    // Pincel largo encostado na borda da face da esquerda: não passa para a da direita.
    expect(gesture.segment([2, 2], [2, 2], { x0: 0, y0: 0, x1: 2, y1: 5 })).toBe(true)
    expect([at(1, 1), at(2, 2), at(3, 2)]).toEqual([
      7,
      7,
      image.layers[0]!.pixels[2 * image.width + 3],
    ])
    // O traço atravessa para a outra face, e o pedaço de lá fica preso a ela.
    expect(gesture.segment([4, 2], [4, 2], { x0: 4, y0: 0, x1: 7, y1: 5 })).toBe(true)
    expect([at(3, 2), at(4, 2), at(5, 3)]).toEqual([
      image.layers[0]!.pixels[2 * image.width + 3],
      7,
      7,
    ])
    expect(gesture.end(true)).toBe(true)
    editor.getState().undo()
    expect(editor.getState().asset.images).toEqual(document.images)
    // Fora da área escolhida no começo do traço: nada a pintar, e o traço continua vivo.
    expect(gesture.begin(target, 7, 1, undefined, { x0: 10, y0: 10, x1: 12, y1: 12 })).toBe(true)
    expect(gesture.segment([1, 1], [1, 1], { x0: 0, y0: 0, x1: 2, y1: 2 })).toBe(true)
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(gesture.segment([11, 11], [11, 11], { x0: 9, y0: 9, x1: 15, y1: 15 })).toBe(true)
    expect(at(11, 11)).toBe(7)
    gesture.cancel()
    expect(errors).toEqual([])
  } finally {
    editor.getState().dispose()
  }
})
