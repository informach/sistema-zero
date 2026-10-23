import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { createSceneAnimation, setSceneAnimationKey } from './animationCommands'
import {
  addScenePrimitive,
  convertSceneNodesToMesh,
  editSceneMesh,
  groupSceneNodes,
  setSceneNodeFlag,
  transformSceneNodes,
} from './commands'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { composeTransform, quaternionFromEulerXYZ, transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import { scenePieceCoordinates, setScenePieceCoordinates } from './pieceCoordinates'
import {
  sceneLocalBounds,
  sceneNodePivot,
  setSceneAuthoringPivot,
  setScenePivotAxisFromFace,
  setScenePivotPreset,
} from './pivot'
import { readSceneDocument } from './readDocument'
import { prepareSceneAnimation } from './sampleAnimation'

const box = () =>
  addScenePrimitive(migrateLegacyModel(makeModel({ parts: [] })).document, 'box', 'Corpo')
const close = (a: readonly number[], b: readonly number[]) =>
  a.forEach((n, i) => {
    expect(n).toBeCloseTo(b[i]!, 10)
  })

test('authoring pivot preserves every old animation sample, descendants and shared resources', () => {
  let source = box()
  const piece = source.nodes[0]!.id
  source = groupSceneNodes(source, [piece], { name: 'Conjunto' })
  const group = source.nodes.find((node) => node.kind === 'group')!.id
  source = createSceneAnimation(source, 'Girar')
  const clip = source.animations![0]!.id
  for (const [time, angle] of [
    [0, 0],
    [1, 130],
    [2, -30],
  ]) {
    source = setSceneAnimationKey(source, clip, {
      nodeId: group,
      channel: 'rotation',
      key: { time: time!, value: quaternionFromEulerXYZ([angle!, 20, 0]), interpolation: 'smooth' },
    })
  }
  const before = structuredClone(source)
  const next = setSceneAuthoringPivot(source, group, [3, -1, 4])
  expect(next.animations).toBe(source.animations)
  expect(next.geometries).toBe(source.geometries)
  expect(next.images).toBe(source.images)
  const oldSampler = prepareSceneAnimation(source, clip)
  const newSampler = prepareSceneAnimation(next, clip)
  for (let t = 0; t <= 2; t += 0.03125) {
    const oldPose = oldSampler.sample(t, false)
    const newPose = newSampler.sample(t, false)
    for (const id of [piece, group]) {
      for (const point of [
        [-1, -1, -1],
        [1, 1, 1],
        [0.3, 0.2, -0.7],
      ] as [number, number, number][]) {
        close(
          transformPoint(oldPose.worldMatrices.get(id)!, point),
          transformPoint(newPose.worldMatrices.get(id)!, point),
        )
      }
    }
  }
  expect(source).toEqual(before)
  const read = readSceneDocument(sceneToJson(next))
  expect(read.status).toBe('valid')
  if (read.status === 'valid')
    expect(read.document.nodes.find((node) => node.id === group)!.pivot).toEqual([3, -1, 4])
})

test('base, dimensions and local corner remain honest under a transformed parent', () => {
  let source = box()
  const id = source.nodes[0]!.id
  expect(scenePieceCoordinates(source, id).position).toEqual([0, 0, 0])
  source = setScenePieceCoordinates(source, id, 'dimensions', [6, 2, 8])
  source = setScenePivotPreset(source, id, 'corner')
  close(scenePieceCoordinates(source, id).pivot, [3, 0, 4])
  source = groupSceneNodes(source, [id], { name: 'Pai' })
  const parent = source.nodes.find((node) => node.kind === 'group')!.id
  source = transformSceneNodes(
    source,
    [parent],
    composeTransform({
      kind: 'trs',
      translation: [7, 3, -4],
      rotation: quaternionFromEulerXYZ([50, 20, 10]),
      scale: [2, 2, 2],
    }),
  )
  close(scenePieceCoordinates(source, id).dimensions, [6, 2, 8])
  const index = indexSceneDocument(source)
  const fixed = transformPoint(
    index.scene.worldMatrices.get(id)!,
    sceneNodePivot(index.scene.nodes.get(id)!),
  )
  source = setScenePieceCoordinates(source, id, 'rotation', [20, 40, 10])
  source = setScenePieceCoordinates(source, id, 'dimensions', [9, 4, 10])
  const after = indexSceneDocument(source)
  close(
    transformPoint(after.scene.worldMatrices.get(id)!, sceneNodePivot(after.scene.nodes.get(id)!)),
    fixed,
  )
  close(scenePieceCoordinates(source, id).dimensions, [9, 4, 10])
  const next = setScenePivotPreset(source, id, 'bottom')
  close(scenePieceCoordinates(next, id).pivot, [0, 0, 0])
  expect(next.nodes[0]!.transform).toEqual(source.nodes[0]!.transform)
  expect(sceneLocalBounds(next, id)!.base).toEqual([0, -1, 0])
  expect(readSceneDocument(sceneToJson(next)).status).toBe('valid')
})

test('legacy origins, locks, invalid pivot data and shear are preserved or rejected explicitly', () => {
  const source = migrateLegacyModel(makeModel()).document
  const id = source.nodes[0]!.id
  expect(sceneNodePivot(source.nodes[0]!)).toEqual([0, 0, 0])
  expect(() =>
    setSceneAuthoringPivot(setSceneNodeFlag(source, [id], 'locked', true), id, [1, 0, 0]),
  ).toThrow('Destrave')
  const invalid = structuredClone(source)
  invalid.nodes[0]!.pivot = [Infinity, 0, 0]
  expect(readSceneDocument(invalid).status).toBe('invalid')
  invalid.nodes[0]!.pivot = [0, 0, 0]
  invalid.nodes[0]!.pivotAxis = [0, 2, 0]
  expect(readSceneDocument(invalid).status).toBe('invalid')
  const shear = composeTransform(source.nodes[0]!.transform)
  shear[4] += 0.3
  const sheared = {
    ...source,
    nodes: source.nodes.map((node) =>
      node.id === id ? { ...node, transform: { kind: 'affine' as const, matrix: shear } } : node,
    ),
  }
  expect(() => scenePieceCoordinates(sheared, id)).toThrow()
  expect(setSceneAuthoringPivot(sheared, id, [1, 2, 3]).nodes[0]!.transform).toEqual(
    sheared.nodes[0]!.transform,
  )
})

test('aligning the pivot axis to a tilted face saves its direction without changing geometry or old animation', () => {
  let source = box()
  const id = source.nodes[0]!.id
  source = convertSceneNodesToMesh(source, [id])
  source = editSceneMesh(source, id, (mesh) => {
    const vertices = { ...mesh.vertices }
    for (const { vertexId } of mesh.faces.py!.corners) {
      const [x, y, z] = mesh.vertices[vertexId]!
      vertices[vertexId] = [x, y + x, z]
    }
    return { ...mesh, vertices }
  })
  source = createSceneAnimation(source, 'Girar')
  const before = prepareSceneAnimation(source, source.animations![0]!.id).sample(0, false)
  const next = setScenePivotAxisFromFace(source, id, 'py')
  expect(next.nodes[0]!.pivotAxis?.[0]).toBeCloseTo(-Math.SQRT1_2)
  expect(next.nodes[0]!.pivotAxis?.[1]).toBeCloseTo(Math.SQRT1_2)
  expect(next.geometries).toBe(source.geometries)
  expect(next.animations).toBe(source.animations)
  expect(
    prepareSceneAnimation(next, next.animations![0]!.id).sample(0, false).worldMatrices,
  ).toEqual(before.worldMatrices)
  const read = readSceneDocument(sceneToJson(next))
  expect(read.status).toBe('valid')
  if (read.status === 'valid')
    expect(read.document.nodes[0]!.pivotAxis).toEqual(next.nodes[0]!.pivotAxis)
})
