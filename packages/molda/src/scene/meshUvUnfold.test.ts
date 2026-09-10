import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { sceneUvOverlapArea } from '../testing/sceneUvOverlapOracle'
import type { SceneMeshGeometry } from './document'
import { buildSceneGeometry } from './geometry'
import { indexMeshEdges, meshEdgeKey } from './meshTopology'
import { indexMeshUv, meshUvBounds } from './meshUv'
import { autoMeshUv } from './meshUvAuto'
import { unfoldMeshUv } from './meshUvUnfold'
import { primitiveMesh } from './primitiveMesh'
import { readSceneGeometry } from './readGeometry'

function assertDensity(source: SceneMeshGeometry, result: SceneMeshGeometry) {
  let density: number | undefined
  for (const [id, face] of Object.entries(source.faces))
    for (let i = 0; i < face.corners.length; i++) {
      const next = (i + 1) % face.corners.length
      const a = source.vertices[face.corners[i]!.vertexId]!,
        b = source.vertices[face.corners[next]!.vertexId]!
      const p = result.faces[id]!.corners[i]!.uv,
        q = result.faces[id]!.corners[next]!.uv
      const ratio =
        Math.hypot(q[0] - p[0], q[1] - p[1]) / Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      if (density === undefined) density = ratio
      else expect(ratio).toBeCloseTo(density, 10)
    }
}

test('connected unfolding opens a cube as one painting chart, retaining metric density and authorial geometry', () => {
  const mesh = primitiveMesh({
    id: 'box',
    kind: 'box',
    from: [-1, -1, -1],
    to: [1, 1, 1],
    surfaces: {},
  }).mesh
  const ids = Object.keys(mesh.faces),
    before = structuredClone(mesh)
  const result = unfoldMeshUv(mesh, ids, 0.02)
  expect(indexMeshUv(autoMeshUv(mesh, ids, 0.02)).islands).toHaveLength(6)
  expect(indexMeshUv(result).islands).toHaveLength(1)
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(buildSceneGeometry(result).positions).toEqual(buildSceneGeometry(mesh).positions)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(before)
  assertDensity(mesh, result)
  expect(sceneUvOverlapArea(result)).toBeLessThan(1e-12)
  const reversed = { ...mesh, faces: Object.fromEntries(Object.entries(mesh.faces).reverse()) }
  expect(unfoldMeshUv(reversed, [...ids].reverse(), 0.02)).toEqual(result)
})

test('explicit cuts survive alternative paths around a cycle and material boundaries never join', () => {
  const mesh = makeSceneGridGeometry(2),
    ids = Object.keys(mesh.faces)
  const key = meshEdgeKey('v_1_0', 'v_1_1')
  expect(indexMeshUv(unfoldMeshUv(mesh, ids, 0.02)).islands).toHaveLength(1)
  const result = unfoldMeshUv(mesh, ids, 0.02, [key]),
    index = indexMeshUv(result)
  expect(index.seams).toContain(key)
  expect(index.islands.length).toBeGreaterThan(1)
  assertDensity(mesh, result)
  const material = {
    ...mesh,
    faces: { ...mesh.faces, f_0_0: { ...mesh.faces.f_0_0!, materialId: 'different' } },
  }
  expect(
    indexMeshUv(unfoldMeshUv(material, ids, 0.02)).islands.some(
      (island) => island.length === 1 && island[0] === 'f_0_0',
    ),
  ).toBe(true)
  expect(() => unfoldMeshUv(mesh, ids, 0.02, ['missing'])).toThrow('corte')
  expect(() => unfoldMeshUv(mesh, ids, 0.02, [key, key])).toThrow('uma vez')
  expect(() => unfoldMeshUv(mesh, ['f_0_0', 'f_1_0'], 0, [key])).toThrow('margem')
})

test('non-manifold and reversed neighbor boundaries stay cut; unselected faces and native source stay untouched', () => {
  const mesh = makeSceneGridGeometry(2),
    ids = Object.keys(mesh.faces)
  const nonManifold = {
    ...mesh,
    faces: { ...mesh.faces, third: structuredClone(mesh.faces.f_0_0!) },
  }
  const key = meshEdgeKey('v_1_0', 'v_1_1')
  const result = unfoldMeshUv(nonManifold, Object.keys(nonManifold.faces), 0.01)
  expect(indexMeshEdges(result).edges.get(key)).toHaveLength(3)
  expect(indexMeshUv(result).seams).toContain(key)
  const reversed = {
    ...mesh,
    faces: {
      ...mesh.faces,
      f_1_0: { ...mesh.faces.f_1_0!, corners: [...mesh.faces.f_1_0!.corners].reverse() },
    },
  }
  expect(indexMeshUv(unfoldMeshUv(reversed, ids, 0.01)).seams).toContain(key)
  const partial = unfoldMeshUv(mesh, ['f_0_0', 'f_1_0'], 0.01)
  expect(partial.faces.f_0_1).toBe(mesh.faces.f_0_1)
  expect(partial.faces.f_1_1).toBe(mesh.faces.f_1_1)
  expect(unfoldMeshUv(mesh, [], 0.01)).toBe(mesh)
})

