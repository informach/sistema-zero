import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { groupSceneNodes, renameSceneNode, transformSceneNodes } from '../scene/commands'
import { indexSceneDocument } from '../scene/documentIndex'
import {
  composeTransform,
  quaternionFromEulerXYZ,
  transformDirection,
  transformPoint,
} from '../scene/matrix'
import { sceneNodePivot, scenePivotRotation } from '../scene/pivot'
import { prepareSceneAnimation } from '../scene/sampleAnimation'
import { animatedScene } from '../testing/sceneAnimation'
import { createDocumentEditorStore } from './editorStore'
import { createScenePivotGesture } from './scenePivotGesture'

test('pivot drags in a transformed parent stage only metadata, preserve animation and create one undo', async () => {
  let source = groupSceneNodes(animatedScene(), ['body'], { nextId: () => 'parent' })
  source = transformSceneNodes(
    source,
    ['parent'],
    composeTransform({
      kind: 'trs',
      translation: [4, 8, -2],
      rotation: quaternionFromEulerXYZ([30, 40, 20]),
      scale: [2, 3, 4],
    }),
  )
  const writes: (typeof source)[] = [],
    errors: unknown[] = []
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: {
      save: async (document) => {
        writes.push(document)
      },
    },
    autosaveMs: 1,
  })
  const gesture = createScenePivotGesture(editor, (error) => errors.push(error))
  const world = indexSceneDocument(source).scene.worldMatrices.get('body')!
  try {
    expect(gesture.begin('body', world)).toBe(true)
    expect(gesture.preview(transformDirection(world, [1, 0, 2]))).toBe(true)
    expect(gesture.preview(transformDirection(world, [2, 0, 3]))).toBe(true)
    const staged = editor.getState().content
    expect(staged.geometries).toBe(source.geometries)
    expect(staged.animations).toBe(source.animations)
    const point = sceneNodePivot(staged.nodes.find((node) => node.id === 'body')!)
    for (const [i, expected] of [2, 0, 3].entries()) expect(point[i]).toBeCloseTo(expected, 10)
    expect(editor.getState().saveSnapshot()).toBe(source)
    await editor.getState().flush()
    for (const saved of writes) expect(saved.nodes).toEqual(source.nodes)
    const before = prepareSceneAnimation(source, 'clip'),
      after = prepareSceneAnimation(staged, 'clip')
    for (const time of [0, 0.13, 0.48, 0.99, 1.123456789123, 1.8, 2])
      expect(after.sample(time, false).worldMatrices).toEqual(
        before.sample(time, false).worldMatrices,
      )
    const fixed = transformPoint(world, point),
      preview = scenePivotRotation(world, point)
    transformPoint(preview, fixed).forEach((n, i) => {
      expect(n).toBeCloseTo(fixed[i]!, 10)
    })
    gesture.end(true)
    expect(editor.getState().canUndo).toBe(true)
    editor.getState().undo()
    expect(editor.getState().content.nodes).toEqual(source.nodes)
    expect(editor.getState().canUndo).toBe(false)
    expect(gesture.begin('body', world)).toBe(true)
    gesture.preview([1, 0, 0])
    gesture.cancel()
    expect(editor.getState().content.nodes).toEqual(source.nodes)
    expect(gesture.begin('body', world)).toBe(true)
    editor
      .getState()
      .commit(renameSceneNode(editor.getState().content, 'wing', 'Alteração externa'))
    const current = editor.getState().content
    expect(gesture.preview([1, 0, 0])).toBe(false)
    gesture.cancel()
    expect(editor.getState().content).toBe(current)
    expect(errors).toEqual([])
  } finally {
    editor.getState().dispose()
  }
})
