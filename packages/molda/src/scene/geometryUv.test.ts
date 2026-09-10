import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import type { SceneGeometry, SceneMeshGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { prepareSceneGeometryUv } from './geometryUv'
import { mapMeshUv } from './meshUv'

test('UV patches match full triangulation byte for byte for concave faces, seams, winding and arbitrary IDs', () => {
  const points: Vec3[] = [
    [0, 0, 0],
    [3, 0, 0],
    [3, 1, 0],
    [1, 1, 0],
    [1, 3, 0],
    [0, 3, 0],
  ]
  for (const reverse of [false, true]) {
    const mesh: SceneMeshGeometry = {
      id: 'mesh',
      kind: 'mesh',
      looseEdges: [],
      vertices: Object.fromEntries(points.map((p, i) => [`v${i}`, p])),
      faces: Object.fromEntries(
        ['__proto__', 'other'].map((id) => [
          id,
          {
            corners: (reverse ? [...points].reverse() : points).map((point) => ({
              vertexId: `v${points.indexOf(point)}`,
              uv: [0, 0],
            })),
          },
        ]),
      ),
    }
    const built = buildSceneGeometry(mesh),
      before = structuredClone(built)
    expect(built.issues).toEqual([])
    const changed = mapMeshUv(mesh, ['__proto__'], (_uv, _id, i) => [
      i / 7 - 0.123456789,
      i % 2 ? 1e-40 : -0,
    ])
    const patch = prepareSceneGeometryUv(mesh, changed, built)!
    expect(patch).not.toBeNull()
    expect(built).toEqual(before)
    const uvs = built.uvs.slice()
    for (const range of patch.ranges) uvs.set(range.values, range.start)
    const full = buildSceneGeometry(changed)
    expect(new Uint8Array(full.uvs.buffer)).toEqual(new Uint8Array(uvs.buffer))
    expect(full).toEqual({ ...built, uvs })
    expect(changed.vertices).toBe(mesh.vertices)
    expect(changed.faces.other).toBe(mesh.faces.other)
  }
})

test('eligibility checks topology, face order, material, spatial identities and diagnostics, not just array sizes', () => {
  const source = makeSceneGridGeometry(2),
    built = buildSceneGeometry(source)
  const face = source.faces.f_0_0!
  const variants: SceneGeometry[] = [
    { ...source, id: 'new' },
    { ...source, vertices: { ...source.vertices } },
    { ...source, looseEdges: [] },
    { ...source, faces: Object.fromEntries(Object.entries(source.faces).reverse()) },
    { ...source, faces: { ...source.faces, f_0_0: { ...face, materialId: 'material' } } },
    {
      ...source,
      faces: { ...source.faces, f_0_0: { ...face, corners: [...face.corners].reverse() } },
    },
    {
      ...source,
      faces: { ...source.faces, f_0_0: { ...face, corners: face.corners.slice(0, 3) } },
    },
    { ...source, faces: { f_0_0: face } },
    { id: source.id, kind: 'box', from: [0, 0, 0], to: [1, 1, 1], surfaces: {} },
  ]
  for (const variant of variants) expect(prepareSceneGeometryUv(source, variant, built)).toBeNull()
  expect(
    prepareSceneGeometryUv(
      source,
      { ...source },
      { ...built, issues: [{ faceId: 'f_0_0', code: 'precision' }] },
    ),
  ).toBeNull()
  expect(prepareSceneGeometryUv(source, { ...source }, built)).toEqual({ ranges: [] })
})

test('UV conversion refuses Float32 overflow atomically and preserves invisible Double changes without new upload ranges', () => {
  const source = makeSceneGridGeometry(2),
    built = buildSceneGeometry(source),
    before = built.uvs.slice()
  const tiny = mapMeshUv(source, ['f_0_0'], (uv) => [uv[0] + Number.MIN_VALUE, uv[1]])
  expect(tiny).not.toBe(source)
  expect(prepareSceneGeometryUv(source, tiny, built)).toEqual({ ranges: [] })
  const invalid = mapMeshUv(source, ['f_0_0', 'f_1_1'], (uv, id) => [
    id === 'f_1_1' ? 1e308 : uv[0] + 0.1,
    uv[1],
  ])
  expect(() => prepareSceneGeometryUv(source, invalid, built)).toThrow('precisão')
  expect(() => buildSceneGeometry(invalid)).toThrow('precisão')
  expect(built.uvs).toEqual(before)
})

test('corner mapping stays aligned when a precision-collapsed face is discarded', () => {
  const source = makeSceneGridGeometry(1)
  const geometry: SceneMeshGeometry = {
    ...source,
    vertices: { ...source.vertices, a: [0, 0, 0], b: [1e-50, 0, 0], c: [0, 1e-50, 0] },
    faces: {
      tiny: { corners: ['a', 'b', 'c'].map((vertexId) => ({ vertexId, uv: [0, 0] })) },
      ...source.faces,
    },
  }
  const built = buildSceneGeometry(geometry)
  expect(built.issues).toEqual([{ faceId: 'tiny', code: 'precision' }])
  expect(built.cornerIndices).toEqual(new Uint32Array([0, 1, 2, 0, 2, 3]))
  expect(built.cornerIndices.length).toBe(built.positions.length / 3)
  expect(
    prepareSceneGeometryUv(
      geometry,
      mapMeshUv(geometry, ['f_0_0'], () => [0.5, 0.5]),
      built,
    ),
  ).toBeNull()
})
