import { expect, test } from 'bun:test'
import { createModelAsset, createPart } from '../core/model'
import { boxMesh } from '../model/mesh'
import { faceLocalPolygon, meshFaceFrame } from '../model/meshFrame'
import { partMatrix, partPivot, transformPoint } from '../model/transform'
import { syncTwins } from '../model/twins'
import { makeModel } from '../testing/fixtures'
import { indexSceneNodes } from './graph'
import { migrateLegacyModel } from './migrateLegacy'

test('migration preserves identity, palette bindings, source pixels and parametric shapes', () => {
  const model = makeModel({ extraColors: ['#abcdef'] })
  const original = structuredClone(model)
  const { document, issues } = migrateLegacyModel(model)
  expect(issues).toEqual([])
  expect(document).toMatchObject({
    id: model.id,
    name: model.name,
    formatVersion: 2,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    paletteId: model.paletteId,
    extraColors: model.extraColors,
  })
  expect(document.nodes.map((node) => node.id)).toEqual(model.parts.map((part) => part.id))
  expect(document.geometries.map((geometry) => geometry.kind)).toEqual(['box', 'wedge'])
  expect(document.images).toHaveLength(2)
  expect(document.images[0]?.layers[0]?.pixels).toEqual(model.parts[0]?.faces.py?.data)
  expect(document.images[0]?.layers[0]?.pixels).not.toBe(model.parts[0]?.faces.py?.data)
  expect(document.materials[0]?.baseColor).toEqual({ kind: 'palette', index: 8 })
  expect(document.materials[1]?.baseColor).toEqual({ kind: 'palette', index: 8 })
  expect(document.extraColors).not.toBe(model.extraColors)
  expect(model).toEqual(original)
  expect(migrateLegacyModel(model)).toEqual({ document, issues })
})

test('pivot becomes the local origin without rounding geometry or world positions', () => {
  const model = createModelAsset({ name: 'preciso', starter: false, now: 1 })
  const part = createPart({ id: 'p', name: 'peça', from: [1, 2, 3], to: [4, 5, 6], color: 3 })
  part.rotation = [12.345, 67.891, 23.456]
  part.origin = [1.123456, 2.345678, 3.456789]
  model.parts.push(part)
  const { document } = migrateLegacyModel(model)
  const geometry = document.geometries[0]
  const node = document.nodes[0]
  if (!geometry || geometry.kind === 'mesh' || geometry.kind === 'path' || !node)
    throw new Error('Expected primitive')
  expect(node.transform).toMatchObject({ kind: 'trs', translation: part.origin })
  const matrix = indexSceneNodes(document.nodes).worldMatrices.get(part.id)
  if (!matrix) throw new Error('Missing matrix')
  for (const [local, old] of [
    [geometry.from, part.from],
    [geometry.to, part.to],
  ] as const) {
    const actual = transformPoint(matrix, local)
    const expected = transformPoint(partMatrix(part), old)
    for (let axis = 0; axis < 3; axis += 1)
      expect(Math.abs((actual[axis] ?? 0) - (expected[axis] ?? 0))).toBeLessThan(1e-12)
  }
})

test('mesh preserves vertex/face IDs, loose edges and per-corner UV seams', () => {
  const model = makeModel()
  const part = model.parts[0]
  if (!part) throw new Error('Missing part')
  part.shape = 'mesh'
  part.mesh = boxMesh(part.from, part.to)
  part.mesh.looseEdges = [['v_000', 'v_111']]
  part.faces = { f_py: part.faces.py }
  const { document } = migrateLegacyModel(model)
  const geometry = document.geometries[0]
  if (geometry?.kind !== 'mesh') throw new Error('Expected mesh')
  expect(Object.keys(geometry.vertices)).toEqual(Object.keys(part.mesh.vertices))
  expect(Object.keys(geometry.faces)).toEqual(Object.keys(part.mesh.faces))
  expect(geometry.looseEdges).toEqual([['v_000', 'v_111']])
  expect(geometry.looseEdges).not.toBe(part.mesh.looseEdges)
  const pivot = partPivot(part)
  for (const [id, value] of Object.entries(geometry.vertices)) {
    const old = part.mesh.vertices[id]
    if (!old) throw new Error('Missing vertex')
    expect(value.map((coordinate, axis) => coordinate + (pivot[axis] ?? 0))).toEqual(old)
  }
  for (const [id, face] of Object.entries(part.mesh.faces)) {
    const frame = meshFaceFrame(part.mesh, id as `f_${string}`)
    if (!frame) throw new Error('Expected UV frame')
    const points = face.v.map((id) => part.mesh!.vertices[id]!)
    expect(geometry.faces[id]?.corners.map((corner) => corner.uv)).toEqual(
      faceLocalPolygon(frame, points).map(([u, v]) => [u === 0 ? 0 : u, v === 0 ? 0 : v]),
    )
    expect(geometry.faces[id]?.corners.map((corner) => corner.vertexId)).toEqual([...face.v])
  }
})

test('live mirror retains identity and source link without duplicating geometry or paint', () => {
  const model = createModelAsset({ name: 'par', starter: false, now: 1 })
  model.mirrorX = true
  model.parts = [
    createPart({ id: 'source', name: 'asa', from: [1, 0, 0], to: [3, 2, 2], color: 2 }),
  ]
  const synced = syncTwins(model)
  const twin = synced.parts.find((part) => part.mirrorOf)
  if (!twin) throw new Error('Missing twin')
  const { document } = migrateLegacyModel(synced)
  expect(document.nodes).toHaveLength(1)
  expect(document.geometries).toHaveLength(1)
  expect(document.mirrors).toEqual([
    { id: twin.id, name: twin.name, sourceId: 'source', axis: 'x', offset: 0 },
  ])
})
