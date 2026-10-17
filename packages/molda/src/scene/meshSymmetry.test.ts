import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { identityMatrix } from './matrix'
import { mirrorMeshFaces } from './meshComponentOperations'
import { prepareMeshExtrusion } from './meshExtrude'
import { subdivideMeshFaces } from './meshSubdivide'
import { meshSymmetrySource, symmetrySourceIds, synchronizeMeshSymmetry } from './meshSymmetry'
import { indexMeshEdges } from './meshTopology'
import { transformMeshVertices } from './meshVertices'
import { readSceneGeometry } from './readGeometry'

test('persistent symmetry survives reading and regenerates extrusion with stable identities', () => {
  const base = makeSceneGridGeometry(1),
    first = mirrorMeshFaces(base, ['f_0_0'], {
      axis: 0,
      center: 0,
      copy: true,
      continuous: true,
    }).mesh
  expect(readSceneGeometry(first)).toEqual(first)
  const source = meshSymmetrySource(first)
  expect(source.faces).toEqual(base.faces)
  const result = synchronizeMeshSymmetry(first, prepareMeshExtrusion(source, ['f_0_0']).apply(0.1))
  expect(Object.keys(result.faces)).toHaveLength(8)
  expect(result.symmetry!.faces.f_0_0).toBe(first.symmetry!.faces.f_0_0)
  expect(symmetrySourceIds(result, 'face', [result.symmetry!.faces.f_0_0!])).toEqual(['f_0_0'])
  expect(readSceneGeometry(result)).toEqual(result)
  const divided = synchronizeMeshSymmetry(
    result,
    subdivideMeshFaces(meshSymmetrySource(result), ['f_0_0'], 1),
  )
  expect(Object.keys(divided.symmetry!.faces)).toHaveLength(7)
  expect(readSceneGeometry(divided)).toEqual(divided)
  for (const incidents of indexMeshEdges(divided).edges.values())
    expect(incidents.length).toBeLessThanOrEqual(2)
  const invalid = structuredClone(result)
  invalid.symmetry!.center = 1
  expect(() => readSceneGeometry(invalid)).toThrow('espelho')
})

test('moving a welded source point off the fixed plane creates its counterpart without overwriting the source', () => {
  const base = makeSceneGridGeometry(1),
    full = mirrorMeshFaces(base, ['f_0_0'], {
      axis: 0,
      center: 0,
      copy: true,
      continuous: true,
    }).mesh
  const source = meshSymmetrySource(full),
    delta = identityMatrix()
  delta[12] = 0.1
  const result = synchronizeMeshSymmetry(
    full,
    transformMeshVertices(source, Object.keys(source.vertices), delta),
  )
  expect(result.vertices.v_0_0).toEqual([0.1, 0, 0])
  expect(result.symmetry!.vertices.v_0_0).not.toBe('v_0_0')
  expect(result.vertices[result.symmetry!.vertices.v_0_0!]).toEqual([-0.1, 0, 0])
  expect(readSceneGeometry(result)).toEqual(result)
})
