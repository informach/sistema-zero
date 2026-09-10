import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneMeshGeometry } from './document'
import { subdivideMeshFaces } from './meshSubdivide'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { readSceneGeometry } from './readGeometry'

const allocator = () => {
  let next = 0
  return () => `new_${++next}`
}

test('subdivision preserves affine painting and shares split boundaries with neighbors and loose edges', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.faces.f_0_0!.materialId = 'paint'
  mesh.looseEdges = [
    ['v_1_0', 'v_1_1'],
    ['v_1_2', 'v_2_2'],
  ]
  const original = structuredClone(mesh)
  const result = subdivideMeshFaces(mesh, ['f_0_0'], 1, allocator())
  expect(Object.keys(result.vertices)).toHaveLength(14)
  expect(Object.keys(result.faces)).toHaveLength(7)
  expect(result.faces.f_1_1).toBe(mesh.faces.f_1_1)
  expect(result.faces.f_1_0!.corners).toHaveLength(5)
  expect(result.faces.f_0_1!.corners).toHaveLength(5)
  for (const [id, point] of Object.entries(mesh.vertices)) expect(result.vertices[id]).toBe(point)
  const midpoint = Object.keys(result.vertices).find((id) => {
    const [x, y, z] = result.vertices[id]!
    return x === 0.25 && y === 0.125 && z === 0
  })!
  expect(result.looseEdges).toEqual([
    ['v_1_0', midpoint],
    [midpoint, 'v_1_1'],
    ['v_1_2', 'v_2_2'],
  ])
  const edges = indexMeshEdges(result).edges
  expect(edges.has(meshEdgeKey('v_1_0', 'v_1_1'))).toBe(false)
  expect(edges.get(meshEdgeKey('v_1_0', midpoint))).toHaveLength(2)
  expect(edges.get(meshEdgeKey(midpoint, 'v_1_1'))).toHaveLength(2)
  for (const [id, face] of Object.entries(result.faces)) {
    const child = id === 'f_0_0' || !Object.hasOwn(mesh.faces, id)
    if (child) expect(face.materialId).toBe('paint')
    const x = child ? 0 : Number(id.split('_')[1])
    const y = child ? 0 : Number(id.split('_')[2])
    for (const corner of face.corners) {
      const point = result.vertices[corner.vertexId]!
      expect(corner.uv).toEqual([point[0] * 4 - x, point[1] * 4 - y])
    }
  }
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(original)
})

test('levels are absolute, repeat stable IDs, expand selected children and preserve the outer shape', () => {
  const mesh = makeSceneGridGeometry(1)
  expect(subdivideMeshFaces(mesh, ['f_0_0'], 0)).toBe(mesh)
  expect(subdivideMeshFaces(mesh, [], 3)).toBe(mesh)
  for (const level of [1, 2, 3]) {
    const first = subdivideMeshFaces(mesh, ['f_0_0'], level, allocator())
    const second = subdivideMeshFaces(mesh, ['f_0_0'], level, allocator())
    expect(Object.keys(first.faces)).toHaveLength(4 ** level)
    expect(first).toEqual(second)
    expect(readSceneGeometry(first)).toEqual(first)
    for (const [x, y, z] of Object.values(first.vertices)) {
      expect(x >= 0 && x <= 0.25 && y >= 0 && y <= 0.25 && z === 0).toBe(true)
    }
  }
})

test('a previously connected neighbor with straight boundary corners can be subdivided later', () => {
  const next = allocator()
  const first = subdivideMeshFaces(makeSceneGridGeometry(2), ['f_0_0'], 1, next)
  const second = subdivideMeshFaces(first, ['f_1_0'], 2, next)
  expect(readSceneGeometry(second)).toEqual(second)
  expect(Object.keys(second.faces).length).toBeGreaterThan(Object.keys(first.faces).length)
})

test('preflight refuses non-affine selected or adjacent paint, concavity, non-planarity and result overflow atomically', () => {
  for (const id of ['f_0_0', 'f_1_0']) {
    const mesh = makeSceneGridGeometry(2)
    mesh.faces[id]!.corners[2]!.uv = [0.7, 0.2]
    const original = structuredClone(mesh)
    expect(() => {
      subdivideMeshFaces(mesh, ['f_0_0'], 1)
    }).toThrow('pintura')
    expect(mesh).toEqual(original)
  }
  const concave = makeSceneGridGeometry(1)
  concave.vertices.v_1_1 = [0.05, 0.05, 0]
  expect(() => {
    subdivideMeshFaces(concave, ['f_0_0'], 1)
  }).toThrow('curva para dentro')
  const nonplanar = makeSceneGridGeometry(1)
  nonplanar.vertices.v_1_1 = [0.25, 0.25, 0.1]
  expect(() => {
    subdivideMeshFaces(nonplanar, ['f_0_0'], 1)
  }).toThrow('planas')
  const huge = makeSceneGridGeometry(80)
  let allocations = 0
  expect(() => {
    subdivideMeshFaces(huge, Object.keys(huge.faces), 1, () => `id_${++allocations}`)
  }).toThrow('orçamento')
  expect(allocations).toBe(0)
  for (const levels of [-1, 0.5, 4, Infinity])
    expect(() => {
      subdivideMeshFaces(concave, [], levels)
    }).toThrow()
})

test('a neighboring 64-corner face is not silently overflowed or disconnected', () => {
  const mesh: SceneMeshGeometry = {
    id: 'mesh',
    kind: 'mesh',
    vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0] },
    faces: {},
    looseEdges: [],
  }
  const bottom = Array.from({ length: 62 }, (_, i) => {
    const id = `bottom_${i}`
    mesh.vertices[id] = [i / 61, -1, 0]
    return id
  })
  const face = (ids: string[]) => ({
    corners: ids.map((vertexId) => ({
      vertexId,
      uv: [mesh.vertices[vertexId]![0], mesh.vertices[vertexId]![1]] as [number, number],
    })),
  })
  mesh.faces.top = face(['a', 'b', 'c', 'd'])
  mesh.faces.bottom = face(['b', 'a', ...bottom])
  expect(readSceneGeometry(mesh)).toEqual(mesh)
  expect(() => {
    subdivideMeshFaces(mesh, ['top'], 1)
  }).toThrow('vizinha teria pontos demais')
  expect(mesh.faces.bottom.corners).toHaveLength(64)
})
