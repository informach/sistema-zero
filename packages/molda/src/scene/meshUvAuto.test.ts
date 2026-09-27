import { expect, test } from 'bun:test'
import type { Vec3 } from '../core/model'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { convertSceneNodesToMesh, editSceneMesh } from './commands'
import type { SceneMeshGeometry } from './document'
import { meshUvBounds } from './meshUv'
import { autoMeshUv } from './meshUvAuto'
import { packMeshUvGroups } from './meshUvPacking'
import { unfoldMeshUv } from './meshUvUnfold'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneGeometry } from './readGeometry'

function fixture(): SceneMeshGeometry {
  const quads: Record<string, Vec3[]> = {
    large: [
      [0, 0, 0],
      [4, 0, 0],
      [4, 2, 0],
      [0, 2, 0],
    ],
    small: [
      [0, 0, 5],
      [1, 0, 5],
      [1, 1, 5],
      [0, 1, 5],
    ],
    tilted: [
      [0, 0, 10],
      [Math.SQRT2, 0, 10 + Math.SQRT2],
      [Math.SQRT2, 1, 10 + Math.SQRT2],
      [0, 1, 10],
    ],
  }
  return {
    id: 'metric',
    kind: 'mesh',
    looseEdges: [],
    vertices: Object.fromEntries(
      Object.entries(quads).flatMap(([id, points]) =>
        points.map((point, i) => [`${id}_${i}`, point]),
      ),
    ),
    faces: Object.fromEntries(
      Object.entries(quads).map(([id, points]) => [
        id,
        {
          corners: points.map((_, i) => ({
            vertexId: `${id}_${i}`,
            uv: [i & 1, i >> 1] as [number, number],
          })),
        },
      ]),
    ),
  }
}
function assertDensity(source: SceneMeshGeometry, result: SceneMeshGeometry) {
  let density: number | undefined
  for (const [id, face] of Object.entries(source.faces))
    for (let i = 0; i < face.corners.length; i++) {
      const next = (i + 1) % face.corners.length
      const a = source.vertices[face.corners[i]!.vertexId]!,
        b = source.vertices[face.corners[next]!.vertexId]!
      const from = result.faces[id]!.corners[i]!.uv,
        to = result.faces[id]!.corners[next]!.uv
      const actual =
        Math.hypot(to[0] - from[0], to[1] - from[1]) /
        Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      if (density === undefined) density = actual
      else expect(actual).toBeCloseTo(density, 12)
    }
}

test('automatic per-face UV keeps physical density, separates charts and is deterministic without touching topology', () => {
  const mesh = fixture(),
    ids = Object.keys(mesh.faces)
  const before = structuredClone(mesh)
  const result = autoMeshUv(mesh, ids, 0.015)
  expect(result.vertices).toBe(mesh.vertices)
  expect(result.looseEdges).toBe(mesh.looseEdges)
  expect(autoMeshUv(mesh, [...ids].reverse(), 0.015)).toEqual(result)
  expect(readSceneGeometry(result)).toEqual(result)
  assertDensity(mesh, result)
  const boxes = ids.map((id) => meshUvBounds(result, [id]))
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]!
    expect(box.min.every((v) => v >= 0.015)).toBe(true)
    expect(box.max.every((v) => v <= 0.985)).toBe(true)
    for (const other of boxes.slice(i + 1))
      expect(
        [0, 1].some(
          (axis) =>
            box.max[axis]! + 0.015 <= other.min[axis]! + 1e-14 ||
            other.max[axis]! + 0.015 <= box.min[axis]! + 1e-14,
        ),
      ).toBe(true)
  }
  const partial = autoMeshUv(mesh, ['small'], 0.02)
  expect(partial.faces.large).toBe(mesh.faces.large)
  expect(partial.faces.tilted).toBe(mesh.faces.tilted)
  expect(autoMeshUv(mesh, [], 0.02)).toBe(mesh)
  expect(mesh).toEqual(before)
})

