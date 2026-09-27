import { expect, test } from 'bun:test'
import type { SceneMeshGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { extrudeMeshFaces, prepareMeshExtrusion } from './meshExtrude'
import { editMeshFaces } from './meshFaces'
import { insetMeshFaces } from './meshInset'
import { indexMeshEdges } from './meshTopology'
import { primitiveMesh } from './primitiveMesh'

function box() {
  return primitiveMesh({ id: 'box', kind: 'box', from: [0, 0, 0], to: [2, 2, 2], surfaces: {} })
    .mesh
}
function ids() {
  let next = 0
  return () => `new-${++next}`
}
function closed(mesh: SceneMeshGeometry) {
  const edges = indexMeshEdges(mesh).edges
  for (const incident of edges.values()) {
    expect(incident).toHaveLength(2)
    expect(incident[0]!.a).toBe(incident[1]!.b)
    expect(incident[0]!.b).toBe(incident[1]!.a)
  }
  expect(Object.keys(mesh.vertices).length - edges.size + Object.keys(mesh.faces).length).toBe(2)
  expect(buildSceneGeometry(mesh).issues).toEqual([])
}

test('prepared extrusion is byte-identical to fresh operations and releases bounded caches over 20 sessions', () => {
  const mesh = box()
  const before = structuredClone(mesh)
  for (let cycle = 0; cycle < 20; cycle++) {
    const selected = ['px', 'nx']
    const prepared = prepareMeshExtrusion(mesh, selected)
    selected.push('py') // external selection arrays are not a mutable part of the gesture
    expect(prepared.retainedBytes).toBe(0)
    for (const distance of [0, 1, 2, -0.25, 0.1]) {
      const result = prepared.apply(distance, ids())
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(extrudeMeshFaces(mesh, ['px', 'nx'], distance, ids())),
      )
    }
    expect(prepared.retainedBytes).toBeGreaterThan(0)
    expect(prepared.retainedBytes).toBeLessThanOrEqual(8 * 1024 * 1024)
    expect(() => prepared.apply(Infinity)).toThrow()
    prepared.dispose()
    prepared.dispose()
    expect(prepared.retainedBytes).toBe(0)
    expect(() => prepared.apply(1)).toThrow('terminou')
  }
  expect(mesh).toEqual(before)
})

test.each([
  1, -0.5,
])('region extrusion keeps a closed surface and omits internal walls for distance %s', (distance) => {
  const base = box()
  const mesh = editMeshFaces(base, ['py'], 'triangulate', () => 'top-triangle')
  const before = structuredClone(mesh)
  const result = extrudeMeshFaces(mesh, ['py', 'top-triangle'], distance, ids())
  expect(Object.keys(result.vertices)).toHaveLength(12)
  expect(Object.keys(result.faces)).toHaveLength(11)
  for (const id of ['py', 'top-triangle']) {
    const old = mesh.faces[id]!
    const cap = result.faces[id]!
    cap.corners.forEach((corner, i) => {
      expect(corner.uv).toBe(old.corners[i]!.uv)
      expect(result.vertices[corner.vertexId]![1]).toBe(2 + distance)
    })
  }
  closed(result)
  expect(mesh).toEqual(before)
})

test('disconnected extrusions use each region normal; unsafe topology and nonplanar selection reject without mutation', () => {
  const mesh = box()
  closed(extrudeMeshFaces(mesh, ['px', 'nx'], 0.5, ids()))
  expect(() => extrudeMeshFaces(mesh, ['px', 'py'], 1)).toThrow('planas')
  expect(() => extrudeMeshFaces(mesh, ['px'], Infinity)).toThrow()
  expect(() => extrudeMeshFaces(mesh, ['gone'], 1)).toThrow()
  expect(() => extrudeMeshFaces(mesh, ['px'], 1, () => 'px')).toThrow()
  expect(extrudeMeshFaces(mesh, ['px'], 0)).toBe(mesh)
  const nonManifold = { ...mesh, faces: { ...mesh.faces, overlap: mesh.faces.px! } }
  expect(() => extrudeMeshFaces(nonManifold, ['px'], 1)).toThrow('sobrepostas')
  expect(mesh).toEqual(box())
})

test('proportional inset preserves closed topology and is a no-op at zero', () => {
  const mesh = box()
  const result = insetMeshFaces(mesh, Object.keys(mesh.faces), 0.25, ids())
  expect(Object.keys(result.vertices)).toHaveLength(32)
  expect(Object.keys(result.faces)).toHaveLength(30)
  closed(result)
  expect(insetMeshFaces(mesh, ['py'], 0)).toBe(mesh)
  expect(() => insetMeshFaces(mesh, ['py'], 1)).toThrow()
  expect(() => insetMeshFaces(mesh, ['py'], -1)).toThrow()
  expect(() => insetMeshFaces(mesh, ['gone'], 0.2)).toThrow()
})

test('inset keeps an affine painted surface continuous across every new triangle and refuses incompatible UV', () => {
  const mesh: SceneMeshGeometry = {
    id: 'painted',
    kind: 'mesh',
    vertices: { a: [0, 0, 0], b: [2, 0, 0], c: [2, 2, 0], d: [0, 2, 0] },
    looseEdges: [],
    faces: {},
  }
  const uv = (x: number, y: number): [number, number] => [
    2 + 0.1 * x + 0.2 * y,
    -1 + 0.2 * x - 0.3 * y,
  ]
  mesh.faces.face = {
    materialId: 'paint',
    corners: Object.entries(mesh.vertices).map(([vertexId, p]) => ({
      vertexId,
      uv: uv(p[0], p[1]),
    })),
  }
  const result = insetMeshFaces(mesh, ['face'], 0.4, ids())
  for (const face of Object.values(result.faces)) {
    expect(face.materialId).toBe('paint')
    for (const corner of face.corners) {
      const p = result.vertices[corner.vertexId]!
      const expected = uv(p[0], p[1])
      expect(corner.uv[0]).toBeCloseTo(expected[0], 12)
      expect(corner.uv[1]).toBeCloseTo(expected[1], 12)
    }
  }
  const buffers = buildSceneGeometry(result)
  let area = 0
  for (let i = 0; i < buffers.positions.length; i += 9) {
    const p = buffers.positions
    area +=
      ((p[i + 3]! - p[i]!) * (p[i + 7]! - p[i + 1]!) -
        (p[i + 4]! - p[i + 1]!) * (p[i + 6]! - p[i]!)) /
      2
  }
  expect(area).toBeCloseTo(4, 7)
  const incompatible = structuredClone(mesh)
  incompatible.faces.face!.corners[2]!.uv = [8, 7]
  expect(() => insetMeshFaces(incompatible, ['face'], 0.2)).toThrow('pintura')
  const concave = structuredClone(mesh)
  concave.vertices.c = [0.5, 0.5, 0]
  expect(() => insetMeshFaces(concave, ['face'], 0.2)).toThrow('curva')
})
