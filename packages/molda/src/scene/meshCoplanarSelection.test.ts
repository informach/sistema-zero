import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { makeSceneWheelSelection } from '../testing/sceneWheelSelection'
import type { SceneMeshGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { meshCoplanarFaces } from './meshCoplanarSelection'

test('a cylinder cap selects its eight connected triangles, leaving the sides and back untouched', () => {
  const { mesh } = makeSceneWheelSelection()
  const before = JSON.stringify(mesh)
  expect(meshCoplanarFaces(mesh, ['top:3']).sort()).toEqual(
    Array.from({ length: 8 }, (_, i) => `top:${i}`).sort(),
  )
  expect(meshCoplanarFaces(mesh, ['bottom:0'])).toHaveLength(8)
  expect(meshCoplanarFaces(mesh, ['side:0'])).toEqual(['side:0'])
  expect(meshCoplanarFaces(mesh, ['top:0', 'top:1', 'bottom:0'])).toHaveLength(16)
  expect(meshCoplanarFaces(mesh, ['absent'])).toEqual([])
  expect(JSON.stringify(mesh)).toBe(before)
})

test.each([1e-12, 1, 1e12])('coplanar selection is relative to geometry scale %s', (scale) => {
  const { mesh } = makeSceneWheelSelection()
  const scaled: SceneMeshGeometry = {
    ...mesh,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, p]) => [
        id,
        [p[0] * scale, p[1] * scale, p[2] * scale] satisfies Vec3,
      ]),
    ),
  }
  expect(meshCoplanarFaces(scaled, ['top:0'])).toHaveLength(8)
})

test('selection stops at a fold, reversed faces, disconnected faces and non-manifold junctions', () => {
  const mesh: SceneMeshGeometry = {
    id: 'surface',
    kind: 'mesh',
    looseEdges: [],
    vertices: {
      a: [0, 0, 0],
      b: [1, 0, 0],
      c: [1, 1, 0],
      d: [0, 1, 0],
      e: [2, 0, 0],
      f: [2, 1, 0],
    },
    faces: Object.fromEntries(
      (
        [
          ['left', ['a', 'b', 'c', 'd']],
          ['right', ['b', 'e', 'f', 'c']],
        ] as const
      ).map(([id, vertices]) => [
        id,
        { corners: vertices.map((vertexId) => ({ vertexId, uv: [0, 0] as const })) },
      ]),
    ),
  }
  expect(meshCoplanarFaces(mesh, ['left']).sort()).toEqual(['left', 'right'])
  const folded: SceneMeshGeometry = { ...mesh, vertices: { ...mesh.vertices, f: [2, 1, 0.1] } }
  expect(meshCoplanarFaces(folded, ['left'])).toEqual(['left'])
  const reversed = {
    ...mesh,
    faces: { ...mesh.faces, right: { corners: mesh.faces.right!.corners.slice().reverse() } },
  }
  expect(meshCoplanarFaces(reversed, ['left'])).toEqual(['left'])
  const junction = { ...mesh, faces: { ...mesh.faces, extra: mesh.faces.right! } }
  expect(meshCoplanarFaces(junction, ['left'])).toEqual(['left'])
  const detached: SceneMeshGeometry = {
    ...mesh,
    vertices: { ...mesh.vertices, x: [3, 0, 0], y: [4, 0, 0], z: [3, 1, 0] },
    faces: {
      ...mesh.faces,
      extra: { corners: ['x', 'y', 'z'].map((vertexId) => ({ vertexId, uv: [0, 0] })) },
    },
  }
  expect(meshCoplanarFaces(detached, ['left']).sort()).toEqual(['left', 'right'])
})

test('drawing retains separate component face IDs and parametric paint surfaces', () => {
  const { document, mesh } = makeSceneWheelSelection()
  const cylinder = document.geometries.find((g) => g.kind === 'cylinder')!
  const buffers = buildSceneGeometry(cylinder)
  expect(buffers.faceIds).toHaveLength(buffers.componentFaceIds.length)
  for (const [i, id] of buffers.componentFaceIds.entries()) {
    expect(Object.hasOwn(mesh.faces, id)).toBe(true)
    expect(buffers.faceIds[i]).toBe(id.split(':')[0]!)
  }
  const converted = buildSceneGeometry(mesh)
  expect(converted.componentFaceIds).toEqual(converted.faceIds)
  expect(converted.positions).toEqual(buffers.positions)
  expect(converted.uvs).toEqual(buffers.uvs)
})
