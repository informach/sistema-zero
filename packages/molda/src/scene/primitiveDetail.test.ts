import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import {
  addScenePrimitive,
  convertSceneNodesToMesh,
  resizeScenePrimitive,
  setSceneNodeFlag,
  setScenePrimitiveDetail,
} from './commands'
import type { SceneCurvedPrimitive } from './document'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { buildSceneGeometry } from './geometry'
import { migrateLegacyModel } from './migrateLegacy'
import { primitiveDetail, primitiveTriangleCount } from './primitiveDetail'
import { primitiveMesh } from './primitiveMesh'
import { readSceneDocument } from './readDocument'
import { readSceneGeometry } from './readGeometry'

test('every boundary tessellation has a closed oriented surface and an exact drawing/conversion budget', () => {
  for (const kind of ['cylinder', 'sphere', 'torus'] as const) {
    for (const around of [3, 7, 64]) {
      for (const down of kind === 'sphere' ? [2, 9, 32] : kind === 'torus' ? [3, 8, 32] : [1]) {
        const base = {
          id: 'g',
          from: [-1.123456789, -2, -3] as [number, number, number],
          to: [2, 3, 4] as [number, number, number],
          surfaces: {},
        }
        const source: SceneCurvedPrimitive =
          kind === 'cylinder'
            ? { ...base, kind, tessellation: { around } }
            : { ...base, kind, tessellation: { around, down } }
        const { mesh } = primitiveMesh(source)
        const drawn = buildSceneGeometry(source)
        const converted = buildSceneGeometry(mesh)
        const expected =
          kind === 'sphere'
            ? around * (down - 1) * 2
            : kind === 'torus'
              ? around * down * 2
              : around * 4
        expect(drawn.issues).toEqual([])
        expect(drawn.faceIds).toHaveLength(expected)
        expect(primitiveTriangleCount(source)).toBe(expected)
        expect(converted.positions).toEqual(drawn.positions)
        expect(converted.uvs).toEqual(drawn.uvs)
        const edges = new Map<string, Array<[string, string]>>()
        for (const face of Object.values(mesh.faces)) {
          face.corners.forEach((corner, i) => {
            const pair: [string, string] = [
              corner.vertexId,
              face.corners[(i + 1) % face.corners.length]!.vertexId,
            ]
            const key = JSON.stringify([...pair].sort())
            const entries = edges.get(key) ?? []
            entries.push(pair)
            edges.set(key, entries)
          })
        }
        for (const entries of edges.values()) {
          expect(entries).toHaveLength(2)
          expect(entries[0]).toEqual([entries[1]![1], entries[1]![0]])
        }
        expect(
          Object.keys(mesh.vertices).length - edges.size + Object.keys(mesh.faces).length,
        ).toBe(kind === 'torus' ? 0 : 2)
      }
    }
  }
})

test('torus keeps its painted surface and detail through save, resize and conversion', () => {
  const added = addScenePrimitive(migrateLegacyModel(makeModel()).document, 'torus', 'Torus')
  const node = added.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Missing torus node')
  const geometry = added.geometries.at(-1)!
  if (geometry.kind !== 'torus') throw new Error('Missing torus geometry')
  expect(geometry.from).toEqual([-1, -0.35, -1])
  expect(geometry.to).toEqual([1, 0.35, 1])
  expect(primitiveDetail(geometry)).toEqual({ around: 16, down: 8 })
  expect(new Set(primitiveMesh(geometry).surfaceByFace.values())).toEqual(new Set(['around']))
  const changed = setScenePrimitiveDetail(added, node.id, { around: 12, down: 6 })
  const resized = resizeScenePrimitive(changed, node.id, [3, 1, 4])
  const resizedGeometry = resized.geometries.at(-1)!
  if (resizedGeometry.kind !== 'torus') throw new Error('Missing resized torus')
  expect(
    resizedGeometry.to.map((value, axis) => value - (resizedGeometry.from[axis] ?? NaN)),
  ).toEqual([3, 1, 4])
  expect(primitiveDetail(resizedGeometry)).toEqual({ around: 12, down: 6 })
  const decoded = readSceneDocument(sceneToJson(resized))
  expect(decoded.status).toBe('valid')
  if (decoded.status === 'valid')
    expect(decoded.document.geometries.at(-1)).toEqual(resizedGeometry)
  const converted = convertSceneNodesToMesh(resized, [node.id])
  expect(buildSceneGeometry(converted.geometries.at(-1)!).positions).toEqual(
    buildSceneGeometry(resizedGeometry).positions,
  )
  expect(() => readSceneGeometry({ ...geometry, tessellation: { around: 12, down: 2 } })).toThrow()
})

