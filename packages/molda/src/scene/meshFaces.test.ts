import { expect, test } from 'bun:test'
import { createModelAsset } from '../core/model'
import { convertSceneNodesToMesh, editSceneMesh, setSceneNodeFlag } from './commands'
import type { SceneMeshGeometry } from './document'
import { sceneToJson } from './documentJson'
import { buildSceneGeometry } from './geometry'
import { connectedMeshFaces, editMeshFaces } from './meshFaces'
import { migrateLegacyModel } from './migrateLegacy'
import { primitiveMesh } from './primitiveMesh'
import { readSceneDocument } from './readDocument'

function box() {
  return primitiveMesh({ id: 'box', kind: 'box', from: [0, 0, 0], to: [1, 1, 1], surfaces: {} })
    .mesh
}

test('face triangulation retains rendered triangles, corner UV, materials and source data', () => {
  const mesh = box()
  const ids = Object.keys(mesh.faces)
  const before = structuredClone(mesh)
  let next = 0
  const result = editMeshFaces(mesh, ids, 'triangulate', () => `new-${++next}`)
  expect(Object.keys(result.faces)).toHaveLength(12)
  expect(result.vertices).toBe(mesh.vertices)
  const triangles = (value: SceneMeshGeometry) => {
    const buffers = buildSceneGeometry(value)
    return Array.from({ length: buffers.faceIds.length }, (_, i) =>
      JSON.stringify({
        positions: [...buffers.positions.slice(i * 9, (i + 1) * 9)],
        uv: [...buffers.uvs.slice(i * 6, (i + 1) * 6)],
        material: buffers.materialIds[i],
      }),
    ).sort()
  }
  expect(triangles(result)).toEqual(triangles(mesh))
  expect(editMeshFaces(result, Object.keys(result.faces), 'triangulate')).toBe(result)
  expect(mesh).toEqual(before)
})

test('detaching a connected region shares its copied boundary and does not discard independent points or edges', () => {
  const mesh = box()
  const ids = ['px', 'py']
  const chosenVertices = new Set(
    ids.flatMap((id) => mesh.faces[id]?.corners.map((c) => c.vertexId) ?? []),
  )
  let next = 0
  const result = editMeshFaces(mesh, ids, 'detach', () => `v-copy-${++next}`)
  expect(next).toBe(chosenVertices.size)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  const copies = new Map<string, string>()
  for (const id of ids) {
    const old = mesh.faces[id]!
    const face = result.faces[id]!
    for (let i = 0; i < old.corners.length; i++) {
      const from = old.corners[i]!
      const to = face.corners[i]!
      expect(result.vertices[to.vertexId]).toEqual(mesh.vertices[from.vertexId])
      expect(to.uv).toBe(from.uv)
      if (copies.has(from.vertexId)) expect(to.vertexId).toBe(copies.get(from.vertexId)!)
      copies.set(from.vertexId, to.vertexId)
    }
  }
  expect(connectedMeshFaces(result, [ids[0]!]).sort()).toEqual(ids.sort())
  const removed = editMeshFaces(mesh, Object.keys(mesh.faces), 'remove')
  expect(removed.faces).toEqual({})
  expect(removed.vertices).toBe(mesh.vertices)
  expect(removed.looseEdges).toBe(mesh.looseEdges)
  expect(editMeshFaces(mesh, Object.keys(mesh.faces), 'detach')).toBe(mesh)
})

test('flipping is an involution without paint reprojection; invalid IDs/actions and colliding allocation reject atomically', () => {
  const mesh = box()
  const ids = Object.keys(mesh.faces)
  const flipped = editMeshFaces(mesh, ids, 'flip')
  expect(editMeshFaces(flipped, ids, 'flip')).toEqual(mesh)
  const normal = buildSceneGeometry(mesh).normals
  const reverseNormal = buildSceneGeometry(flipped).normals
  for (let i = 0; i < normal.length; i++) expect(reverseNormal[i] || 0).toBe(-(normal[i] || 0) || 0)
  expect(() => editMeshFaces(mesh, ['gone'], 'remove')).toThrow()
  expect(() => editMeshFaces(mesh, ids, 'bad' as 'remove')).toThrow()
  expect(() => editMeshFaces(mesh, ids, 'triangulate', () => ids[0]!)).toThrow()
  expect(Object.keys(mesh.faces)).toHaveLength(6)
  expect(editMeshFaces(mesh, [], 'remove')).toBe(mesh)
})

test('connectivity crosses shared edges, includes non-manifold incidence, and ignores vertex-only contact', () => {
  const mesh: SceneMeshGeometry = {
    id: 'mesh',
    kind: 'mesh',
    vertices: {},
    looseEdges: [],
    faces: {},
  }
  const add = (id: string, vertices: string[]) => {
    mesh.faces[id] = { corners: vertices.map((vertexId) => ({ vertexId, uv: [0, 0] })) }
  }
  add('one', ['a', 'b', 'c'])
  add('two', ['b', 'a', 'd'])
  add('three', ['a', 'b', 'e'])
  add('touch', ['c', 'f', 'g'])
  expect(connectedMeshFaces(mesh, ['one', 'missing']).sort()).toEqual(['one', 'three', 'two'])
  expect(connectedMeshFaces(mesh, [])).toEqual([])
})

test('mesh command isolates shared geometry, roundtrips paint, and respects locks before editing', () => {
  const migrated = migrateLegacyModel(createModelAsset({ name: 'Faces' })).document
  const id = migrated.nodes[0]!.id
  const source = convertSceneNodesToMesh(migrated, [id])
  const node = source.nodes[0]!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  source.nodes.push({ ...node, id: 'shared' })
  const geometry = source.geometries.find((g) => g.id === node.geometryId)
  if (geometry?.kind !== 'mesh') throw new Error('Missing mesh')
  const faceId = Object.keys(geometry.faces)[0]!
  const result = editSceneMesh(
    source,
    id,
    (mesh) => editMeshFaces(mesh, [faceId], 'remove'),
    () => 'private',
  )
  expect(result.nodes[0]).toEqual({ ...node, geometryId: 'private' })
  expect(result.geometries.find((g) => g.id === node.geometryId)).toBe(geometry)
  expect(result.images).toBe(source.images)
  expect(result.materials).toBe(source.materials)
  expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
  expect(editSceneMesh(source, id, (mesh) => mesh)).toBe(source)
  expect(() =>
    editSceneMesh(setSceneNodeFlag(source, [id], 'locked', true), id, () => {
      throw new Error('Callback must not run')
    }),
  ).toThrow('trav')
  expect(() => editSceneMesh(source, id, (mesh) => ({ ...mesh, id: 'wrong' }))).toThrow()
})
