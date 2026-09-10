import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneMeshGeometry } from './document'
import { editMeshFaces } from './meshFaces'
import { dissolveMeshEdges, mergeMeshFaces } from './meshMerge'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { readSceneGeometry } from './readGeometry'

function paintedGrid(size: number): SceneMeshGeometry {
  const mesh = makeSceneGridGeometry(size)
  for (const face of Object.values(mesh.faces)) {
    face.materialId = 'paint'
    for (const corner of face.corners) {
      const [x, y] = mesh.vertices[corner.vertexId]!
      corner.uv = [0.123456789123 + x * 2 + y / 3, 0.987654321987 + y * 3 - x / 2]
    }
  }
  return mesh
}

test('merging keeps exact boundary corners, material and point identities with one surviving face ID', () => {
  const mesh = paintedGrid(2)
  mesh.looseEdges = [['v_0_0', 'v_1_1']]
  const source = structuredClone(mesh)
  const result = mergeMeshFaces(mesh, ['f_0_0', 'f_1_0', 'f_0_0'])
  expect(Object.keys(result.faces)).toEqual(['f_0_0', 'f_0_1', 'f_1_1'])
  expect(result.faces.f_0_0!.corners.map((c) => c.vertexId)).toEqual([
    'v_0_0',
    'v_1_0',
    'v_2_0',
    'v_2_1',
    'v_1_1',
    'v_0_1',
  ])
  for (const corner of result.faces.f_0_0!.corners) {
    expect([mesh.faces.f_0_0!, mesh.faces.f_1_0!].some((f) => f.corners.includes(corner))).toBe(
      true,
    )
  }
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(result.faces.f_0_1).toBe(mesh.faces.f_0_1)
  expect(result.faces.f_0_0!.materialId).toBe('paint')
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(source)
})

test('concave disks join, disconnected faces are unchanged, and special identities remain own properties', () => {
  const mesh = paintedGrid(3)
  const result = mergeMeshFaces(mesh, ['f_0_0', 'f_1_0', 'f_0_1', 'f_2_2'])
  expect(Object.keys(result.faces)).toHaveLength(7)
  expect(result.faces.f_2_2).toBe(mesh.faces.f_2_2)
  expect(result.faces.f_0_0!.corners).toHaveLength(8)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mergeMeshFaces(mesh, ['f_0_0', 'f_2_2'])).toBe(mesh)
  expect(mergeMeshFaces(mesh, [])).toBe(mesh)
  mesh.faces = { ...mesh.faces, ['__proto__']: mesh.faces.f_0_0! }
  delete mesh.faces.f_0_0
  const special = editMeshFaces(mesh, ['__proto__', 'f_1_0'], 'merge')
  expect(Object.hasOwn(special.faces, '__proto__')).toBe(true)
  expect(special.faces.__proto__!.corners).toHaveLength(6)
  expect(readSceneGeometry(special)).toEqual(special)
})

test('all source corners must share one affine paint mapping, including discarded interior points', () => {
  const seams = makeSceneGridGeometry(2)
  expect(() => mergeMeshFaces(seams, Object.keys(seams.faces))).toThrow('pintura')
  const interior = paintedGrid(2)
  for (const face of Object.values(interior.faces))
    for (const corner of face.corners) if (corner.vertexId === 'v_1_1') corner.uv = [0.5, 0.5]
  expect(() => mergeMeshFaces(interior, Object.keys(interior.faces))).toThrow('pintura')
  const material = paintedGrid(2)
  material.faces.f_1_0!.materialId = 'other'
  const before = structuredClone(material)
  expect(() => mergeMeshFaces(material, ['f_0_0', 'f_1_0'])).toThrow('materiais diferentes')
  expect(material).toEqual(before)
})

