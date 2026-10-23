import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { prepareMeshExtrusion } from './meshExtrude'
import { cutMeshWithKnife, type MeshKnifePoint } from './meshKnife'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { readSceneGeometry } from './readGeometry'

function unitFace() {
  const mesh = makeSceneGridGeometry(1)
  for (const point of Object.values(mesh.vertices)) {
    point[0] *= 4
    point[1] *= 4
  }
  return mesh
}

test('knife cuts a face at arbitrary edge positions, sharing new vertices with neighbors and preserving paint', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.faces.f_0_0!.materialId = 'paint'
  // Adjacent faces have separate UV coordinates even at a shared spatial vertex.
  mesh.faces.f_0_1!.corners = mesh.faces.f_0_1!.corners.map((corner) => ({
    ...corner,
    uv: [corner.uv[0] + 2, corner.uv[1] + 3],
  }))
  const before = structuredClone(mesh)
  let serial = 0
  const result = cutMeshWithKnife(
    mesh,
    [
      { kind: 'edge', edgeId: meshEdgeKey('v_0_0', 'v_1_0'), t: 0.25 },
      { kind: 'edge', edgeId: meshEdgeKey('v_0_1', 'v_1_1'), t: 0.25 },
    ],
    () => `knife-${++serial}`,
  )
  expect(Object.keys(result.mesh.faces)).toHaveLength(5)
  expect(Object.keys(result.mesh.vertices)).toHaveLength(11)
  expect(result.faceIds).toHaveLength(2)
  const internal = [...indexMeshEdges(result.mesh).edges.values()].find(
    (edges) => edges.length === 2 && edges.every((edge) => result.faceIds.includes(edge.faceId)),
  )!
  expect(internal).toHaveLength(2)
  for (const id of result.faceIds) {
    expect(result.mesh.faces[id]!.corners).toHaveLength(4)
    expect(result.mesh.faces[id]!.materialId).toBe('paint')
  }
  // A new point on a shared edge appears in the neighboring face, with its own UV seam.
  expect(result.mesh.faces.f_0_1!.corners).toHaveLength(5)
  const seam = result.mesh.faces.f_0_1!.corners.find((corner) => !mesh.vertices[corner.vertexId])!
  const front = result.faceIds
    .flatMap((id) => result.mesh.faces[id]!.corners)
    .find((corner) => corner.vertexId === seam.vertexId)!
  expect(front.uv).toEqual([0.25, 1])
  expect(seam.uv).toEqual([2.25, 3])
  expect(result.mesh.faces.f_1_0).toBe(mesh.faces.f_1_0)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(mesh).toEqual(before)
})

