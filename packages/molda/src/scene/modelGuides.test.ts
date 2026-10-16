import { expect, test } from 'bun:test'
import { adjustScene } from '../components/editor/scene/sceneAdjustment'
import { makeModel } from '../testing/fixtures'
import { createSceneAnimation, setSceneAnimationKey } from './animationCommands'
import { sceneBounds } from './bounds'
import {
  addScenePrimitive,
  convertSceneNodesToMesh,
  groupSceneNodes,
  setSceneNodeFlag,
} from './commands'
import { indexSceneDocument } from './documentIndex'
import { transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import {
  divideSceneByWorldPlane,
  moveScenePivotToWorld,
  sceneDivisionPlane,
  scenePivotTargets,
} from './modelGuides'
import { sceneNodePivot } from './pivot'
import { readSceneDocument } from './readDocument'

const box = () =>
  addScenePrimitive(migrateLegacyModel({ ...makeModel(), parts: [] }).document, 'box', 'Caixa')
test('pivot choices use real rotated corners; applying preserves all world bounds', () => {
  let source = box(),
    id = source.nodes[0]!.id
  source = adjustScene(source, [id], 'rotate', [0, 35, 0])
  const targets = scenePivotTargets(source, id)
  expect(targets.corners.length).toBeGreaterThan(3)
  for (const point of targets.corners) {
    const next = moveScenePivotToWorld(source, id, point),
      before = sceneBounds(indexSceneDocument(source))!,
      after = sceneBounds(indexSceneDocument(next))!
    for (const axis of [0, 1, 2] as const) {
      expect(after.min[axis]).toBeCloseTo(before.min[axis], 10)
      expect(after.max[axis]).toBeCloseTo(before.max[axis], 10)
      expect(
        transformPoint(
          indexSceneDocument(next).scene.worldMatrices.get(id)!,
          sceneNodePivot(next.nodes[0]!),
        )[axis],
      ).toBeCloseTo(point[axis], 10)
    }
  }
})
test('authoring pivot preserves animation and refuses locked pieces', () => {
  const source = box(),
    id = source.nodes[0]!.id
  const clip = createSceneAnimation(source, 'Pulo')
  const animated = setSceneAnimationKey(clip, clip.animations![0]!.id, {
    nodeId: id,
    channel: 'translation',
    key: { time: 0, value: [0, 0, 0], interpolation: 'linear' },
  })
  expect(
    moveScenePivotToWorld(animated, id, scenePivotTargets(animated, id).bottom).animations,
  ).toBe(animated.animations)
  expect(() =>
    moveScenePivotToWorld(setSceneNodeFlag(source, [id], 'locked', true), id, [0, 0, 0]),
  ).toThrow()
  expect(source.animations).toBeUndefined()
})
test('two orthographic points divide a transformed mesh without deleting either side', () => {
  let source = box(),
    id = source.nodes[0]!.id
  source = convertSceneNodesToMesh(source, [id])
  source = adjustScene(source, [id], 'rotate', [0, 30, 0])
  source = adjustScene(source, [id], 'move', [4, 2, -3])
  const { center } = scenePivotTargets(source, id)
  const plane = sceneDivisionPlane(
    [center[0], center[1] - 2, center[2]],
    [center[0], center[1] + 2, center[2]],
    [0, 0, 1],
  )
  const before = structuredClone(source),
    next = divideSceneByWorldPlane(source, id, plane)
  expect(next).not.toBe(source)
  expect(source).toEqual(before)
  expect(next.nodes).toEqual(source.nodes)
  expect(readSceneDocument(next).status).toBe('valid')
  const a = sceneBounds(indexSceneDocument(source))!,
    b = sceneBounds(indexSceneDocument(next))!
  for (const axis of [0, 1, 2] as const) {
    expect(b.min[axis]).toBeCloseTo(a.min[axis])
    expect(b.max[axis]).toBeCloseTo(a.max[axis])
  }
  expect(() => sceneDivisionPlane(center, center, [0, 0, 1])).toThrow()
})
test('keep base scales a group around its pivot and restores only base height', () => {
  let source = box(),
    id = source.nodes[0]!.id
  source = groupSceneNodes(source, [id], { name: 'Conjunto' })
  id = source.nodes.find((node) => node.kind === 'group')!.id
  source = adjustScene(source, [id], 'move', [0, 5, 0])
  const before = sceneBounds(indexSceneDocument(source))!
  const next = adjustScene(source, [id], 'scale', [1.2, 1.2, 1.2], true)
  const after = sceneBounds(indexSceneDocument(next))!
  expect(after.min[1]).toBeCloseTo(before.min[1])
  expect(after.max[1] - after.min[1]).toBeCloseTo((before.max[1] - before.min[1]) * 1.2)
})
