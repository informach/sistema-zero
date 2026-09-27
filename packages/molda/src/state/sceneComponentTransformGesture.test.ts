import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import {
  convertSceneNodesToMesh,
  groupSceneNodes,
  setSceneNodeFlag,
  transformSceneNodes,
} from '../scene/commands'
import { indexSceneDocument } from '../scene/documentIndex'
import { sceneToJson } from '../scene/documentJson'
import {
  composeTransform,
  identityMatrix,
  quaternionFromEulerXYZ,
  transformPoint,
} from '../scene/matrix'
import { meshComponentEdges } from '../scene/meshComponents'
import { meshMovementWeights } from '../scene/meshSoftMovement'
import { verticesOfMeshFaces } from '../scene/meshVertices'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { readSceneDocument } from '../scene/readDocument'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'
import { createSceneComponentTransformGesture } from './sceneComponentTransformGesture'

function setup() {
  const matrix = identityMatrix()
  matrix[0] = 1.5
  matrix[4] = 0.3
  matrix[5] = 2
  matrix[9] = 0.2
  matrix[12] = 3.1234567
  const source = transformSceneNodes(
    groupSceneNodes(
      convertSceneNodesToMesh(migrateLegacyModel(makeModel()).document, ['body']),
      ['body'],
      { nextId: () => 'group' },
    ),
    ['group'],
    matrix,
  )
  const node = source.nodes.find((n) => n.id === 'body')!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  source.nodes.push({ ...node, id: 'shared' })
  const mesh = source.geometries.find((g) => g.id === node.geometryId)!
  if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  const errors: unknown[] = []
  const gesture = createSceneComponentTransformGesture(editor, (error) => errors.push(error))
  return { source, mesh, editor, errors, gesture }
}

test('soft point movement captures world-path weights once and preserves COW, shear, cancellation and one undo', () => {
  const f = setup()
  try {
    const vertex = Object.keys(f.mesh.vertices)[0]!
    const selection = { nodeId: 'body', mode: 'vertex' as const, ids: [vertex] }
    const world = indexSceneDocument(f.source).scene.worldMatrices.get('body')!
    const weights = meshMovementWeights(f.mesh, [vertex], world, 10)
    expect(weights.size).toBeGreaterThan(1)
    expect(f.gesture.begin(selection, f.mesh, 10)).toBe(true)
    for (const x of [0.123456789123, 0.5]) {
      const delta = identityMatrix()
      delta[12] = x
      delta[13] = -x / 3
      expect(f.gesture.preview(delta)).toBe(true)
      const changed = f.editor.getState().asset.geometries.at(-1)!
      if (changed.kind !== 'mesh') throw new Error('Missing mesh')
      for (const [id, point] of Object.entries(f.mesh.vertices)) {
        const before = transformPoint(world, point)
        const after = transformPoint(world, changed.vertices[id]!)
        const weight = weights.get(id) ?? 0
        expect(after[0] - before[0]).toBeCloseTo(x * weight, 11)
        expect(after[1] - before[1]).toBeCloseTo((-x * weight) / 3, 11)
        expect(after[2]).toBeCloseTo(before[2], 11)
      }
      expect(changed.faces).toBe(f.mesh.faces)
      expect(f.editor.getState().asset.geometries.find((g) => g.id === f.mesh.id)).toBe(f.mesh)
    }
    expect(f.gesture.end(true)).toBe(true)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
    const current = f.editor.getState().asset.geometries.find((g) => g.id === f.mesh.id)!
    if (current.kind !== 'mesh') throw new Error('Missing mesh')
    expect(f.gesture.begin(selection, current, 10)).toBe(true)
    const scale = identityMatrix()
    scale[0] = 2
    expect(f.gesture.preview(scale)).toBe(false)
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.gesture.begin(selection, current, NaN)).toBe(false)
  } finally {
    f.gesture.cancel()
    f.editor.getState().dispose()
  }
})

