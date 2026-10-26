import { expect, test } from 'bun:test'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { sceneUvOverlapArea } from '../testing/sceneUvOverlapOracle'
import { addScenePrimitive } from './commands'
import { createSceneProject } from './createProject'
import type { SceneMeshGeometry } from './document'
import { composeTransform } from './matrix'
import { pixelMeshUv } from './meshPixelUv'
import { indexMeshUv } from './meshUv'
import { sceneGeometryMesh } from './parametricGeometry'

test('cut faces share one pixel-aligned chart at exact density, regardless of corner order', () => {
  const source = makeSceneGridGeometry(4)
  source.faces.f_2_2!.corners.push(source.faces.f_2_2!.corners.shift()!)
  const before = structuredClone(source)
  const plan = pixelMeshUv(source, Object.keys(source.faces), 4)
  expect(plan.charts).toHaveLength(1)
  expect(indexMeshUv(plan.mesh).islands).toHaveLength(1)
  expect(sceneUvOverlapArea(plan.mesh)).toBe(0)
  const byVertex = new Map<string, number[]>()
  for (const face of Object.values(plan.mesh.faces))
    for (const corner of face.corners) {
      const texel = [corner.uv[0] * plan.width, corner.uv[1] * plan.height]
      for (const value of texel) expect(value).toBeCloseTo(Math.round(value), 12)
      if (byVertex.has(corner.vertexId)) expect(texel).toEqual(byVertex.get(corner.vertexId)!)
      byVertex.set(corner.vertexId, texel)
    }
  const uv = plan.mesh.faces.f_0_0!.corners
  expect(
    Math.hypot(
      (uv[1]!.uv[0] - uv[0]!.uv[0]) * plan.width,
      (uv[1]!.uv[1] - uv[0]!.uv[1]) * plan.height,
    ),
  ).toBeCloseTo(1, 12)
  expect(source).toEqual(before)
  expect(plan.mesh.vertices).toBe(source.vertices)
})

test('nonuniform piece size and a rotated parent keep square pixels in world units', () => {
  const source = makeSceneGridGeometry(1)
  const world = composeTransform({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2],
    scale: [3, 2, 1],
  })
  const plan = pixelMeshUv(source, Object.keys(source.faces), 4, world)
  const uv = plan.mesh.faces.f_0_0!.corners
  const edge = (a: number, b: number) =>
    Math.hypot(
      (uv[a]!.uv[0] - uv[b]!.uv[0]) * plan.width,
      (uv[a]!.uv[1] - uv[b]!.uv[1]) * plan.height,
    )
  expect(edge(0, 1)).toBeCloseTo(3, 10)
  expect(edge(1, 2)).toBeCloseTo(2, 10)
})

test('capacity errors do not silently shrink the pixels', () => {
  const source = makeSceneGridGeometry(1)
  expect(() => pixelMeshUv(source, Object.keys(source.faces), 8192)).toThrow('não cabe')
})

test('translation and unused construction points never shift or collapse the paint grid', () => {
  const source = makeSceneGridGeometry(2)
  const moved = composeTransform({
    kind: 'trs',
    translation: [1e20, -1e20, 1e20],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
  })
  const base = pixelMeshUv(source, Object.keys(source.faces), 4)
  source.vertices.a_unused = [1e20, 1e20, 1e20]
  expect(pixelMeshUv(source, Object.keys(source.faces), 4, moved).mesh.faces).toEqual(
    base.mesh.faces,
  )
})

test('equivalent geometry with a tiny node scale keeps the same real pixel grid', () => {
  const source = makeSceneGridGeometry(1)
  const authored: SceneMeshGeometry = {
    ...source,
    vertices: Object.fromEntries(
      Object.entries(source.vertices).map(([id, p]) => [
        id,
        [p[0] * 1e12, p[1] * 1e12, p[2] * 1e12],
      ]),
    ),
  }
  const world = composeTransform({
    kind: 'trs',
    translation: [0, 0, 0],
    rotation: [0, 0, 0, 1],
    scale: [1e-12, 1e-12, 1e-12],
  })
  const expected = pixelMeshUv(source, Object.keys(source.faces), 4)
  const result = pixelMeshUv(authored, Object.keys(authored.faces), 4, world)
  expect(result.mesh.faces).toEqual(expected.mesh.faces)
  expect([result.width, result.height]).toEqual([expected.width, expected.height])
})

test('coincident surfaces stay in separate charts and a densely cut plane stays connected', () => {
  const duplicate = makeSceneGridGeometry(1)
  duplicate.faces.other = {
    corners: duplicate.faces.f_0_0!.corners.map((corner) => ({ ...corner })),
  }
  const separate = pixelMeshUv(duplicate, Object.keys(duplicate.faces), 4)
  expect(separate.charts).toHaveLength(2)
  expect(sceneUvOverlapArea(separate.mesh)).toBe(0)
  const dense = makeSceneGridGeometry(20)
  const joined = pixelMeshUv(dense, Object.keys(dense.faces), 4)
  expect(joined.charts).toHaveLength(1)
  expect(joined.charts[0]).toHaveLength(400)
})

test('a cone unfolds into compact connected islands without overlap or density loss', () => {
  const document = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Cone' }),
    'cone',
    'cone',
  )
  const mesh = sceneGeometryMesh(document.geometries.at(-1)!)
  const plan = pixelMeshUv(mesh, Object.keys(mesh.faces), 16)
  expect(plan.charts).toHaveLength(2)
  expect(plan.charts.map((group) => group.length).sort((a, b) => a - b)).toEqual([1, 31])
  expect(sceneUvOverlapArea(plan.mesh)).toBe(0)
  const face = mesh.faces['side:0']!
  const mapped = plan.mesh.faces['side:0']!
  const physical = Math.hypot(
    ...mesh.vertices[face.corners[0]!.vertexId]!.map(
      (value, axis) => value - mesh.vertices[face.corners[1]!.vertexId]![axis]!,
    ),
  )
  const pixelEdge = Math.hypot(
    ...mapped.corners[0]!.uv.map(
      (value, axis) => (value - mapped.corners[1]!.uv[axis]!) * plan.width,
    ),
  )
  expect(pixelEdge).toBeCloseTo(physical * 16, 8)
})
