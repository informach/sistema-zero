import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneMeshGeometry } from './document'
import { extrudeMeshComponents } from './meshComponentExtrude'
import { meshComponentEdges } from './meshComponents'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { readSceneGeometry } from './readGeometry'

test('extruding connected border edges shares new points and preserves paint, winding and original faces', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.faces.f_0_0!.materialId = 'paint'
  mesh.faces.f_1_0!.materialId = 'paint'
  const before = structuredClone(mesh)
  const edges = [meshEdgeKey('v_0_0', 'v_1_0'), meshEdgeKey('v_1_0', 'v_2_0')]
  const result = extrudeMeshComponents(
    mesh,
    { mode: 'edge', ids: [...edges, edges[0]!] },
    [0, 0, 1],
  )
  expect(Object.keys(result.mesh.vertices)).toHaveLength(12)
  expect(Object.keys(result.mesh.faces)).toHaveLength(6)
  expect(result.ids).toHaveLength(2)
  for (const edge of edges) {
    const incident = indexMeshEdges(result.mesh).edges.get(edge)!
    expect(incident).toHaveLength(2)
    expect(incident[0]!.a).toBe(incident[1]!.b)
    expect(incident[0]!.b).toBe(incident[1]!.a)
  }
  for (const [id, face] of Object.entries(mesh.faces)) expect(result.mesh.faces[id]).toBe(face)
  for (const [id, face] of Object.entries(result.mesh.faces))
    if (!Object.hasOwn(mesh.faces, id)) expect(face.materialId).toBe('paint')
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  const again = extrudeMeshComponents(result.mesh, { mode: 'edge', ids: result.ids }, [0, 0, 1])
  expect(Object.keys(again.mesh.vertices)).toHaveLength(15)
  expect(Object.keys(again.mesh.faces)).toHaveLength(8)
  expect(mesh).toEqual(before)
})

test('point extrusion creates linked points that can be extruded again into a connected path', () => {
  const mesh = makeSceneGridGeometry(1)
  const result = extrudeMeshComponents(mesh, { mode: 'vertex', ids: ['v_0_0', 'v_1_0'] }, [0, 0, 1])
  expect(result.mesh.faces).toBe(mesh.faces)
  expect(result.mesh.looseEdges).toEqual([
    ['v_0_0', result.ids[0]!],
    ['v_1_0', result.ids[1]!],
  ])
  expect(result.ids.map((id) => result.mesh.vertices[id])).toEqual([
    [0, 0, 1],
    [0.25, 0, 1],
  ])
  const again = extrudeMeshComponents(
    result.mesh,
    { mode: 'vertex', ids: [result.ids[0]!] },
    [0, 1, 0],
  )
  expect(again.mesh.looseEdges).toHaveLength(3)
  expect(again.mesh.looseEdges[2]).toEqual([result.ids[0]!, again.ids[0]!])
  expect(readSceneGeometry(again.mesh)).toEqual(again.mesh)
  expect(mesh.looseEdges).toEqual([])
})

test('a construction line becomes a face border, with its new edge selected', () => {
  const mesh: SceneMeshGeometry = {
    id: 'loose',
    kind: 'mesh',
    vertices: { a: [0, 0, 0], b: [1, 0, 0] },
    faces: {},
    looseEdges: [['a', 'b']],
  }
  const result = extrudeMeshComponents(
    mesh,
    { mode: 'edge', ids: [meshEdgeKey('a', 'b')] },
    [0, 1, 0],
  )
  expect(Object.keys(result.mesh.faces)).toHaveLength(1)
  expect(result.mesh.looseEdges).toEqual([])
  expect(meshComponentEdges(result.mesh).has(result.ids[0]!)).toBe(true)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

test('invalid or parallel extrusions reject without changing the source; zero offset is a no-op', () => {
  const mesh = makeSceneGridGeometry(1)
  const before = structuredClone(mesh)
  const edge = { mode: 'edge' as const, ids: [meshEdgeKey('v_0_0', 'v_1_0')] }
  expect(extrudeMeshComponents(mesh, edge, [0, 0, 0]).mesh).toBe(mesh)
  expect(() => extrudeMeshComponents(mesh, edge, [1, 0, 0])).toThrow('direção')
  expect(() => extrudeMeshComponents(mesh, edge, [0, 0, Infinity])).toThrow()
  expect(() => extrudeMeshComponents(mesh, { mode: 'vertex', ids: ['gone'] }, [0, 1, 0])).toThrow()
  expect(() => extrudeMeshComponents(mesh, { mode: 'edge', ids: ['gone'] }, [0, 1, 0])).toThrow()
  expect(() => extrudeMeshComponents(mesh, edge, [0, 0, 1], () => 'v_0_0')).toThrow()
  expect(mesh).toEqual(before)
})
