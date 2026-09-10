import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import type { SceneImageOperation } from '../scene/imageOperations'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'
import { createSceneImageTask } from './sceneImageTask'
import {
  createScenePaintShapeGesture,
  type ScenePaintDraft,
  type ScenePaintScope,
} from './scenePaintShapeGesture'

function setup() {
  const source = migrateLegacyModel(makeModel()).document,
    image = source.images[0]!
  const target = {
    nodeId: 'body',
    imageId: image.id,
    materialId: source.materials.find((m) => m.colorImageId === image.id)!.id,
    layerId: image.layers[0]!.id,
  }
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const previews: Array<ScenePaintDraft | null> = [],
    selections: ScenePaintScope[] = [],
    errors: unknown[] = []
  const tasks: Promise<boolean>[] = [],
    operations: SceneImageOperation[] = []
  const task = createSceneImageTask(editor, (_busy, error) => {
    if (error) errors.push(error)
  })
  const gesture = createScenePaintShapeGesture(editor, {
    preview: (draft) => previews.push(draft),
    select: (scope) => selections.push(scope),
    error: (error) => errors.push(error),
    run: (source, id, op) => {
      operations.push(op)
      const result = task.run(source, id, op)
      tasks.push(result)
      return result
    },
  })
  return {
    source,
    target,
    editor,
    gesture,
    previews,
    selections,
    errors,
    tasks,
    operations,
    close() {
      gesture.cancel()
      task.cancel()
      editor.getState().dispose()
    },
  }
}
test('shape outline is session-only, freezes settings, and runs one real worker command after release', async () => {
  const f = setup()
  try {
    expect(
      f.gesture.begin(
        f.source,
        f.target,
        { point: [0, 0], region: 'face' },
        { tool: 'rectangle', color: 7, brush: 1, filled: true },
      ),
    ).toBe(true)
    f.gesture.move({ point: [4, 3], region: 'face' })
    f.gesture.move({ point: [2, 2], region: 'face' })
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.tasks).toHaveLength(0)
    expect(f.previews.at(-1)?.to).toEqual([2, 2])
    f.gesture.end(true)
    expect(f.tasks).toHaveLength(1)
    expect(await f.tasks[0]).toBe(true)
    expect(f.operations[0]).toMatchObject({ from: [0, 0], to: [2, 2], filled: true, color: 7 })
    expect(f.editor.getState().asset.images).not.toEqual(f.source.images)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.images).toEqual(f.source.images)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.errors).toEqual([])
  } finally {
    f.close()
  }
})
test('selection is not authorial and leaving a region or replacing a revision cancels a shape draft', () => {
  const f = setup()
  try {
    f.gesture.begin(f.source, f.target, { point: [4, 3], region: 'image' }, { tool: 'select' })
    f.gesture.move({ point: [1, 1], region: 'image' })
    f.gesture.end(true)
    expect(f.selections[0]?.region).toEqual({ x0: 1, y0: 1, x1: 4, y1: 3 })
    expect(f.editor.getState().asset).toBe(f.source)
    for (const sample of [null, { point: [2, 2] as [number, number], region: 'other-face' }]) {
      f.gesture.begin(
        f.source,
        f.target,
        { point: [1, 1], region: 'image' },
        { tool: 'ellipse', color: 7, brush: 1, filled: false },
      )
      f.gesture.move(sample)
      f.gesture.end(true)
    }
    f.gesture.begin(
      f.source,
      f.target,
      { point: [1, 1], region: 'image' },
      { tool: 'line', color: 7, brush: 1, filled: false },
    )
    f.editor.getState().commit({ ...f.source, name: 'Outra revisão' })
    const external = f.editor.getState().asset
    f.gesture.move({ point: [2, 2], region: 'image' })
    f.gesture.end(true)
    expect(f.tasks).toHaveLength(0)
    expect(f.previews.at(-1)).toBeNull()
    expect(f.editor.getState().asset).toBe(external)
  } finally {
    f.close()
  }
})
