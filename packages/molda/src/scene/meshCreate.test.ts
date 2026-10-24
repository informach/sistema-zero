import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneMeshGeometry } from './document'
import { meshComponentEdges } from './meshComponents'
import { prepareMeshCreation } from './meshCreate'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'

function hole() {
  const mesh = primitiveMesh({
    id: 'box',
    kind: 'box',
    from: [-1, -1, -1],
    to: [1, 1, 1],
    surfaces: {},
  }).mesh
  delete mesh.faces.pz
  const border = [...indexMeshEdges(mesh).edges]
    .filter(([, incident]) => incident.length === 1)
    .map(([id]) => id)
  const opposite = border.filter((id) => {
    const [a, b] = meshComponentEdges(mesh).get(id)!
    return mesh.vertices[a]![1] === mesh.vertices[b]![1]
  })
  return { mesh, border, opposite }
}

test('two opposite border edges create the missing quad without needing the other two edges', () => {
  const { mesh, opposite } = hole()
  expect(opposite).toHaveLength(2)
  const before = structuredClone(mesh)
  for (const ids of [opposite, [...opposite].reverse()]) {
    const result = prepareMeshCreation(mesh, { mode: 'edge', ids }).apply()
    expect(result.mode).toBe('face')
    expect(result.ids).toHaveLength(1)
    expect(Object.keys(result.mesh.faces)).toHaveLength(6)
    expect(result.mesh.faces[result.ids[0]!]!.corners).toHaveLength(4)
    expect(result.mesh.vertices).toBe(mesh.vertices)
    for (const incident of indexMeshEdges(result.mesh).edges.values()) {
      expect(incident).toHaveLength(2)
      expect(incident[0]!.a).toBe(incident[1]!.b)
    }
    expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
    for (const [id, face] of Object.entries(mesh.faces)) expect(result.mesh.faces[id]).toBe(face)
  }
  expect(mesh).toEqual(before)
})

test('two border edges can create a bent face without moving their points', () => {
  const { mesh, opposite } = hole()
  const [, far] = meshComponentEdges(mesh).get(opposite[1]!)!
  mesh.vertices[far] = [mesh.vertices[far]![0], mesh.vertices[far]![1], 1.4]
  const before = structuredClone(mesh)
  const result = prepareMeshCreation(mesh, { mode: 'edge', ids: opposite }).apply()
  expect(result.mesh.faces[result.ids[0]!]!.corners).toHaveLength(4)
  expect(result.mesh.vertices).toBe(mesh.vertices)
  expect(mesh).toEqual(before)
})

test('two adjacent edges create a triangle while unordered points create the full face', () => {
  const { mesh, border } = hole()
  // Find an adjacent pair without depending on the primitive vertex naming.
  const seed = meshComponentEdges(mesh).get(border[0]!)!
  const adjacent = border.find(
    (id) =>
      id !== border[0] &&
      meshComponentEdges(mesh)
        .get(id)!
        .some((v) => seed.includes(v)),
  )!
  const triangle = prepareMeshCreation(mesh, { mode: 'edge', ids: [border[0]!, adjacent] }).apply()
  expect(triangle.mesh.faces[triangle.ids[0]!]!.corners).toHaveLength(3)
  const vertices = Object.keys(mesh.vertices).filter((id) => mesh.vertices[id]![2] === 1)
  const face = prepareMeshCreation(mesh, {
    mode: 'vertex',
    ids: [vertices[2]!, vertices[0]!, vertices[3]!, vertices[1]!],
  }).apply()
  expect(face.mesh.faces[face.ids[0]!]!.corners).toHaveLength(4)
  expect(readSceneGeometry(face.mesh)).toEqual(face.mesh)
})

test('two points create a selected construction line and three loose points create a triangle', () => {
  const mesh: SceneMeshGeometry = {
    id: 'points',
    kind: 'mesh',
    vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0] },
    faces: {},
    looseEdges: [],
  }
  const line = prepareMeshCreation(mesh, { mode: 'vertex', ids: ['a', 'b'] }).apply()
  expect(line.mode).toBe('edge')
  expect(line.ids).toEqual([meshEdgeKey('a', 'b')])
  expect(line.mesh.looseEdges).toEqual([['a', 'b']])
  expect(line.mesh.faces).toBe(mesh.faces)
  const triangle = prepareMeshCreation(line.mesh, { mode: 'vertex', ids: ['c', 'a', 'b'] }).apply()
  expect(triangle.mode).toBe('face')
  expect(triangle.mesh.looseEdges).toHaveLength(0)
  expect(triangle.mesh.faces[triangle.ids[0]!]!.corners).toHaveLength(3)
  expect(readSceneGeometry(triangle.mesh)).toEqual(triangle.mesh)
  expect(mesh.looseEdges).toHaveLength(0)
})

