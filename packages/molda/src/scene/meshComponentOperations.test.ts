import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { duplicateMeshFaces, fillMeshHole, mirrorMeshFaces } from './meshComponentOperations'
import { meshComponentEdges } from './meshComponents'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'

test('face duplication preserves connections and paint while creating a disconnected translated copy', () => {
  const mesh = makeSceneGridGeometry(2),
    before = structuredClone(mesh)
  mesh.faces.f_0_0!.materialId = 'paint'
  const result = duplicateMeshFaces(mesh, ['f_0_0', 'f_1_0'], [0, 0, 1])
  expect(result.faceIds).toHaveLength(2)
  expect(Object.keys(result.mesh.vertices)).toHaveLength(15)
  expect(Object.keys(result.mesh.faces)).toHaveLength(6)
  for (const id of result.faceIds)
    for (const corner of result.mesh.faces[id]!.corners)
      expect(result.mesh.vertices[corner.vertexId]![2]).toBe(1)
  expect(result.mesh.faces[result.faceIds[0]!]!.materialId).toBe('paint')
  expect(mesh.vertices).toEqual(before.vertices)
  expect(() => duplicateMeshFaces(mesh, ['f_0_0'], [0, 0, 0])).toThrow('Mova')
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

test('duplication refuses exact overlap with another face and offsets below coordinate precision', () => {
  const mesh = makeSceneGridGeometry(2)
  expect(() => duplicateMeshFaces(mesh, ['f_0_0'], [0.25, 0, 0])).toThrow('face')
  const distant = structuredClone(mesh)
  for (const p of Object.values(distant.vertices)) p[0] += 1e12
  expect(() => duplicateMeshFaces(distant, ['f_0_0'], [1e-12, 0, 0])).toThrow('Mova')
})

test('hole orientation is independent of which construction edge was selected first', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0], e: [2, 0, 0] }
  mesh.faces = {
    neighbor: { corners: ['b', 'c', 'e'].map((vertexId) => ({ vertexId, uv: [0, 0] })) },
  }
  mesh.looseEdges = [
    ['a', 'b'],
    ['c', 'd'],
    ['d', 'a'],
  ]
  const edges = [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'a'],
  ].map(([a, b]) => meshEdgeKey(a!, b!))
  for (let start = 0; start < edges.length; start++) {
    const result = fillMeshHole(mesh, [...edges.slice(start), ...edges.slice(0, start)])
    const incident = indexMeshEdges(result.mesh).edges.get(meshEdgeKey('b', 'c'))!
    expect(incident).toHaveLength(2)
    expect(incident[0]!.a).toBe(incident[1]!.b)
    expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  }
})