test('strict detail boundaries reject coercion, wrong fields and invalid budgets without synthesizing defaults', () => {
  const base: SceneCurvedPrimitive = {
    id: 'g',
    kind: 'sphere',
    from: [-1, -1, -1],
    to: [1, 1, 1],
    surfaces: {},
  }
  expect(readSceneGeometry(base)).toEqual(base)
  for (const tessellation of [
    null,
    {},
    { around: 3 },
    { around: '12', down: 6 },
    { around: 2, down: 6 },
    { around: 65, down: 6 },
    { around: 3.5, down: 6 },
    { around: 3, down: 1 },
    { around: 3, down: 33 },
    { around: NaN, down: 6 },
    { around: 3, down: Infinity },
    { around: 3, down: 6, extra: 1 },
  ]) {
    expect(() => readSceneGeometry({ ...base, tessellation })).toThrow()
  }
  expect(() => readSceneGeometry({ ...base, kind: 'box', tessellation: { around: 3 } })).toThrow()
  expect(() =>
    readSceneGeometry({ ...base, kind: 'cylinder', tessellation: { around: 3, down: 2 } }),
  ).toThrow()
  expect(() =>
    readSceneGeometry({ ...base, tessellation: { around: 64, down: 32 } }, 'g', {
      triangles: 19000,
      vertices: 0,
      edges: 0,
    }),
  ).toThrow()
})

test('detail changes isolate shared users, preserve paint and dimensions, survive the codec and undo conversion', () => {
  const added = addScenePrimitive(migrateLegacyModel(makeModel()).document, 'sphere', 'Bola')
  const node = added.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  const source = { ...added, nodes: [...added.nodes, { ...node, id: 'shared' }] }
  const original = source.geometries.at(-1)!
  if (original.kind !== 'sphere') throw new Error('Missing sphere')
  const before = structuredClone(source)
  expect(setScenePrimitiveDetail(source, node.id, { around: 12, down: 6 })).toBe(source)
  const changed = setScenePrimitiveDetail(source, node.id, { around: 7, down: 3 }, () => 'detail')
  expect(source).toEqual(before)
  const geometry = changed.geometries.at(-1)!
  if (geometry.kind !== 'sphere') throw new Error('Missing sphere')
  expect(geometry.id).toBe('detail')
  expect(geometry.surfaces).toBe(original.surfaces)
  expect(geometry.from).toBe(original.from)
  expect(geometry.to).toBe(original.to)
  expect(changed.images).toBe(source.images)
  expect(changed.materials).toBe(source.materials)
  expect(changed.geometries.at(-2)).toBe(original)
  expect(changed.nodes.at(-1)).toBe(source.nodes.at(-1))
  expect(primitiveDetail(geometry)).toEqual({ around: 7, down: 3 })
  const read = readSceneDocument(sceneToJson(changed))
  expect(read.status).toBe('valid')
  if (read.status === 'valid') expect(read.document.geometries).toEqual(changed.geometries)
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60000,
  })
  try {
    editor.getState().commit(changed)
    const converted = convertSceneNodesToMesh(changed, [node.id])
    editor.getState().commit(converted)
    expect(buildSceneGeometry(converted.geometries.at(-1)!).positions).toEqual(
      buildSceneGeometry(geometry).positions,
    )
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(changed.geometries)
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(source.geometries)
  } finally {
    editor.getState().dispose()
  }
  expect(() =>
    setScenePrimitiveDetail(setSceneNodeFlag(source, [node.id], 'locked', true), node.id, {
      around: 7,
      down: 3,
    }),
  ).toThrow()
  expect(() => setScenePrimitiveDetail(source, 'body', { around: 7 })).toThrow()
})

test('both orphan geometry and rendered instances including mirrors count authored detail', () => {
  const added = addScenePrimitive(migrateLegacyModel(makeModel()).document, 'sphere', 'Bola')
  const node = added.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  const changed = setScenePrimitiveDetail(added, node.id, { around: 64, down: 32 })
  const geometry = changed.geometries.at(-1)!
  const base = { ...changed, nodes: [node], geometries: [geometry], mirrors: [] }
  expect(indexSceneDocument(base).triangleCount).toBe(3968)
  const copies = {
    ...base,
    nodes: Array.from({ length: 6 }, (_, i) => ({ ...node, id: `node-${i}` })),
  }
  expect(() => indexSceneDocument(copies)).toThrow()
  expect(readSceneDocument(copies).status).toBe('invalid')
  const orphan = {
    ...base,
    geometries: Array.from({ length: 6 }, (_, i) => ({
      ...geometry,
      id: i === 0 ? geometry.id : `g-${i}`,
    })),
  }
  expect(() => indexSceneDocument(orphan)).toThrow()
  expect(readSceneDocument(orphan).status).toBe('invalid')
  const mirrors = {
    ...base,
    mirrors: Array.from({ length: 5 }, (_, i) => ({
      id: `mirror-${i}`,
      name: 'Espelho',
      sourceId: node.id,
      axis: 'x' as const,
      offset: i,
    })),
  }
  expect(() => indexSceneDocument(mirrors)).toThrow()
  const low = { ...added, nodes: [node], mirrors: mirrors.mirrors }
  expect(() => setScenePrimitiveDetail(low, node.id, { around: 64, down: 32 })).toThrow()
  expect(indexSceneDocument(low).triangleCount).toBe(720)
})
