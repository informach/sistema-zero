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