test('reflection preserves UV corners, reverses winding and shares only corresponding plane vertices', () => {
  const mesh = makeSceneGridGeometry(1)
  const result = mirrorMeshFaces(mesh, ['f_0_0'], {
    axis: 0,
    center: 0,
    copy: true,
    continuous: false,
  })
  expect(result.faceIds).toHaveLength(1)
  expect(Object.keys(result.mesh.vertices)).toHaveLength(6)
  const face = result.mesh.faces[result.faceIds[0]!]!
  expect(face.corners.map((c) => c.uv)).toEqual(
    [...mesh.faces.f_0_0!.corners].reverse().map((c) => c.uv),
  )
  for (const corner of face.corners)
    expect(result.mesh.vertices[corner.vertexId]![0]).toBeLessThanOrEqual(0)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

test('hole filling rejects an existing surface and closes construction edges without leaving loose duplicates', () => {
  const mesh = makeSceneGridGeometry(1)
  const edges = [...indexMeshEdges(mesh).edges.keys()]
  // An open sheet has a border but filling it would overlap its existing face.
  expect(() => fillMeshHole(mesh, edges)).toThrow()
  const empty = {
    ...mesh,
    faces: {},
    looseEdges: [
      ['v_0_0', 'v_1_0'],
      ['v_1_0', 'v_1_1'],
      ['v_1_1', 'v_0_1'],
      ['v_0_1', 'v_0_0'],
    ] as Array<[string, string]>,
  }
  const filled = fillMeshHole(empty, edges)
  expect(filled.faceIds).toHaveLength(1)
  expect(filled.mesh.looseEdges).toHaveLength(0)
  expect(readSceneGeometry(filled.mesh)).toEqual(filled.mesh)
  expect(() => fillMeshHole(empty, edges.slice(1))).toThrow('fechado')
})

test('a concave hole has valid planar UVs; twisted, branched and multiple boundaries are refused', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices = {
    a: [0, 0, 0],
    b: [1, 0, 0],
    c: [1, 0.4, 0],
    d: [0.4, 0.4, 0],
    e: [0.4, 1, 0],
    f: [0, 1, 0],
  }
  mesh.faces = {}
  const points = Object.keys(mesh.vertices)
  mesh.looseEdges = points.map((id, i) => [id, points[(i + 1) % points.length]!])
  const ids = [...meshComponentEdges(mesh).keys()],
    before = structuredClone(mesh),
    filled = fillMeshHole(mesh, ids)
  expect(filled.mesh.faces[filled.faceIds[0]!]!.corners).toHaveLength(6)
  expect(readSceneGeometry(filled.mesh)).toEqual(filled.mesh)
  expect(mesh).toEqual(before)
  const twisted = structuredClone(mesh)
  twisted.vertices.d![2] = 0.1
  expect(() => fillMeshHole(twisted, ids)).toThrow('plana')
  const branched = { ...mesh, looseEdges: [...mesh.looseEdges, ['a', 'd'] as [string, string]] }
  expect(() => fillMeshHole(branched, [...meshComponentEdges(branched).keys()])).toThrow(
    'ramificações',
  )
  const separate = {
    ...mesh,
    vertices: {
      ...mesh.vertices,
      x: [2, 0, 0] as [number, number, number],
      y: [3, 0, 0] as [number, number, number],
      z: [2, 1, 0] as [number, number, number],
    },
    looseEdges: [...mesh.looseEdges, ['x', 'y'], ['y', 'z'], ['z', 'x']] as Array<[string, string]>,
  }
  expect(() => fillMeshHole(separate, [...meshComponentEdges(separate).keys()])).toThrow('único')
})

test('hole filling requires an explicit neighboring material when the border has different paint', () => {
  const mesh = primitiveMesh({
    id: 'box',
    kind: 'box',
    from: [-1, -1, -1],
    to: [1, 1, 1],
    surfaces: {},
  }).mesh
  const front = Object.keys(mesh.faces).find((id) =>
    mesh.faces[id]!.corners.every((c) => mesh.vertices[c.vertexId]![2] === 1),
  )!
  delete mesh.faces[front]
  Object.values(mesh.faces)[0]!.materialId = 'paint-a'
  const ids = [...indexMeshEdges(mesh).edges]
    .filter(([, edges]) => edges.length === 1)
    .map(([id]) => id)
  expect(() => fillMeshHole(mesh, ids)).toThrow('pintura')
  const result = fillMeshHole(mesh, ids, 'paint-a')
  expect(result.mesh.faces[result.faceIds[0]!]!.materialId).toBe('paint-a')
  for (const [id, face] of Object.entries(mesh.faces)) expect(result.mesh.faces[id]).toBe(face)
})

test.each([
  0, 1, 2,
] as const)('reflection across local axis %s preserves corner paint while flipping the chosen surface', (axis) => {
  const mesh = makeSceneGridGeometry(1),
    center = axis === 2 ? 1 : 0,
    before = structuredClone(mesh)
  const result = mirrorMeshFaces(mesh, ['f_0_0'], { axis, center, copy: false, continuous: false })
  expect(Object.keys(result.mesh.faces)).toHaveLength(1)
  expect(Object.keys(result.mesh.vertices)).toHaveLength(4)
  for (const [id, point] of Object.entries(result.mesh.vertices))
    expect(point[axis]).toBe(center + (center - mesh.vertices[id]![axis]))
  expect(result.mesh.faces.f_0_0!.corners.map((c) => c.uv)).toEqual(
    [...mesh.faces.f_0_0!.corners].reverse().map((c) => c.uv),
  )
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(mesh).toEqual(before)
})
