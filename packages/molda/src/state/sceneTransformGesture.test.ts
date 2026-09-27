import { describe, expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { groupSceneNodes, renameSceneNode, setSceneNodeFlag } from '../scene/commands'
import { indexSceneDocument } from '../scene/documentIndex'
import { identityMatrix } from '../scene/matrix'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'
import { createSceneTransformGesture } from './sceneTransformGesture'

function setup() {
  const source = groupSceneNodes(migrateLegacyModel(makeModel()).document, ['body'], {
    nextId: () => 'group',
  })
  const errors: unknown[] = []
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  const gesture = createSceneTransformGesture(editor, (error) => errors.push(error))
  const delta = (x: number) => {
    const matrix = identityMatrix()
    matrix[12] = x
    return matrix
  }
  return { editor, source, errors, gesture, delta }
}

describe('scene transform gestures', () => {
  test('cancel also restores disk when a preview was explicitly saved during the gesture', async () => {
    const source = migrateLegacyModel(makeModel()).document
    const writes: (typeof source)[] = []
    let restored!: () => void
    const restoration = new Promise<void>((resolve) => {
      restored = resolve
    })
    const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      autosaveMs: 1,
      persistence: {
        save: async (document) => {
          writes.push(document)
        },
      },
      onSaved: () => {
        if (writes.length === 2) restored()
      },
    })
    const gesture = createSceneTransformGesture(editor, (error) => {
      throw error
    })
    try {
      gesture.begin(['body'])
      const delta = identityMatrix()
      delta[12] = 5
      gesture.preview(delta)
      await editor.getState().flush()
      gesture.end(false)
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          restoration,
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => reject(new Error('Cancellation was not saved')), 250)
          }),
        ])
      } finally {
        clearTimeout(timeout)
      }
      expect(writes).toHaveLength(2)
      expect(writes[1]?.nodes).toEqual(source.nodes)
      expect(writes[1]?.updatedAt).toBeGreaterThan(writes[0]?.updatedAt ?? NaN)
      expect(editor.getState().canUndo).toBe(false)
    } finally {
      editor.getState().dispose()
    }
  }, 1000)
  test('absolute previews apply once to nested selections, with one undo and exact cancellation', () => {
    const f = setup()
    try {
      expect(f.gesture.begin(['group', 'body'])).toBe(true)
      f.gesture.preview(f.delta(1))
      f.gesture.preview(f.delta(4))
      expect(f.editor.getState().canUndo).toBe(false)
      const before = indexSceneDocument(f.source).scene.worldMatrices.get('body')
      const after = indexSceneDocument(f.editor.getState().asset).scene.worldMatrices.get('body')
      expect(after?.[12]).toBeCloseTo((before?.[12] ?? NaN) + 4, 9)
      f.gesture.end(true)
      f.editor.getState().undo()
      expect(f.editor.getState().asset.nodes).toEqual(f.source.nodes)
      expect(f.editor.getState().canUndo).toBe(false)
      const current = f.editor.getState().asset
      f.gesture.begin(['body'])
      f.gesture.preview(f.delta(7))
      f.gesture.end(false)
      expect(f.editor.getState().asset).toBe(current)
      expect(f.errors).toHaveLength(0)
    } finally {
      f.editor.getState().dispose()
    }
  })
  test('unrelated revision, locked descendants and invalid deltas cannot be overwritten by a late gesture', () => {
    const f = setup()
    try {
      f.gesture.begin(['body'])
      f.gesture.preview(f.delta(1))
      f.editor.getState().commit(renameSceneNode(f.editor.getState().asset, 'wing', 'editado'))
      const current = f.editor.getState().asset
      expect(f.gesture.preview(f.delta(8))).toBe(false)
      f.gesture.end(true)
      expect(f.editor.getState().asset).toBe(current)
      f.gesture.begin(['body'])
      expect(f.gesture.preview(f.delta(Infinity))).toBe(false)
      expect(f.editor.getState().asset).toBe(current)
      f.editor.getState().commit(setSceneNodeFlag(current, ['body'], 'locked', true))
      expect(f.gesture.begin(['group'])).toBe(false)
      expect(f.errors).toHaveLength(2)
    } finally {
      f.editor.getState().dispose()
    }
  })
})
