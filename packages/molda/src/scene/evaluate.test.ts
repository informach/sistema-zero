import { expect, test } from 'bun:test'
import { createModelAsset, createPart, type Vec3 } from '../core/model'
import { partCorners } from '../model/transform'
import { syncTwins } from '../model/twins'
import type { SceneGeometry } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneInstances } from './evaluate'
import { transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'

function corners(geometry: SceneGeometry): Vec3[] {
  if (geometry.kind === 'mesh') return Object.values(geometry.vertices)
  if (geometry.kind === 'path') return geometry.points.map((p) => p.position)
  const result: Vec3[] = []
  for (const x of [geometry.from[0], geometry.to[0]]) {
    for (const y of [geometry.from[1], geometry.to[1]]) {
      for (const z of [geometry.from[2], geometry.to[2]]) result.push([x, y, z])
    }
  }
  return result
}

const sortedPoints = (points: Vec3[]): string[] =>
  points
    .map((point) => point.map((value) => (Math.abs(value) < 1e-8 ? 0 : value).toFixed(8)).join(','))
    .sort()

test('migrated primitives and their live mirrors preserve the exact legacy world bounds', () => {
  const model = createModelAsset({ name: 'espelhos', starter: false })
  model.mirrorX = true
  model.parts = (['box', 'wedge', 'cylinder', 'sphere'] as const).map((shape, i) => {
    const part = createPart({
      id: `p${i}`,
      name: shape,
      shape,
      from: [1, i * 2, -1],
      to: [3, i * 2 + 2, 1],
      color: 2,
      rotation: [15, 30, 45],
    })
    part.origin = [1, i * 2, 0]
    return part
  })
  const legacy = syncTwins(model)
  const { document } = migrateLegacyModel(legacy)
  const index = indexSceneDocument(document)
  const instances = evaluateSceneInstances(index)
  expect(instances).toHaveLength(legacy.parts.length)
  for (const part of legacy.parts) {
    const instance = instances.find((item) => item.id === part.id)
    if (!instance) throw new Error('Missing instance')
    const geometry = index.geometries.get(instance.geometryId)
    if (!geometry) throw new Error('Missing geometry')
    expect(
      sortedPoints(corners(geometry).map((point) => transformPoint(instance.worldMatrix, point))),
    ).toEqual(sortedPoints(partCorners(part)))
    expect(instance.orientation).toBe(part.mirrorOf ? -1 : 1)
    expect(instance.sourceNodeId).toBe(part.mirrorOf ?? part.id)
  }
  expect(document.geometries).toHaveLength(4)
})

test('group flags are inherited and reflection changes orientation without copying resources', () => {
  const model = createModelAsset({ name: 'grupo', starter: false })
  model.parts = [
    createPart({ id: 'source', name: 'peça', from: [1, 0, 0], to: [3, 2, 2], color: 2 }),
  ]
  model.mirrorX = true
  const { document } = migrateLegacyModel(syncTwins(model))
  document.nodes.push({
    id: 'group',
    name: 'Grupo',
    kind: 'group',
    parentId: null,
    hidden: true,
    locked: true,
    transform: { kind: 'trs', translation: [3, 0, 0], rotation: [0, 0, 0, 1], scale: [-2, 1, 1] },
  })
  const source = document.nodes[0]
  if (!source) throw new Error('Missing source')
  source.parentId = 'group'
  const instances = evaluateSceneInstances(indexSceneDocument(document))
  expect(instances.map((item) => item.hidden)).toEqual([true, true])
  expect(instances.map((item) => item.locked)).toEqual([true, true])
  expect(instances.map((item) => item.orientation)).toEqual([-1, 1])
  expect(instances[0]?.geometryId).toBe(instances[1]?.geometryId)
  expect(instances[0]?.materialId).toBe(instances[1]?.materialId)
  expect(document.geometries).toHaveLength(1)
})