test('unfolding tolerates Double extremes without storing normalized points and refuses warped input atomically', () => {
  const base = makeSceneGridGeometry(1),
    ids = Object.keys(base.faces)
  for (const scale of [Number.MIN_VALUE, 1e-300, 1e308]) {
    const mesh = {
      ...base,
      vertices: Object.fromEntries(
        Object.entries(base.vertices).map(([id, p]) => [
          id,
          [p[0] ? scale : 0, p[1] ? scale : 0, 0] as Vec3,
        ]),
      ),
    }
    const result = unfoldMeshUv(mesh, ids, 0.02)
    expect(result.vertices).toBe(mesh.vertices)
    expect(meshUvBounds(result).min.every((v) => v >= 0.02)).toBe(true)
    expect(meshUvBounds(result).max.every((v) => v <= 0.98)).toBe(true)
  }
  const mesh = { ...base, vertices: { ...base.vertices, v_1_1: [0.25, 0.25, 0.1] as Vec3 } },
    before = structuredClone(mesh)
  expect(() => unfoldMeshUv(mesh, ids, 0.02)).toThrow('planas')
  expect(mesh).toEqual(before)
  expect(() => unfoldMeshUv(base, ids, NaN)).toThrow()
})

test('large connected sheets use bounded charts rather than quadratic all-face overlap checks', () => {
  const mesh = makeSceneGridGeometry(16),
    result = unfoldMeshUv(mesh, Object.keys(mesh.faces), 0.005)
  const { islands } = indexMeshUv(result)
  expect(islands.flat()).toHaveLength(256)
  expect(islands.length).toBeGreaterThan(1)
  expect(islands.every((island) => island.length <= 64)).toBe(true)
  expect(islands.length).toBeLessThan(256)
  assertDensity(mesh, result)
})

test('saddle facets split into extra charts when unfolding would overlap, verified by independent clipping', () => {
  for (const height of [0.25, 1, 2, 5]) {
    const vertices: Record<string, Vec3> = { center: [0, 0, 0] }
    for (let i = 0; i < 6; i++)
      vertices[`v${i}`] = [
        Math.cos((i * Math.PI) / 3),
        Math.sin((i * Math.PI) / 3),
        i % 2 ? height : -height,
      ]
    const mesh: SceneMeshGeometry = {
      id: 'saddle',
      kind: 'mesh',
      vertices,
      looseEdges: [],
      faces: Object.fromEntries(
        Array.from({ length: 6 }, (_, i) => [
          `f${i}`,
          {
            corners: ['center', `v${i}`, `v${(i + 1) % 6}`].map((vertexId) => ({
              vertexId,
              uv: [0, 0],
            })),
          },
        ]),
      ),
    }
    const result = unfoldMeshUv(mesh, Object.keys(mesh.faces), 0.01)
    expect(indexMeshUv(result).islands.length).toBeGreaterThan(1)
    expect(sceneUvOverlapArea(result)).toBeLessThan(1e-12)
    assertDensity(mesh, result)
  }
})

test('concave faces retain all corners and open beside their oriented neighbor without a convex-only approximation', () => {
  const points: Vec3[] = [
    [0, 0, 0],
    [3, 0, 0],
    [3, 1, 0],
    [1, 1, 0],
    [1, 3, 0],
    [0, 3, 0],
    [0, -1, 0],
    [3, -1, 0],
  ]
  const mesh: SceneMeshGeometry = {
    id: 'concave',
    kind: 'mesh',
    looseEdges: [],
    vertices: Object.fromEntries(points.map((p, i) => [`v${i}`, p])),
    faces: Object.fromEntries(
      [
        ['concave', [0, 1, 2, 3, 4, 5]],
        ['neighbor', [1, 0, 6, 7]],
      ].map(([id, indices]) => [
        id,
        {
          corners: (indices as number[]).map((i) => ({ vertexId: `v${i}`, uv: [0, 0] })),
        },
      ]),
    ),
  }
  const result = unfoldMeshUv(mesh, Object.keys(mesh.faces), 0.02)
  expect(indexMeshUv(result).islands).toHaveLength(1)
  expect(sceneUvOverlapArea(result)).toBeLessThan(1e-12)
  assertDensity(mesh, result)
})
