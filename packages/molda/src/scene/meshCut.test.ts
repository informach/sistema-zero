import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { convertSceneNodesToMesh, editSceneMesh } from './commands'
import type { SceneMeshGeometry } from './document'
import { sceneToJson } from './documentJson'
import { SCENE_LIMITS } from './limits'
import { createMeshLooseEdge, cutMeshFaceBetweenVertices } from './meshCut'
import { dissolveMeshEdges } from './meshMerge'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'
import { readSceneGeometry } from './readGeometry'

test('a face cut creates one internal edge and preserves material, corners, points and neighboring incidence', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.faces.f_0_0!.materialId = 'paint'
  const before = structuredClone(mesh)
  const result = cutMeshFaceBetweenVertices(mesh, ['v_0_0', 'v_1_1'], () => 'child')
  expect(Object.keys(result.faces)).toHaveLength(5)
  expect(result.faces.f_0_0!.corners).toEqual(mesh.faces.f_0_0!.corners.slice(0, 3))
  expect(result.faces.child!.corners.map((c) => c.vertexId)).toEqual(['v_1_1', 'v_0_1', 'v_0_0'])
  for (const face of [result.faces.f_0_0!, result.faces.child!]) {
    expect(face.materialId).toBe('paint')
    for (const corner of face.corners) expect(mesh.faces.f_0_0!.corners.includes(corner)).toBe(true)
  }
  const edges = indexMeshEdges(result).edges
  const diagonal = meshEdgeKey('v_0_0', 'v_1_1')
  expect(edges.get(diagonal)).toHaveLength(2)
  for (const [id, incident] of indexMeshEdges(mesh).edges)
    expect(edges.get(id)).toHaveLength(incident.length)
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(result.faces.f_1_0).toBe(mesh.faces.f_1_0)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(Object.keys(dissolveMeshEdges(result, [diagonal]).faces)).toHaveLength(4)
  expect(mesh).toEqual(before)
})

function concave(): SceneMeshGeometry {
  const points: [number, number, number][] = [
    [0, 0, 0],
    [2, 0, 0],
    [2, 1, 0],
    [1, 1, 0],
    [1, 2, 0],
    [0, 2, 0],
  ]
  return {
    id: 'concave',
    kind: 'mesh',
    looseEdges: [],
    vertices: Object.fromEntries(points.map((p, i) => [String(i), p])),
    faces: {
      ['__proto__']: {
        corners: points.map(([x, y], i) => ({ vertexId: String(i), uv: [x / 2, y / 2] })),
      },
    },
  }
}

test('concave cuts stay inside the surface and keep the source ID with its original first corner', () => {
  const mesh = concave()
  let allocated = 0
  const nextId = () => `child${++allocated}`
  expect(() => cutMeshFaceBetweenVertices(mesh, ['2', '4'], nextId)).toThrow('fora da face')
  expect(() => cutMeshFaceBetweenVertices(mesh, ['2', '5'], nextId)).toThrow()
  expect(allocated).toBe(0)
  const result = cutMeshFaceBetweenVertices(mesh, ['1', '3'], nextId)
  expect(Object.hasOwn(result.faces, '__proto__')).toBe(true)
  expect(result.faces.__proto__!.corners.some((c) => c.vertexId === '0')).toBe(true)
  expect(readSceneGeometry(result)).toEqual(result)
  const halves = cutMeshFaceBetweenVertices(mesh, ['0', '3'], nextId)
  expect(Object.values(halves.faces).map((f) => f.corners.length)).toEqual([4, 4])
  expect(readSceneGeometry(halves)).toEqual(halves)
})

test('cut preflight refuses ambiguous surfaces, old edges, non-affine paint and invalid choices before allocating IDs', () => {
  const mesh = makeSceneGridGeometry(1)
  let allocations = 0
  const nextId = () => `new_${++allocations}`
  for (const ids of [[], ['v_0_0'], ['v_0_0', 'v_1_0'], ['v_0_0', 'missing']])
    expect(() => cutMeshFaceBetweenVertices(mesh, ids, nextId)).toThrow()
  mesh.faces.other = mesh.faces.f_0_0!
  expect(() => cutMeshFaceBetweenVertices(mesh, ['v_0_0', 'v_1_1'], nextId)).toThrow(
    'mais de uma face',
  )
  delete mesh.faces.other
  mesh.faces.f_0_0!.corners[2]!.uv = [0.8, 0.9]
  expect(() => cutMeshFaceBetweenVertices(mesh, ['v_0_0', 'v_1_1'], nextId)).toThrow('pintura')
  expect(allocations).toBe(0)
  const full = makeSceneGridGeometry(100)
  expect(readSceneGeometry(cutMeshFaceBetweenVertices(full, ['v_0_0', 'v_1_1'], nextId)).kind).toBe(
    'mesh',
  )
})

test('construction lines preserve surfaces and exact coordinates, reject duplicates and honor their budget', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = { ...mesh.vertices, ['__proto__']: [0.123456789123, 2, 3] }
  const result = createMeshLooseEdge(mesh, ['v_0_0', '__proto__'])
  expect(result.faces).toBe(mesh.faces)
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toEqual([['v_0_0', '__proto__']])
  expect(readSceneGeometry(result)).toEqual(result)
  expect(() => createMeshLooseEdge(result, ['__proto__', 'v_0_0'])).toThrow('já têm uma linha')
  expect(() => createMeshLooseEdge(mesh, ['v_0_0', 'v_1_0'])).toThrow('já têm uma linha')
  mesh.vertices.coincident = mesh.vertices.v_0_0!
  expect(() => createMeshLooseEdge(mesh, ['v_0_0', 'coincident'])).toThrow('mesmo lugar')
  mesh.looseEdges = Array.from({ length: SCENE_LIMITS.looseEdges }, (_, i) => ['v_0_0', String(i)])
  expect(() => createMeshLooseEdge(mesh, ['v_0_0', '__proto__'])).toThrow('orçamento')
})

test('cuts isolate shared geometry through the real mesh command without modifying images or materials', () => {
  const source = convertSceneNodesToMesh(migrateLegacyModel(makeModel()).document, ['body'])
  const node = source.nodes.find((n) => n.id === 'body')!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  source.nodes.push({ ...node, id: 'shared' })
  const mesh = source.geometries.find((g) => g.id === node.geometryId)!
  if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
  const corners = Object.values(mesh.faces)[0]!.corners
  const result = editSceneMesh(
    source,
    'body',
    (mesh) =>
      cutMeshFaceBetweenVertices(mesh, [corners[0]!.vertexId, corners[2]!.vertexId], () => 'child'),
    () => 'private',
  )
  expect(result.geometries.find((g) => g.id === node.geometryId)).toBe(mesh)
  expect(result.nodes.find((n) => n.id === 'shared')).toBe(
    source.nodes.find((n) => n.id === 'shared'),
  )
  expect(result.images).toBe(source.images)
  expect(result.materials).toBe(source.materials)
  expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
})
