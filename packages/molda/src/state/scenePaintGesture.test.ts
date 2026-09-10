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