test('a concave contour keeps every authorial corner and does not depend on click order', () => {
  const mesh: SceneMeshGeometry = {
    id: 'concave',
    kind: 'mesh',
    vertices: {
      a: [0, 0, 0],
      b: [1, 0, 0],
      c: [2, 0, 0],
      d: [2, 1, 0],
      e: [1, 1, 0],
      f: [1, 2, 0],
      g: [0, 2, 0],
    },
    faces: {},
    looseEdges: [],
  }
  const ids = Object.keys(mesh.vertices)
  mesh.looseEdges = ids.map((id, i) => [id, ids[(i + 1) % ids.length]!])
  const result = prepareMeshCreation(mesh, { mode: 'vertex', ids: [...ids].reverse() }).apply()
  expect(result.mesh.faces[result.ids[0]!]!.corners).toHaveLength(7)
  expect(result.mesh.looseEdges).toHaveLength(0)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

test('two edges use the first line paint automatically and preserve neighboring UVs', () => {
  const { mesh, opposite } = hole()
  mesh.faces.py!.materialId = 'paint-a'
  mesh.faces.ny!.materialId = 'paint-b'
  const before = structuredClone(mesh)
  for (const ids of [opposite, [...opposite].reverse()]) {
    const plan = prepareMeshCreation(mesh, { mode: 'edge', ids })
    expect(plan.materials).toEqual([])
    const firstFaceId = indexMeshEdges(mesh).edges.get(ids[0]!)![0]!.faceId
    const result = plan.apply()
    expect(result.mesh.faces[result.ids[0]!]!.materialId ?? '').toBe(
      mesh.faces[firstFaceId]!.materialId ?? '',
    )
    for (const [id, face] of Object.entries(mesh.faces)) expect(result.mesh.faces[id]).toEqual(face)
  }
  expect(mesh).toEqual(before)
})

test('two lines inside a closed piece keep the paint choice of the faces they touch', () => {
  const mesh = primitiveMesh({
    id: 'box',
    kind: 'box',
    from: [-1, -1, -1],
    to: [1, 1, 1],
    surfaces: {},
  }).mesh
  for (const [id, face] of Object.entries(mesh.faces)) face.materialId = `paint-${id}`
  const edges = meshComponentEdges(mesh)
  const at = (y: number, z: number) =>
    [...edges].find(([, ends]) =>
      ends.every((v) => mesh.vertices[v]![1] === y && mesh.vertices[v]![2] === z),
    )![0]
  // A top-front and a bottom-back line cut the box diagonally; both touch two painted faces.
  const ids = [at(1, 1), at(-1, -1)]
  expect(ids.every((id) => indexMeshEdges(mesh).edges.get(id)!.length === 2)).toBe(true)
  const plan = prepareMeshCreation(mesh, { mode: 'edge', ids })
  expect(plan.materials.length).toBeGreaterThan(1)
})

test('two neighboring edges also create a face without a paint choice', () => {
  const { mesh, border } = hole()
  for (const [id, face] of Object.entries(mesh.faces)) face.materialId = `paint-${id}`
  const first = border[0]!
  const firstVertices = meshComponentEdges(mesh).get(first)!
  const second = border.find(
    (id) =>
      id !== first &&
      meshComponentEdges(mesh)
        .get(id)!
        .some((vertex) => firstVertices.includes(vertex)),
  )!
  const plan = prepareMeshCreation(mesh, { mode: 'edge', ids: [first, second] })
  expect(plan.materials).toEqual([])
  const firstFaceId = indexMeshEdges(mesh).edges.get(first)![0]!.faceId
  const result = plan.apply()
  expect(result.mesh.faces[result.ids[0]!]!.materialId).toBe(`paint-${firstFaceId}`)
})

test('invalid, nonplanar point selections, branched or duplicate creations preserve the original mesh', () => {
  const { mesh, opposite } = hole()
  const before = structuredClone(mesh)
  expect(() => prepareMeshCreation(mesh, { mode: 'vertex', ids: ['gone', 'missing'] })).toThrow()
  expect(() => prepareMeshCreation(mesh, { mode: 'edge', ids: [opposite[0]!] })).toThrow()
  expect(() =>
    prepareMeshCreation(mesh, { mode: 'vertex', ids: Object.keys(mesh.vertices) }).apply(),
  ).toThrow()
  const full = makeSceneGridGeometry(1)
  expect(() =>
    prepareMeshCreation(full, { mode: 'vertex', ids: Object.keys(full.vertices) }).apply(),
  ).toThrow('existe')
  const twisted = structuredClone(mesh)
  const vertex = meshComponentEdges(mesh).get(opposite[0]!)![0]
  twisted.vertices[vertex]![2] += 0.2
  const corners = opposite.flatMap((edgeId) => meshComponentEdges(mesh).get(edgeId)!)
  expect(() => prepareMeshCreation(twisted, { mode: 'vertex', ids: corners }).apply()).toThrow()
  expect(() =>
    prepareMeshCreation(mesh, { mode: 'edge', ids: opposite }).apply(undefined, () => 'py'),
  ).toThrow()
  expect(mesh).toEqual(before)
})