test('automatic UV tolerates extreme spans, subnormal scale and distant translated faces without storing normalized positions', () => {
  const mesh = makeSceneGridGeometry(1),
    ids = Object.keys(mesh.faces)
  const extreme: SceneMeshGeometry = {
    ...mesh,
    vertices: Object.fromEntries(
      Object.entries(mesh.vertices).map(([id, p]) => [
        id,
        [p[0] ? 1e308 : -1e308, p[1] ? 5e307 : -5e307, 0] as Vec3,
      ]),
    ),
  }
  const result = autoMeshUv(extreme, ids, 0.02)
  expect(result.vertices).toBe(extreme.vertices)
  expect(
    Object.values(result.faces).every((face) =>
      face.corners.every((c) => c.uv.every(Number.isFinite)),
    ),
  ).toBe(true)
  const standard = autoMeshUv(mesh, ids, 0.02)
  for (const scale of [1e-300, Number.MIN_VALUE]) {
    const tiny = {
      ...mesh,
      vertices: Object.fromEntries(
        Object.entries(mesh.vertices).map(([id, p]) => [id, p.map((v) => (v ? scale : 0)) as Vec3]),
      ),
    }
    expect(autoMeshUv(tiny, ids, 0.02).faces).toEqual(standard.faces)
  }
  const translated = fixture()
  translated.faces = { large: translated.faces.large!, small: translated.faces.small! }
  translated.vertices = Object.fromEntries(
    Object.entries(translated.vertices).map(([id, p]) => [id, p.map((v) => v + 1e15) as Vec3]),
  )
  const packed = autoMeshUv(translated, Object.keys(translated.faces), 0.02)
  assertDensity(translated, packed)
  expect(packed.vertices).toBe(translated.vertices)
})

test('auto UV refuses warped faces, precision collapse and invalid groups atomically', () => {
  const mesh = fixture(),
    before = structuredClone(mesh),
    ids = Object.keys(mesh.faces)
  const warped = { ...mesh, vertices: { ...mesh.vertices, large_0: [0, 0, 0.5] as Vec3 } }
  expect(() => autoMeshUv(warped, ids, 0.02)).toThrow('planas')
  for (const padding of [-1, NaN, Infinity, 0.5])
    expect(() => autoMeshUv(mesh, ids, padding)).toThrow()
  expect(() => autoMeshUv(mesh, ['missing'], 0.02)).toThrow()
  expect(() => packMeshUvGroups(mesh, [['small'], ['small']], 0.02)).toThrow('única ilha')
  const tiny = {
    ...mesh,
    vertices: {
      ...mesh.vertices,
      small_0: [0, 0, 0] as Vec3,
      small_1: [1e-300, 0, 0] as Vec3,
      small_2: [1e-300, 1e-300, 0] as Vec3,
      small_3: [0, 1e-300, 0] as Vec3,
    },
  }
  expect(() => autoMeshUv(tiny, ['large', 'small'], 0.02)).toThrow('precisão')
  expect(mesh).toEqual(before)
})

test.each([
  ['per-face', autoMeshUv],
  ['connected', unfoldMeshUv],
] as const)('%s UV uses normal mesh COW/locks/history and never rewrites images or materials', (_kind, prepare) => {
  const original = convertSceneNodesToMesh(migrateLegacyModel(makeModel()).document, ['body'])
  const body = original.nodes.find((n) => n.id === 'body')!
  if (body.kind !== 'mesh') throw new Error('Missing mesh')
  const mesh = { ...fixture(), id: body.geometryId }
  const source = {
    ...original,
    nodes: [...original.nodes, { ...body, id: 'locked_copy', locked: true }],
    geometries: original.geometries.map((g) => (g.id === mesh.id ? mesh : g)),
  }
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  try {
    const edit = (mesh: SceneMeshGeometry) => prepare(mesh, Object.keys(mesh.faces), 0.02)
    expect(() => editSceneMesh(source, 'locked_copy', edit)).toThrow()
    const result = editSceneMesh(source, 'body', edit, () => 'auto_uv_copy')
    expect(result.images).toBe(source.images)
    expect(result.materials).toBe(source.materials)
    expect(result.geometries.find((g) => g.id === mesh.id)).toBe(mesh)
    expect(result.geometries.at(-1)!.id).toBe('auto_uv_copy')
    editor.getState().commit(result)
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(source.geometries)
    expect(editor.getState().asset.nodes).toEqual(source.nodes)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    editor.getState().dispose()
  }
})

test('auto UV packs a thousand independent face charts without recursive traversal or cross-chart overlap', () => {
  const mesh = makeSceneGridGeometry(32)
  const result = autoMeshUv(mesh, Object.keys(mesh.faces), 0.001)
  expect(result.vertices).toBe(mesh.vertices)
  const bounds = meshUvBounds(result)
  expect(bounds.min.every((v) => v >= 0.001)).toBe(true)
  expect(bounds.max.every((v) => v <= 0.999)).toBe(true)
  const boxes = Object.keys(result.faces).map((id) => meshUvBounds(result, [id]))
  let overlaps = 0
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!,
        b = boxes[j]!
      if ([0, 1].every((axis) => a.min[axis]! < b.max[axis]! && a.max[axis]! > b.min[axis]!))
        overlaps++
    }
  expect(overlaps).toBe(0)
  expect(readSceneGeometry(result)).toEqual(result)
})
