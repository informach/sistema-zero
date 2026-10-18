import { expect, test } from 'bun:test'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { sceneBounds } from './bounds'
import { addSceneMirror, addScenePrimitive, groupSceneNodes, setSceneNodeFlag } from './commands'
import { createSceneProject } from './createProject'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneInstances } from './evaluate'
import { flipSceneNodes } from './flipNodes'
import {
  affineDeterminant,
  composeTransform,
  quaternionFromEulerXYZ,
  transformPoint,
} from './matrix'
import { scenePieceCoordinates, setScenePieceCoordinates } from './pieceCoordinates'
import { bindSceneSkin } from './skinBinding'
import { deformSceneSkin, prepareSceneSkin } from './skinPose'

test('an in-place X flip keeps the base-center coordinate reference rather than shifting it to a corner', () => {
  const source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Referência' }),
    'wedge',
    'rampa',
  )
  const nodeId = source.nodes[0]!.id
  const before = scenePieceCoordinates(source, nodeId)
  const after = scenePieceCoordinates(flipSceneNodes(source, [nodeId], 'x', true), nodeId)
  expect(after.position).toEqual(before.position)
  after.pivot.forEach((n, i) => {
    expect(n).toBeCloseTo(before.pivot[i]!, 12)
  })
})

function fixture() {
  const base = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Virar' }),
    'wedge',
    'rampa',
  )
  const nodeId = base.nodes[0]!.id
  const document: MoldaSceneDocument = {
    ...base,
    nodes: base.nodes.map((node) => ({
      ...node,
      transform: {
        kind: 'trs',
        translation: [4, 3, 2],
        rotation: quaternionFromEulerXYZ([20, 30, 10]),
        scale: [2, 1, 0.5],
      },
    })),
  }
  return { document, nodeId }
}

test.each([
  'x',
  'y',
  'z',
] as const)('whole-piece flip on %s reflects world positions and keeps every authorial resource', (axis) => {
  const f = fixture()
  const original = structuredClone(f.document)
  const result = flipSceneNodes(f.document, [f.nodeId], axis)
  const old = indexSceneDocument(f.document).scene.worldMatrices.get(f.nodeId)!
  const next = indexSceneDocument(result).scene.worldMatrices.get(f.nodeId)!
  const component = ['x', 'y', 'z'].indexOf(axis)
  for (const point of [
    [0, 0, 0],
    [1, 2, 3],
    [-1, -1, -1],
  ] as const) {
    const before = transformPoint(old, [...point])
    const after = transformPoint(next, [...point])
    for (const a of [0, 1, 2] as const)
      expect(after[a]).toBeCloseTo(before[a] * (a === component ? -1 : 1), 10)
  }
  expect(result.geometries).toBe(f.document.geometries)
  expect(result.materials).toBe(f.document.materials)
  expect(result.images).toBe(f.document.images)
  expect(result.nodes[0]!.pivot).toBe(f.document.nodes[0]!.pivot)
  expect(result.nodes[0]!.id).toBe(f.nodeId)
  const twice = flipSceneNodes(result, [f.nodeId], axis)
  expect(composeTransform(twice.nodes[0]!.transform)).toEqual(
    composeTransform(f.document.nodes[0]!.transform),
  )
  expect(f.document).toEqual(original)
})

test('flipping a group and an explicitly selected child transforms the hierarchy only once', () => {
  const f = fixture()
  const source = groupSceneNodes(f.document, [f.nodeId], { name: 'roda' })
  const group = source.nodes.find((n) => n.kind === 'group')!
  const next = flipSceneNodes(source, [group.id, f.nodeId], 'x')
  expect(next.nodes.find((n) => n.id === f.nodeId)).toBe(
    source.nodes.find((n) => n.id === f.nodeId),
  )
  const before = transformPoint(
    indexSceneDocument(source).scene.worldMatrices.get(f.nodeId)!,
    [0, 0, 0],
  )
  const after = transformPoint(
    indexSceneDocument(next).scene.worldMatrices.get(f.nodeId)!,
    [0, 0, 0],
  )
  expect(after).toEqual([-before[0], before[1], before[2]])
  expect(() =>
    flipSceneNodes(setSceneNodeFlag(source, [f.nodeId], 'locked', true), [group.id], 'x'),
  ).toThrow('Destrave')
})

test('generated mirror planes follow their selected source during a flip', () => {
  const f = fixture()
  const source = addSceneMirror(f.document, f.nodeId, { axis: 'x', offset: 2 })
  const next = flipSceneNodes(source, [f.nodeId], 'x')
  expect(next.mirrors[0]!.offset).toBe(-2)
  const before = evaluateSceneInstances(indexSceneDocument(source))
  const after = evaluateSceneInstances(indexSceneDocument(next))
  for (const instance of before) {
    const old = transformPoint(instance.worldMatrix, [1, 0, 0])
    const moved = transformPoint(
      after.find((item) => item.id === instance.id)!.worldMatrix,
      [1, 0, 0],
    )
    expect(moved).toEqual([-old[0], old[1], old[2]])
  }
})

