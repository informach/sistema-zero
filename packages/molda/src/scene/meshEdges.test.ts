import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { SCENE_LIMITS } from './limits'
import { splitMeshEdges } from './meshEdges'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { readSceneGeometry } from './readGeometry'

test('edge splitting preserves shared boundaries, independent lines, old coordinates and corner UV seams', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.faces.f_0_0!.materialId = 'paint'
  mesh.looseEdges = [
    ['v_1_0', 'v_1_1'],
    ['v_1_2', 'v_2_2'],
  ]
  const original = structuredClone(mesh)
  const edge = meshEdgeKey('v_1_0', 'v_1_1')
  const result = splitMeshEdges(mesh, [edge, edge], () => 'mid')
  expect(Object.keys(result.mesh.vertices)).toHaveLength(10)
  expect(Object.keys(result.mesh.faces)).toHaveLength(4)
  expect(result.edgeIds).toEqual([meshEdgeKey('v_1_0', 'mid'), meshEdgeKey('mid', 'v_1_1')])
  expect(result.mesh.vertices.mid).toEqual([0.25, 0.125, 0])
  expect(result.mesh.faces.f_0_0!.corners.find((c) => c.vertexId === 'mid')!.uv).toEqual([1, 0.5])
  expect(result.mesh.faces.f_1_0!.corners.find((c) => c.vertexId === 'mid')!.uv).toEqual([0, 0.5])
  expect(result.mesh.faces.f_0_0!.materialId).toBe('paint')
  expect(result.mesh.faces.f_1_1).toBe(mesh.faces.f_1_1)
  for (const [id, point] of Object.entries(mesh.vertices))
    expect(result.mesh.vertices[id]).toBe(point)
  expect(result.mesh.looseEdges).toEqual([
    ['v_1_0', 'mid'],
    ['mid', 'v_1_1'],
    ['v_1_2', 'v_2_2'],
  ])
  const index = indexMeshEdges(result.mesh)
  expect(index.edges.has(edge)).toBe(false)
  for (const id of result.edgeIds) expect(index.edges.get(id)).toHaveLength(2)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(mesh).toEqual(original)
})

test('independent lines retain Double precision, can be divided repeatedly, and empty selection is a no-op', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.faces = {}
  mesh.vertices = {
    a: [1.123456789123, 0, 0],
    b: [2.123456789123, 0, 0],
    ['__proto__']: [3.123456789123, 0, 0],
  }
  mesh.looseEdges = [
    ['a', 'b'],
    ['b', '__proto__'],
  ]
  let next = 0
  const allocate = () => `new_${++next}`
  expect(splitMeshEdges(mesh, []).mesh).toBe(mesh)
  const first = splitMeshEdges(
    mesh,
    [meshEdgeKey('a', 'b'), meshEdgeKey('b', '__proto__')],
    allocate,
  )
  expect(first.mesh.vertices.new_1).toEqual([1.6234567891229998, 0, 0])
  expect(first.mesh.vertices.new_1![0]).not.toBe(Math.fround(first.mesh.vertices.new_1![0]))
  const second = splitMeshEdges(first.mesh, first.edgeIds, allocate)
  expect(second.mesh.looseEdges).toHaveLength(8)
  expect(second.mesh.vertices.a).toBe(mesh.vertices.a)
  expect(readSceneGeometry(second.mesh)).toEqual(second.mesh)
})

test('split preflight rejects non-affine paint, unknown edges, collapsed midpoints and budgets before allocating identities', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.faces.f_1_0!.corners[2]!.uv = [0.7, 0.2]
  let allocations = 0
  const allocate = () => `new_${++allocations}`
  expect(() => splitMeshEdges(mesh, [meshEdgeKey('v_1_0', 'v_1_1')], allocate)).toThrow('pintura')
  expect(allocations).toBe(0)
  expect(() => splitMeshEdges(mesh, [meshEdgeKey('v_0_0', 'v_1_1')], allocate)).toThrow(
    'não existe',
  )
  mesh.vertices.a = [1, 0, 0]
  mesh.vertices.b = [1 + Number.EPSILON, 0, 0]
  mesh.looseEdges = [['a', 'b']]
  expect(() => splitMeshEdges(mesh, [meshEdgeKey('a', 'b')], allocate)).toThrow('curta demais')
  const huge = makeSceneGridGeometry(100)
  expect(() => splitMeshEdges(huge, [meshEdgeKey('v_0_0', 'v_1_0')], allocate)).toThrow('orçamento')
  const full = makeSceneGridGeometry(1)
  full.vertices = Object.fromEntries(
    Array.from({ length: SCENE_LIMITS.vertices }, (_, i) => [String(i), [i, 0, 0]]),
  )
  full.faces = {}
  full.looseEdges = [['0', '1']]
  expect(() => splitMeshEdges(full, [meshEdgeKey('0', '1')], allocate)).toThrow(
    'orçamento de pontos',
  )
  expect(allocations).toBe(0)
})

test('splitting refuses an adjacent face at the 64-corner limit without consuming IDs', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = Object.fromEntries(
    Array.from({ length: 64 }, (_, i) => [
      String(i),
      [Math.cos((i / 64) * Math.PI * 2), Math.sin((i / 64) * Math.PI * 2), 0],
    ]),
  )
  mesh.faces = {
    circle: {
      corners: Object.keys(mesh.vertices).map((vertexId) => ({
        vertexId,
        uv: [mesh.vertices[vertexId]![0], mesh.vertices[vertexId]![1]],
      })),
    },
  }
  let allocations = 0
  expect(() => splitMeshEdges(mesh, [meshEdgeKey('0', '1')], () => `new_${++allocations}`)).toThrow(
    'pontos demais',
  )
  expect(allocations).toBe(0)
  expect(mesh.faces.circle!.corners).toHaveLength(64)
})
