import { expect, test } from 'bun:test'
import type { SceneMeshGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { editMeshFaces } from './meshFaces'
import { prepareMeshWeld } from './meshWeld'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'

function box() {
  return primitiveMesh({ id: 'box', kind: 'box', from: [0, 0, 0], to: [1, 1, 1], surfaces: {} })
    .mesh
}

test('stitching detached corners preserves rendered positions, corner paint seams and material identities', () => {
  const original = box()
  const faceId = Object.keys(original.faces)[0]!
  original.faces[faceId]!.materialId = 'paint'
  let id = 0
  const mesh = editMeshFaces(original, [faceId], 'detach', () => `copy_${++id}`)
  const before = structuredClone(mesh)
  const plan = prepareMeshWeld(mesh, Object.keys(mesh.vertices))
  expect([plan.points, plan.groups, plan.faces, plan.looseEdges, plan.blockedReason]).toEqual([
    4,
    4,
    1,
    0,
    null,
  ])
  const result = plan.apply()
  expect(Object.keys(result.vertices)).toHaveLength(8)
  expect(buildSceneGeometry(result)).toEqual(buildSceneGeometry(mesh))
  for (const [key, face] of Object.entries(mesh.faces)) {
    if (key !== faceId) expect(result.faces[key]).toBe(face)
    else
      face.corners.forEach((corner, i) => {
        expect(result.faces[key]!.corners[i]!.uv).toBe(corner.uv)
      })
  }
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(before)
})

test('weld is exact, selection-local and preserves the first chosen identity including special keys', () => {
  const mesh: SceneMeshGeometry = {
    id: 'points',
    kind: 'mesh',
    faces: {},
    looseEdges: [],
    vertices: {
      a: [0.123456789123, 2, 3],
      near: [0.123456789123 + Number.EPSILON, 2, 3],
      ['__proto__']: [0.123456789123, 2, 3],
      unselected: [0.123456789123, 2, 3],
    },
  }
  const before = structuredClone(mesh)
  const plan = prepareMeshWeld(mesh, ['__proto__', 'a', 'near', 'a'])
  expect(plan.ids).toEqual(['__proto__', 'near'])
  expect(plan.points).toBe(1)
  const result = plan.apply()
  expect(Object.keys(result.vertices)).toEqual(['near', '__proto__', 'unselected'])
  expect(result.vertices.__proto__).toBe(mesh.vertices.__proto__)
  expect(result.vertices.near).toBe(mesh.vertices.near)
  expect(result.vertices.unselected).toBe(mesh.vertices.unselected)
  expect(prepareMeshWeld(mesh, ['a', 'near']).apply()).toBe(mesh)
  expect(prepareMeshWeld(mesh, []).apply()).toBe(mesh)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(before)
})

test('only remapped construction lines can combine or collapse; unrelated duplicates remain untouched', () => {
  const mesh: SceneMeshGeometry = {
    id: 'lines',
    kind: 'mesh',
    faces: {},
    vertices: { a: [0, 0, 0], copy: [0, 0, 0], b: [1, 0, 0], copyb: [1, 0, 0], c: [2, 0, 0] },
    looseEdges: [
      ['a', 'b'],
      ['copy', 'b'],
      ['a', 'copy'],
      ['copy', 'copyb'],
      ['b', 'c'],
      ['b', 'c'],
    ],
  }
  const plan = prepareMeshWeld(mesh, ['a', 'copy', 'b', 'copyb'])
  expect([plan.points, plan.groups, plan.looseEdges]).toEqual([2, 2, 3])
  const result = plan.apply()
  expect(result.looseEdges).toEqual([mesh.looseEdges[0]!, mesh.looseEdges[4]!, mesh.looseEdges[5]!])
  expect(result.looseEdges[0]).toBe(mesh.looseEdges[0])
  expect(result.looseEdges[1]).toBe(mesh.looseEdges[4])
  expect(readSceneGeometry(result)).toEqual(result)
})

test('weld reports blocked topology before applying and never removes faces to hide a conflict', () => {
  const mesh = box()
  const face = Object.values(mesh.faces)[0]!
  const a = face.corners[0]!.vertexId
  const b = face.corners[1]!.vertexId
  mesh.vertices[b] = [...mesh.vertices[a]!]
  const before = structuredClone(mesh)
  const plan = prepareMeshWeld(mesh, [a, b])
  expect(plan.blockedReason).toContain('mesma face')
  expect(() => plan.apply()).toThrow('repetiria um canto')
  expect(() => prepareMeshWeld(mesh, ['missing'])).toThrow('não existe')
  expect(mesh).toEqual(before)
})

test('stitching refuses newly overlapping sides or three-face edges without rejecting unrelated existing problems', () => {
  const original = box()
  const faceId = Object.keys(original.faces)[0]!
  let id = 0
  const mesh = editMeshFaces(original, [faceId], 'detach', () => `copy_${++id}`)
  mesh.faces[faceId]!.corners.reverse()
  const flipped = prepareMeshWeld(mesh, Object.keys(mesh.vertices))
  expect(flipped.blockedReason).toContain('virados')
  expect(() => flipped.apply()).toThrow()
  mesh.faces[faceId]!.corners.reverse()
  mesh.faces.extra = mesh.faces[faceId]!
  const branched = prepareMeshWeld(mesh, Object.keys(mesh.vertices))
  expect(branched.blockedReason).toContain('sobreporia')
  expect(() => branched.apply()).toThrow()
  mesh.vertices.isolated = [7, 8, 9]
  mesh.vertices.copy = [7, 8, 9]
  expect(prepareMeshWeld(mesh, ['isolated', 'copy']).blockedReason).toBeNull()
})