test('joining refuses holes, folds, inconsistent orientation, non-manifold edges and overlong boundaries', () => {
  const ring = paintedGrid(3)
  expect(() =>
    mergeMeshFaces(
      ring,
      Object.keys(ring.faces).filter((id) => id !== 'f_1_1'),
    ),
  ).toThrow('buraco')
  const folded = paintedGrid(2)
  folded.vertices.v_2_0![2] = 0.125
  folded.vertices.v_2_1![2] = 0.125
  expect(() => mergeMeshFaces(folded, ['f_0_0', 'f_1_0'])).toThrow('planas')
  const reversed = paintedGrid(2)
  reversed.faces.f_1_0!.corners.reverse()
  expect(() => mergeMeshFaces(reversed, ['f_0_0', 'f_1_0'])).toThrow()
  const crowded = paintedGrid(2)
  crowded.faces.extra = crowded.faces.f_0_0!
  expect(() => mergeMeshFaces(crowded, ['f_0_0', 'f_1_0'])).toThrow('sobrepostas')
  const large = paintedGrid(17)
  expect(() => mergeMeshFaces(large, Object.keys(large.faces))).toThrow('pontos demais')
  expect(() => mergeMeshFaces(ring, ['missing', 'f_0_0'])).toThrow('não existe')
})

test('triangulating and rejoining flat painted faces preserves appearance and external incidence', () => {
  const mesh = paintedGrid(2)
  let id = 0
  const triangles = editMeshFaces(mesh, ['f_0_0'], 'triangulate', () => `triangle_${++id}`)
  const joined = mergeMeshFaces(triangles, ['f_0_0', 'triangle_1'])
  expect(joined.faces.f_0_0!.corners).toHaveLength(4)
  const beforeEdges = indexMeshEdges(mesh).edges
  const afterEdges = indexMeshEdges(joined).edges
  expect([...afterEdges.keys()].sort()).toEqual([...beforeEdges.keys()].sort())
  for (const [key, edges] of beforeEdges) expect(afterEdges.get(key)).toHaveLength(edges.length)
  expect(readSceneGeometry(joined)).toEqual(joined)
})

test('a shared UV plane is checked without coordinate rounding on translated, thin and rotated surfaces', () => {
  for (const scale of [1e-12, 1, 1e12]) {
    const mesh = paintedGrid(2)
    for (const [id, [x, y]] of Object.entries(mesh.vertices))
      mesh.vertices[id] = [5 * scale, (x + 1.123456789123) * scale, y * scale * 0.001]
    const joined = mergeMeshFaces(mesh, Object.keys(mesh.faces))
    expect(Object.keys(joined.faces)).toHaveLength(1)
    expect(joined.vertices).toBe(mesh.vertices)
    expect(readSceneGeometry(joined)).toEqual(joined)
  }
})

test('dissolving neighboring pairs removes exactly the selected lines, not the border between the pairs', () => {
  const mesh = paintedGrid(2)
  const chosen = [meshEdgeKey('v_1_0', 'v_1_1'), meshEdgeKey('v_1_1', 'v_1_2')]
  mesh.looseEdges = [
    ['v_1_0', 'v_1_1'],
    ['v_0_0', 'v_2_2'],
  ]
  const before = structuredClone(mesh)
  const result = dissolveMeshEdges(mesh, chosen)
  expect(Object.keys(result.faces)).toHaveLength(2)
  const afterEdges = indexMeshEdges(result).edges
  const removed = [...indexMeshEdges(mesh).edges.keys()].filter((key) => !afterEdges.has(key))
  expect(removed.sort()).toEqual(chosen.sort())
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toEqual([mesh.looseEdges[1]!])
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(before)
})

test('partial cycles, boundary edges, loose lines and paint seams cannot be silently dissolved', () => {
  const mesh = paintedGrid(2)
  const middle = [...indexMeshEdges(mesh).edges]
    .filter(([, edges]) => edges.length === 2)
    .map(([key]) => key)
  expect(() => dissolveMeshEdges(mesh, middle.slice(1))).toThrow('Faltam linhas')
  expect(Object.keys(dissolveMeshEdges(mesh, middle).faces)).toHaveLength(1)
  expect(() => dissolveMeshEdges(mesh, [meshEdgeKey('v_0_0', 'v_1_0')])).toThrow('duas faces')
  mesh.looseEdges = [['v_0_0', 'v_2_2']]
  expect(() => dissolveMeshEdges(mesh, [meshEdgeKey('v_0_0', 'v_2_2')])).toThrow('linhas soltas')
  expect(() => dissolveMeshEdges(makeSceneGridGeometry(2), middle)).toThrow('pintura')
  expect(dissolveMeshEdges(mesh, [])).toBe(mesh)
})
