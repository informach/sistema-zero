import { expect, test } from 'bun:test'
import { sceneBounds } from './bounds'
import { addScenePrimitive, groupSceneNodes, transformSceneNodes } from './commands'
import { createSceneProject } from './createProject'
import { indexSceneDocument } from './documentIndex'
import { flipSceneNodes } from './flipNodes'
import { composeTransform, quaternionFromEulerXYZ, transformPoint } from './matrix'
import { sceneMeasurementStepDelta } from './measurementTransform'
import { scenePieceCoordinates, setScenePieceCoordinates } from './pieceCoordinates'
import { sceneNodePivot, setSceneAuthoringPivot } from './pivot'

test('click steps add units or tenths to actual size, preserve a rotated custom pivot, and keep other axes exact', () => {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Medidas' }),
    'box',
    'corpo',
  )
  const id = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, id, 'dimensions', [2.25, 3.45, 2])
  source = setScenePieceCoordinates(source, id, 'rotation', [0, 30, 0])
  source = setSceneAuthoringPivot(source, id, [0.4, 0.6, 0.8])
  const before = indexSceneDocument(source)
  const pivot = transformPoint(
    before.scene.worldMatrices.get(id)!,
    sceneNodePivot(source.nodes[0]!),
  )
  const changed = transformSceneNodes(
    source,
    [id],
    sceneMeasurementStepDelta(source, [id], 'scale', [1, 0, 0], 1),
  )
  expect(scenePieceCoordinates(changed, id).dimensions[0]).toBeCloseTo(3, 12)
  expect(scenePieceCoordinates(changed, id).dimensions[1]).toBeCloseTo(3.45, 12)
  const afterPivot = transformPoint(
    indexSceneDocument(changed).scene.worldMatrices.get(id)!,
    sceneNodePivot(changed.nodes[0]!),
  )
  afterPivot.forEach((value, axis) => {
    expect(value).toBeCloseTo(pivot[axis]!, 12)
  })
  const tenth = transformSceneNodes(
    changed,
    [id],
    sceneMeasurementStepDelta(changed, [id], 'scale', [0.1, 0, 0], 0.1),
  )
  expect(scenePieceCoordinates(tenth, id).dimensions[0]).toBeCloseTo(3.1, 12)
})

test('position click steps snap the edited coordinate in its parent frame and multi-selection moves once', () => {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Medidas' }),
    'box',
    'corpo',
  )
  const id = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, id, 'position', [0.25, 0.35, 0.45])
  source = groupSceneNodes(source, [id], { nextId: () => 'group' })
  source = transformSceneNodes(
    source,
    ['group'],
    composeTransform({
      kind: 'trs',
      translation: [3, 0, 0],
      rotation: quaternionFromEulerXYZ([0, 30, 0]),
      scale: [2, 1, 1],
    }),
  )
  const original = scenePieceCoordinates(source, id).position
  const changed = transformSceneNodes(
    source,
    [id],
    sceneMeasurementStepDelta(source, [id], 'move', [1, 0, 0], 1),
  )
  const value = scenePieceCoordinates(changed, id).position
  expect(value[0]).toBeCloseTo(1, 12)
  expect(value[1]).toBeCloseTo(original[1], 12)
  expect(value[2]).toBeCloseTo(original[2], 12)
  const before = sceneBounds(indexSceneDocument(source))!
  const delta = sceneMeasurementStepDelta(source, ['group', id], 'scale', [0, -100, 0], 0.1)
  const smaller = transformSceneNodes(source, ['group', id], delta)
  const after = sceneBounds(indexSceneDocument(smaller))!
  expect(after.max[1] - after.min[1]).toBeCloseTo(0.1, 12)
  expect(after.max[0] - after.min[0]).toBeCloseTo(before.max[0] - before.min[0], 12)
})

test('position steps after a flip snap the same bottom reference shown in the piece fields', () => {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Virada' }),
    'box',
    'peça',
  )
  const id = source.nodes[0]!.id
  source = setScenePieceCoordinates(source, id, 'dimensions', [2.25, 2, 2])
  source = setSceneAuthoringPivot(source, id, [0.4, 0.3, 0.1])
  source = flipSceneNodes(source, [id], 'x')
  const before = scenePieceCoordinates(source, id).position
  const changed = transformSceneNodes(
    source,
    [id],
    sceneMeasurementStepDelta(source, [id], 'move', [1, 0, 0], 1),
  )
  const after = scenePieceCoordinates(changed, id).position
  expect(after[0]).toBeCloseTo(Math.round(before[0] + 1), 12)
  expect(after[1]).toBe(before[1])
  expect(after[2]).toBe(before[2])
})
