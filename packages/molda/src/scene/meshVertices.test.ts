import { expect, test } from 'bun:test'
import { identityMatrix } from './matrix'
import { meshVertexCenter, transformMeshVertices, verticesOfMeshFaces } from './meshVertices'
import { primitiveMesh } from './primitiveMesh'

function fixture() {
  return primitiveMesh({
    id: 'box',
    kind: 'box',
    from: [0.12345678901234, 0, 0],
    to: [2.12345678901234, 2, 2],
    surfaces: {},
  }).mesh
}

test('shared face points transform exactly once with stable topology, UV and untouched point references', () => {
  const mesh = fixture()
  const selected = verticesOfMeshFaces(mesh, ['px', 'py'])
  expect(selected).toHaveLength(6)
  const delta = identityMatrix()
  delta[12] = 0.00000000000001
  const result = transformMeshVertices(mesh, [...selected, ...selected], delta)
  expect(result.faces).toBe(mesh.faces)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  for (const [id, point] of Object.entries(mesh.vertices)) {
    if (selected.includes(id))
      expect(result.vertices[id]).toEqual([point[0] + delta[12], point[1], point[2]])
    else expect(result.vertices[id]).toBe(point)
  }
  expect(mesh).toEqual(fixture())
  expect(transformMeshVertices(mesh, selected, identityMatrix())).toBe(mesh)
  expect(() => transformMeshVertices(mesh, ['gone'], delta)).toThrow()
  expect(() => verticesOfMeshFaces(mesh, ['gone'])).toThrow()
  delta[3] = 1
  expect(() => transformMeshVertices(mesh, selected, delta)).toThrow()
})

test('handle center is a finite world-space bounding center, not the object pivot', () => {
  const mesh = fixture()
  const delta = identityMatrix()
  delta[12] = 10
  expect(meshVertexCenter(mesh, verticesOfMeshFaces(mesh, ['px']), delta)).toEqual([
    12.12345678901234, 1, 1,
  ])
  expect(meshVertexCenter(mesh, [], delta)).toBeNull()
  expect(() => meshVertexCenter(mesh, ['gone'], delta)).toThrow()
})

test('valid imported point IDs that match object property names remain editable own data', () => {
  const mesh = fixture()
  mesh.vertices = Object.fromEntries([
    ...Object.entries(mesh.vertices),
    ['__proto__', [0.125, 0, 0]],
  ])
  const delta = identityMatrix()
  delta[12] = 0.25
  const result = transformMeshVertices(mesh, ['__proto__'], delta)
  expect(Object.hasOwn(result.vertices, '__proto__')).toBe(true)
  expect(result.vertices.__proto__).toEqual([0.375, 0, 0])
  expect(Object.getPrototypeOf(result.vertices)).toBe(Object.prototype)
  expect(mesh.vertices.__proto__).toEqual([0.125, 0, 0])
})
