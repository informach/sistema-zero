import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { cutMeshEdgeRing } from './meshRingCut'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'

test('a strip cut shares each midpoint and preserves independent corner paint across seams', () => {
  const mesh = makeSceneGridGeometry(3)
  mesh.faces.f_0_1!.materialId = 'left'
  mesh.faces.f_1_1!.materialId = 'right'
  const before = structuredClone(mesh)
  let id = 0
  const result = cutMeshEdgeRing(mesh, [meshEdgeKey('v_1_1', 'v_1_2')], () => `new_${++id}`)
  expect(Object.keys(result.mesh.vertices)).toHaveLength(20)
  expect(Object.keys(result.mesh.faces)).toHaveLength(12)
  expect(result.edgeIds).toHaveLength(3)
  const topology = indexMeshEdges(result.mesh)
  for (const key of result.edgeIds) expect(topology.edges.get(key)).toHaveLength(2)
  expect(result.mesh.faces.f_0_0).toBe(mesh.faces.f_0_0)
  expect(result.mesh.faces.f_0_2).toBe(mesh.faces.f_0_2)
  const midpoint = Object.keys(result.mesh.vertices).find(
    (key) => !Object.hasOwn(mesh.vertices, key) && result.mesh.vertices[key]![0] === 0.25,
  )!
  expect(result.mesh.vertices[midpoint]).toEqual([0.25, 0.375, 0])
  const paintedCorners = Object.values(result.mesh.faces).flatMap((face) =>
    face.corners.filter((c) => c.vertexId === midpoint).map((c) => [face.materialId, c.uv]),
  )
  expect(paintedCorners).toHaveLength(4)
  expect(paintedCorners.filter(([material]) => material === 'left')).toEqual([
    ['left', [1, 0.5]],
    ['left', [1, 0.5]],
  ])
  expect(paintedCorners.filter(([material]) => material === 'right')).toEqual([
    ['right', [0, 0.5]],
    ['right', [0, 0.5]],
  ])
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(mesh).toEqual(before)
})

test('a closed cube strip terminates, preserves every manifold edge and can be cut again from a new edge', () => {
  const mesh = primitiveMesh({
    id: 'box',
    kind: 'box',
    from: [0, 0, 0],
    to: [1, 1, 1],
    surfaces: {},
  }).mesh
  let id = 0
  const nextId = () => `new_${++id}`
  const first = cutMeshEdgeRing(mesh, [[...indexMeshEdges(mesh).edges.keys()][0]!], nextId)
  expect(Object.keys(first.mesh.vertices)).toHaveLength(12)
  expect(Object.keys(first.mesh.faces)).toHaveLength(10)
  expect(first.edgeIds).toHaveLength(4)
  for (const edges of indexMeshEdges(first.mesh).edges.values()) expect(edges).toHaveLength(2)
  const second = cutMeshEdgeRing(first.mesh, [first.edgeIds[0]!], nextId)
  for (const edges of indexMeshEdges(second.mesh).edges.values()) expect(edges).toHaveLength(2)
  expect(readSceneGeometry(second.mesh)).toEqual(second.mesh)
})

test('the strip stops at a triangle but still inserts its shared boundary point and splits matching construction lines', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices.tip = [-0.25, 0.125, 0]
  mesh.faces.triangle = {
    corners: [
      { vertexId: 'v_0_0', uv: [0, 0] },
      { vertexId: 'v_0_1', uv: [1, 0] },
      { vertexId: 'tip', uv: [0.5, 1] },
    ],
  }
  mesh.looseEdges = [['v_0_0', 'v_0_1']]
  let id = 0
  const result = cutMeshEdgeRing(mesh, [meshEdgeKey('v_0_0', 'v_0_1')], () => `new_${++id}`)
  expect(Object.keys(result.mesh.faces)).toHaveLength(3)
  expect(result.edgeIds).toHaveLength(1)
  expect(result.mesh.faces.triangle!.corners).toHaveLength(4)
  expect(result.mesh.looseEdges).toHaveLength(2)
  const middle = result.mesh.faces.triangle!.corners[1]!
  expect(middle.uv).toEqual([0.5, 0])
  expect(result.mesh.looseEdges[0]![1]).toBe(middle.vertexId)
  expect(indexMeshEdges(result.mesh).edges.get(meshEdgeKey('v_0_0', middle.vertexId))).toHaveLength(
    2,
  )
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

test('strip preflight refuses branching incidence, non-affine neighbors, missing seeds and triangle budget overflow', () => {
  let allocations = 0
  const nextId = () => `new_${++allocations}`
  const mesh = makeSceneGridGeometry(2)
  const seed = [meshEdgeKey('v_1_0', 'v_1_1')]
  for (const ids of [[], ['missing'], [seed[0]!, meshEdgeKey('v_0_0', 'v_1_0')]])
    expect(() => cutMeshEdgeRing(mesh, ids, nextId)).toThrow()
  mesh.faces.branch = mesh.faces.f_0_0!
  expect(() => cutMeshEdgeRing(mesh, seed, nextId)).toThrow('sobrepostas')
  delete mesh.faces.branch
  mesh.faces.f_1_0!.corners[2]!.uv = [0.7, 0.8]
  expect(() => cutMeshEdgeRing(mesh, seed, nextId)).toThrow('pintura')
  expect(() => cutMeshEdgeRing(makeSceneGridGeometry(100), seed, nextId)).toThrow('orçamento')
  expect(allocations).toBe(0)
})