test('knife follows neighboring faces through a shared border and preserves reversed winding', () => {
  const mesh = makeSceneGridGeometry(2)
  for (const face of Object.values(mesh.faces)) face.corners.reverse()
  const result = cutMeshWithKnife(mesh, [
    { kind: 'edge', edgeId: meshEdgeKey('v_0_0', 'v_0_1'), t: 0.5 },
    { kind: 'edge', edgeId: meshEdgeKey('v_1_0', 'v_1_1'), t: 0.5 },
    { kind: 'edge', edgeId: meshEdgeKey('v_2_0', 'v_2_1'), t: 0.5 },
  ])
  expect(Object.keys(result.mesh.faces)).toHaveLength(6)
  expect(result.faceIds).toHaveLength(4)
  const area = (id: string) =>
    result.mesh.faces[id]!.corners.reduce((sum, corner, i, corners) => {
      const a = result.mesh.vertices[corner.vertexId]!,
        b = result.mesh.vertices[corners[(i + 1) % corners.length]!.vertexId]!
      return sum + a[0] * b[1] - a[1] * b[0]
    }, 0)
  for (const id of result.faceIds) expect(area(id)).toBeLessThan(0)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

test('knife partitions a concave face without filling the outside of its boundary', () => {
  const mesh = unitFace()
  mesh.vertices = {
    a: [0, 0, 0],
    b: [1, 0, 0],
    c: [1, 0.4, 0],
    d: [0.4, 0.4, 0],
    e: [0.4, 1, 0],
    f: [0, 1, 0],
  }
  mesh.faces.f_0_0!.corners = Object.entries(mesh.vertices).map(([vertexId, [x, y]]) => ({
    vertexId,
    uv: [x, y],
  }))
  const result = cutMeshWithKnife(mesh, [
    { kind: 'vertex', vertexId: 'a' },
    { kind: 'vertex', vertexId: 'd' },
  ])
  expect(result.faceIds).toHaveLength(2)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(() =>
    cutMeshWithKnife(mesh, [
      { kind: 'vertex', vertexId: 'c' },
      { kind: 'vertex', vertexId: 'e' },
    ]),
  ).toThrow()
})

test('a closed knife path inside a face creates a selectable center that can be extruded independently', () => {
  const mesh = unitFace()
  const points: MeshKnifePoint[] = [
    [0.25, 0.25, 0],
    [0.75, 0.25, 0],
    [0.75, 0.75, 0],
    [0.25, 0.75, 0],
    [0.25, 0.25, 0],
  ].map((point) => ({ kind: 'face', faceId: 'f_0_0', point: [point[0]!, point[1]!, point[2]!] }))
  const result = cutMeshWithKnife(mesh, points)
  const center = Object.entries(result.mesh.faces).find(([, face]) =>
    face.corners.every(({ vertexId }) => {
      const [x, y] = result.mesh.vertices[vertexId]!
      return x > 0 && x < 1 && y > 0 && y < 1
    }),
  )!
  expect(center).toBeDefined()
  expect(center[1].corners).toHaveLength(4)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  const pulled = prepareMeshExtrusion(result.mesh, [center[0]]).apply(0.5)
  expect(Object.keys(pulled.faces)).toHaveLength(Object.keys(result.mesh.faces).length + 4)
  expect(Object.values(pulled.vertices).filter((p) => p[2] === 0.5)).toHaveLength(4)
})

test('knife accepts interior endpoints and a bent boundary-to-boundary path, leaving valid face regions', () => {
  const mesh = unitFace()
  const interior = cutMeshWithKnife(mesh, [
    { kind: 'face', faceId: 'f_0_0', point: [0.25, 0.5, 0] },
    { kind: 'face', faceId: 'f_0_0', point: [0.75, 0.5, 0] },
  ])
  expect(interior.faceIds.length).toBeGreaterThan(1)
  expect(readSceneGeometry(interior.mesh)).toEqual(interior.mesh)
  const bent = cutMeshWithKnife(mesh, [
    { kind: 'vertex', vertexId: 'v_0_0' },
    { kind: 'face', faceId: 'f_0_0', point: [0.25, 0.75, 0] },
    { kind: 'vertex', vertexId: 'v_1_1' },
  ])
  expect(bent.faceIds).toHaveLength(2)
  expect(bent.mesh.faces[bent.faceIds[0]!]!.corners).toHaveLength(4)
  expect(readSceneGeometry(bent.mesh)).toEqual(bent.mesh)
})

test('knife refuses invalid or crossed paths before allocating authorial IDs and never mutates its source', () => {
  const mesh = makeSceneGridGeometry(1)
  const before = structuredClone(mesh)
  let ids = 0
  const next = () => `new-${++ids}`
  expect(() => cutMeshWithKnife(mesh, [], next)).toThrow()
  expect(() =>
    cutMeshWithKnife(
      mesh,
      [
        { kind: 'vertex', vertexId: 'missing' },
        { kind: 'vertex', vertexId: 'v_1_1' },
      ],
      next,
    ),
  ).toThrow()
  expect(() =>
    cutMeshWithKnife(
      mesh,
      [
        { kind: 'face', faceId: 'f_0_0', point: [0.5, 0.5, 1] },
        { kind: 'vertex', vertexId: 'v_1_1' },
      ],
      next,
    ),
  ).toThrow()
  expect(() =>
    cutMeshWithKnife(
      mesh,
      [
        { kind: 'vertex', vertexId: 'v_0_0' },
        { kind: 'vertex', vertexId: 'v_1_1' },
        { kind: 'vertex', vertexId: 'v_1_0' },
        { kind: 'vertex', vertexId: 'v_0_1' },
      ],
      next,
    ),
  ).toThrow()
  expect(ids).toBe(0)
  expect(mesh).toEqual(before)
})

test('knife cuts a face with non-affine corner UVs without requiring manual triangulation', () => {
  const mesh = unitFace()
  mesh.faces.f_0_0!.corners[2]!.uv = [0.8, 0.6]
  const before = structuredClone(mesh)
  const result = cutMeshWithKnife(mesh, [
    { kind: 'edge', edgeId: meshEdgeKey('v_0_0', 'v_1_0'), t: 0.5 },
    { kind: 'face', faceId: 'f_0_0', point: [0.75, 0.75, 0] },
    { kind: 'edge', edgeId: meshEdgeKey('v_0_1', 'v_1_1'), t: 0.5 },
  ])
  expect(result.faceIds).toHaveLength(2)
  const middle = Object.entries(result.mesh.vertices).find(
    ([, p]) => p[0] === 0.75 && p[1] === 0.75,
  )!
  const uv = result.faceIds
    .flatMap((id) => result.mesh.faces[id]!.corners)
    .find((corner) => corner.vertexId === middle[0])!.uv
  expect(uv[0]).toBeCloseTo(0.6)
  expect(uv[1]).toBeCloseTo(0.45)
  for (const corner of mesh.faces.f_0_0!.corners)
    expect(result.faceIds.flatMap((id) => result.mesh.faces[id]!.corners)).toContainEqual(corner)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(mesh).toEqual(before)
})

test('knife accepts a cut across a bent quad using the drawn surface for interior points', () => {
  const mesh = unitFace()
  mesh.vertices.v_1_1![2] = 0.4
  const result = cutMeshWithKnife(mesh, [
    { kind: 'vertex', vertexId: 'v_0_0' },
    { kind: 'face', faceId: 'f_0_0', point: [0.5, 0.5, 0.2] },
    { kind: 'vertex', vertexId: 'v_1_1' },
  ])
  expect(result.faceIds).toHaveLength(2)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(() =>
    cutMeshWithKnife(mesh, [
      { kind: 'face', faceId: 'f_0_0', point: [0.5, 0.5, 1] },
      { kind: 'vertex', vertexId: 'v_1_1' },
    ]),
  ).toThrow('superfície')
})