test.each([
  'vertex',
  'edge',
] as const)('%s transforms only selected endpoints, preserve exact UV and cancel copy-on-write in one history gesture', (mode) => {
  const f = setup()
  try {
    const [edge, endpoints] = [...meshComponentEdges(f.mesh)][0]!
    const ids = mode === 'vertex' ? [endpoints[0]] : [edge]
    const points = mode === 'vertex' ? [endpoints[0]] : endpoints
    const world = indexSceneDocument(f.source).scene.worldMatrices.get('body')!
    const delta = identityMatrix()
    delta[12] = 0.123456789123
    expect(f.gesture.begin({ nodeId: 'body', mode, ids }, f.mesh)).toBe(true)
    expect(f.gesture.preview(delta)).toBe(true)
    const first = f.editor.getState().asset.geometries.at(-1)!
    if (first.kind !== 'mesh') throw new Error('Missing copied mesh')
    expect(first.faces).toBe(f.mesh.faces)
    expect(first.looseEdges).toBe(f.mesh.looseEdges)
    for (const [id, point] of Object.entries(f.mesh.vertices)) {
      if (!points.includes(id)) expect(first.vertices[id]).toBe(point)
      else {
        const after = transformPoint(world, first.vertices[id]!)
        const before = transformPoint(world, point)
        expect(after[0] - before[0]).toBeCloseTo(delta[12], 11)
        expect(after[1]).toBeCloseTo(before[1], 11)
        expect(after[2]).toBeCloseTo(before[2], 11)
      }
    }
    delta[12] = 0.5
    expect(f.gesture.preview(delta)).toBe(true)
    expect(f.editor.getState().asset.geometries.at(-1)!.id).toBe(first.id)
    expect(f.gesture.end(true)).toBe(true)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.editor.getState().dispose()
  }
})

test('world-space face movement/rotation/scale preserves parent shear, local seams and unselected geometry users', () => {
  const f = setup()
  try {
    const faces = ['px', 'py']
    const selected = verticesOfMeshFaces(f.mesh, faces)
    const world = indexSceneDocument(f.source).scene.worldMatrices.get('body')!
    const delta = composeTransform({
      kind: 'trs',
      translation: [0.23456789, -1.75, 0.3],
      rotation: quaternionFromEulerXYZ([15, 30, 60]),
      scale: [1.3, 0.8, 1.1],
    })
    expect(f.gesture.begin({ nodeId: 'body', mode: 'face', ids: faces }, f.mesh)).toBe(true)
    expect(f.gesture.preview(identityMatrix())).toBe(true)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.gesture.preview(delta)).toBe(true)
    const result = f.editor.getState().asset
    const mesh = result.geometries.at(-1)!
    if (mesh.kind !== 'mesh') throw new Error('Missing copied geometry')
    expect(mesh.faces).toBe(f.mesh.faces)
    expect(result.geometries.find((g) => g.id === f.mesh.id)).toBe(f.mesh)
    expect(result.nodes.map((n) => n.transform)).toEqual(f.source.nodes.map((n) => n.transform))
    for (const [id, p] of Object.entries(f.mesh.vertices)) {
      if (!selected.includes(id)) {
        expect(mesh.vertices[id]).toBe(p)
        continue
      }
      const expected = transformPoint(delta, transformPoint(world, p))
      const actual = transformPoint(world, mesh.vertices[id]!)
      actual.forEach((value, axis) => {
        expect(value).toBeCloseTo(expected[axis]!, 10)
      })
    }
    expect(readSceneDocument(sceneToJson(result)).status).toBe('valid')
    expect(f.gesture.end(true)).toBe(true)
    f.editor.getState().undo()
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.editor.getState().dispose()
  }
})

test('face transforms reject singular parents, inherited locks, changed source and perspective deltas; cancel is exact', () => {
  const f = setup()
  try {
    expect(f.gesture.begin({ nodeId: 'body', mode: 'face', ids: [] }, f.mesh)).toBe(false)
    f.gesture.begin({ nodeId: 'body', mode: 'face', ids: ['px'] }, f.mesh)
    const delta = identityMatrix()
    delta[12] = 4
    f.gesture.preview(delta)
    f.gesture.cancel()
    expect(f.editor.getState().asset).toBe(f.source)
    f.gesture.begin({ nodeId: 'body', mode: 'face', ids: ['px'] }, f.mesh)
    delta[3] = 1
    expect(f.gesture.preview(delta)).toBe(false)
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.gesture.begin({ nodeId: 'body', mode: 'face', ids: ['px'] }, { ...f.mesh })).toBe(
      false,
    )
    f.editor.getState().commit(setSceneNodeFlag(f.source, ['group'], 'locked', true))
    expect(f.gesture.begin({ nodeId: 'body', mode: 'face', ids: ['px'] }, f.mesh)).toBe(false)
    const singular = identityMatrix()
    singular[0] = 0
    f.editor.getState().commit(transformSceneNodes(f.source, ['group'], singular))
    expect(f.gesture.begin({ nodeId: 'body', mode: 'face', ids: ['px'] }, f.mesh)).toBe(false)
    expect(f.errors).toHaveLength(4)
  } finally {
    f.editor.getState().dispose()
  }
})
