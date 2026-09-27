import { describe, expect, test } from 'bun:test'
import { createGestureCoordinator } from '../core/gesture'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

function paint(document: MoldaSceneDocument, color: number): MoldaSceneDocument {
  const image = document.images[0]
  const layer = image?.layers[0]
  if (!image || !layer) throw new Error('Missing paint fixture')
  const pixels = layer.pixels.slice()
  pixels[0] = color
  return {
    ...document,
    images: [{ ...image, layers: [{ ...layer, pixels }] }, ...document.images.slice(1)],
  }
}

describe('shared document editor engine', () => {
  test('scene gestures preserve version, pixel ownership and one undo/redo step', () => {
    const document = migrateLegacyModel(makeModel()).document
    const original = structuredClone(document)
    const editor = createDocumentEditorStore({
      asset: document,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
    // Compile-time regression: a broad byte counter must not erase the inferred scene type.
    const exactDomain: Equal<ReturnType<typeof editor.getState>['asset'], MoldaSceneDocument> = true
    expect(exactDomain).toBe(true)
    const gestures = createGestureCoordinator({
      current: () => editor.getState().asset,
      revision: () => editor.getState().contentRevision,
      preview: (next) => editor.getState().replace(next),
      commit: (before, after) => editor.getState().commitGesture(before, after),
    })
    const token = gestures.begin()
    gestures.preview(token, paint(document, 5))
    gestures.preview(token, paint(document, 8))
    expect(editor.getState().canUndo).toBe(false)
    gestures.commit(token)
    expect(editor.getState().asset.formatVersion).toBe(2)
    editor.getState().undo()
    expect(editor.getState().asset.images).toEqual(document.images)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.images[0]?.layers[0]?.pixels[0]).toBe(8)
    const beforeCancel = editor.getState().asset
    const cancelled = gestures.begin()
    gestures.preview(cancelled, paint(beforeCancel, 9))
    gestures.cancel(cancelled)
    expect(editor.getState().asset).toBe(beforeCancel)
    expect(document).toEqual(original)
    editor.getState().dispose()
  })

  test('large shared image history uses byte deltas, not full-document snapshots', () => {
    const document = migrateLegacyModel(makeModel()).document
    const image = document.images[0]
    const layer = image?.layers[0]
    if (!image || !layer) throw new Error('Missing image')
    image.width = 1024
    image.height = 1024
    layer.pixels = new Uint8Array(1024 * 1024)
    const editor = createDocumentEditorStore({
      asset: document,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
      byteBudget: 8192,
    })
    for (let color = 1; color <= 12; color += 1)
      editor.getState().commit(paint(editor.getState().asset, color))
    for (let color = 11; color >= 0; color -= 1) {
      editor.getState().undo()
      expect(editor.getState().asset.images[0]?.layers[0]?.pixels[0]).toBe(color)
    }
    expect(editor.getState().canUndo).toBe(false)
    expect(document.images[0]?.layers[0]?.pixels[0]).toBe(0)
    editor.getState().dispose()
  })

  test('saving a scene drains edits arriving during the first write and retains monotonic revisions', async () => {
    const document = migrateLegacyModel(makeModel()).document
    const writes: MoldaSceneDocument[] = []
    let release!: () => void
    const firstWrite = new Promise<void>((resolve) => {
      release = resolve
    })
    const editor = createDocumentEditorStore({
      asset: document,
      sizeOf: structuredBytes,
      now: () => 1,
      persistence: {
        save: async (snapshot) => {
          writes.push(snapshot)
          if (writes.length === 1) await firstWrite
        },
      },
      autosaveMs: 60_000,
    })
    editor.getState().commit({ ...document, name: 'primeiro' })
    const flush = editor.getState().flush()
    editor.getState().commit({ ...editor.getState().asset, name: 'segundo' })
    release()
    await flush
    expect(writes.map((snapshot) => snapshot.name)).toEqual(['primeiro', 'segundo'])
    expect(writes[1]!.updatedAt).toBeGreaterThan(writes[0]!.updatedAt)
    expect(editor.getState().savedAsset).toBe(editor.getState().asset)
    expect(editor.getState().saveState).toBe('saved')
    expect(editor.getState().asset.formatVersion).toBe(2)
    editor.getState().dispose()
  })
})
