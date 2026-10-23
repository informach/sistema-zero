import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { cutMeshEdgeRings } from './meshRingCuts'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'

test('multiple off-center cuts follow a closed quad strip with shared vertices and valid paint', () => {
  const mesh = primitiveMesh({
    id: 'box',
    kind: 'box',
    from: [0, 0, 0],
    to: [1, 1, 1],
    surfaces: {},
  }).mesh
  const result = cutMeshEdgeRings(mesh, [[...indexMeshEdges(mesh).edges.keys()][0]!], 3, 0.1)
  expect(Object.keys(result.mesh.faces)).toHaveLength(18)
  expect(Object.keys(result.mesh.vertices)).toHaveLength(20)
  expect(result.faceIds).toHaveLength(16)
  for (const edges of indexMeshEdges(result.mesh).edges.values()) expect(edges).toHaveLength(2)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})

test('quad strips reject invalid counts, edge positions and incompatible transitions without mutating source', () => {
  const mesh = makeSceneGridGeometry(2),
    before = structuredClone(mesh),
    ids = [meshEdgeKey('v_1_0', 'v_1_1')]
  for (const count of [0, 17, 1.5]) expect(() => cutMeshEdgeRings(mesh, ids, count)).toThrow()
  expect(() => cutMeshEdgeRings(mesh, ids, 3, 0.3)).toThrow('dentro')
  const result = cutMeshEdgeRings(mesh, ids, 3)
  expect(result.faceIds).toHaveLength(8)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(mesh).toEqual(before)
})

test('loop cuts interpolate each edge UV on trapezoid faces without a triangulation prerequisite', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices.v_1_1![0] = 0.75
  mesh.faces.f_0_0!.corners[2]!.uv = [0.8, 0.6]
  const before = structuredClone(mesh)
  const result = cutMeshEdgeRings(mesh, [meshEdgeKey('v_0_0', 'v_1_0')], 2)
  expect(result.faceIds).toHaveLength(3)
  expect(result.edgeIds).toHaveLength(2)
  expect(Object.values(result.mesh.faces).every((face) => face.corners.length === 4)).toBe(true)
  for (const corner of mesh.faces.f_0_0!.corners)
    expect(Object.values(result.mesh.faces).flatMap((face) => face.corners)).toContainEqual(corner)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
  expect(mesh).toEqual(before)
})

test('loop cuts stop at non-quad neighbors while sharing new border points without cracks', () => {
  const mesh = makeSceneGridGeometry(1)
  mesh.vertices.tip = [0.125, 0.5, 0]
  mesh.faces.cap = {
    corners: [
      { vertexId: 'v_0_1', uv: [0, 0] },
      { vertexId: 'v_1_1', uv: [1, 0] },
      { vertexId: 'tip', uv: [0.5, 1] },
    ],
  }
  const result = cutMeshEdgeRings(mesh, [meshEdgeKey('v_0_0', 'v_1_0')], 2)
  expect(result.faceIds).toHaveLength(3)
  expect(result.mesh.faces.cap!.corners).toHaveLength(5)
  expect(result.mesh.faces.cap!.corners.find((c) => c.vertexId === 'tip')?.uv).toEqual([0.5, 1])
  for (const corner of result.mesh.faces.cap!.corners)
    if (!Object.hasOwn(mesh.vertices, corner.vertexId))
      expect(
        result.faceIds
          .flatMap((id) => result.mesh.faces[id]!.corners)
          .some((c) => c.vertexId === corner.vertexId),
      ).toBe(true)
  expect(readSceneGeometry(result.mesh)).toEqual(result.mesh)
})