test.each([
  'x',
  'y',
  'z',
] as const)('flipping in place on %s preserves the selection center and its bounds', (axis) => {
  const f = fixture()
  const before = sceneBounds(indexSceneDocument(f.document))!
  const result = flipSceneNodes(f.document, [f.nodeId], axis, true)
  const after = sceneBounds(indexSceneDocument(result))!
  for (const a of [0, 1, 2] as const) {
    expect(after.min[a]).toBeCloseTo(before.min[a], 10)
    expect(after.max[a]).toBeCloseTo(before.max[a], 10)
  }
  const twice = flipSceneNodes(result, [f.nodeId], axis, true)
  composeTransform(twice.nodes[0]!.transform).forEach((n, i) => {
    expect(n).toBeCloseTo(composeTransform(f.document.nodes[0]!.transform)[i]!, 10)
  })
})

test('a selected child under a rotated and sheared parent flips in world axes while shared geometry users stay untouched', () => {
  const f = fixture()
  const node = f.document.nodes[0]!
  const source: MoldaSceneDocument = {
    ...f.document,
    nodes: [
      {
        id: 'parent',
        name: 'Grupo',
        kind: 'group',
        parentId: null,
        hidden: false,
        locked: false,
        transform: { kind: 'affine', matrix: [1, 0.2, 0, 0, 0.4, 2, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1] },
      },
      { ...node, parentId: 'parent' },
      { ...node, id: 'other', parentId: null },
    ],
  }
  const next = flipSceneNodes(source, [f.nodeId], 'y')
  expect(next.nodes[0]).toBe(source.nodes[0])
  expect(next.nodes[2]).toBe(source.nodes[2])
  expect(next.geometries).toBe(source.geometries)
  const before = transformPoint(
    indexSceneDocument(source).scene.worldMatrices.get(f.nodeId)!,
    [1, 2, 3],
  )
  const after = transformPoint(
    indexSceneDocument(next).scene.worldMatrices.get(f.nodeId)!,
    [1, 2, 3],
  )
  for (const a of [0, 1, 2] as const)
    expect(after[a]).toBeCloseTo(before[a] * (a === 1 ? -1 : 1), 10)
  expect(flipSceneNodes(source, [], 'x')).toBe(source)
})

test('a rig flips with its complete binding and refuses partial mesh or joint selections', () => {
  const f = makeSceneSkinFixture()
  const binding = bindSceneSkin(f.document, f.input)
  const source = { ...f.document, skins: [binding] }
  const prepared = prepareSceneSkin(source, binding)
  const beforeIndex = indexSceneDocument(source)
  const before = deformSceneSkin(prepared, beforeIndex.scene.worldMatrices)
  const result = flipSceneNodes(source, ['rig'], 'x')
  const afterIndex = indexSceneDocument(result)
  const after = deformSceneSkin(prepared, afterIndex.scene.worldMatrices)
  for (let i = 0; i < before.length; i += 3) {
    const old = transformPoint(beforeIndex.scene.worldMatrices.get(binding.nodeId)!, [
      before[i]!,
      before[i + 1]!,
      before[i + 2]!,
    ])
    const moved = transformPoint(afterIndex.scene.worldMatrices.get(binding.nodeId)!, [
      after[i]!,
      after[i + 1]!,
      after[i + 2]!,
    ])
    expect(moved[0]).toBeCloseTo(-old[0], 10)
    expect(moved[1]).toBeCloseTo(old[1], 10)
    expect(moved[2]).toBeCloseTo(old[2], 10)
  }
  expect(result.skins).toBe(source.skins)
  expect(() => flipSceneNodes(source, [binding.nodeId], 'x')).toThrow('ossos')
  expect(() => flipSceneNodes(source, ['upper'], 'x')).toThrow('ossos')
})

test.each([
  'x',
  'y',
  'z',
] as const)('coordinates remain editable after flipping %s and resizing preserves the reflection', (axis) => {
  const f = fixture()
  const flipped = flipSceneNodes(f.document, [f.nodeId], axis)
  const before = scenePieceCoordinates(flipped, f.nodeId)
  before.dimensions.forEach((n, i) => {
    expect(n).toBeCloseTo([4, 2, 1][i]!, 10)
  })
  expect(before.trs.scale.some((n) => n < 0)).toBe(true)
  const moved = setScenePieceCoordinates(flipped, f.nodeId, 'position', [
    before.position[0] + 1,
    before.position[1],
    before.position[2],
  ])
  const p0 = transformPoint(
    indexSceneDocument(flipped).scene.worldMatrices.get(f.nodeId)!,
    [0, 0, 0],
  )
  const p1 = transformPoint(indexSceneDocument(moved).scene.worldMatrices.get(f.nodeId)!, [0, 0, 0])
  expect(p1[0]).toBeCloseTo(p0[0] + 1, 10)
  expect(p1[1]).toBeCloseTo(p0[1], 10)
  expect(p1[2]).toBeCloseTo(p0[2], 10)
  const resized = setScenePieceCoordinates(flipped, f.nodeId, 'dimensions', [8, 4, 2])
  scenePieceCoordinates(resized, f.nodeId).dimensions.forEach((n, i) => {
    expect(n).toBeCloseTo([8, 4, 2][i]!, 10)
  })
  expect(affineDeterminant(composeTransform(resized.nodes[0]!.transform))).toBeLessThan(0)
  const pivot = transformPoint(composeTransform(flipped.nodes[0]!.transform), before.localPivot)
  const after = transformPoint(composeTransform(resized.nodes[0]!.transform), before.localPivot)
  after.forEach((n, i) => {
    expect(n).toBeCloseTo(pivot[i]!, 10)
  })
})
