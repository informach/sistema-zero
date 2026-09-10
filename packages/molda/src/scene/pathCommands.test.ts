import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import { sceneAnimationClip } from '../testing/sceneAnimation'
import { sceneBounds } from './bounds'
import {
  convertSceneNodesToMesh,
  duplicateSceneNodes,
  moveScenePivot,
  setSceneNodeFlag,
} from './commands'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { buildSceneGeometry } from './geometry'
import { transformPoint } from './matrix'
import { meshEdgeKey } from './meshTopology'
import { migrateLegacyModel } from './migrateLegacy'
import { createScenePath, editScenePath, meshPathPoints } from './pathCommands'
import { pathMesh } from './pathMesh'
import { readSceneDocument } from './readDocument'

const settings = { radius: 0.1, around: 8, endCaps: true }
const chosen = [meshEdgeKey('v_000', 'v_010'), meshEdgeKey('v_010', 'v_110')]

test('a selected loop is deterministic, stays parametric through save/edit and creates one undo entry', () => {
  const { document, mesh } = setup()
  const edges = [...chosen, meshEdgeKey('v_110', 'v_100'), meshEdgeKey('v_100', 'v_000')]
  expect(meshPathPoints(mesh, edges, true)).toEqual(
    meshPathPoints(mesh, [...edges].reverse(), true),
  )
  const created = createScenePath(
    document,
    'body',
    edges,
    { ...settings, closed: true, endCaps: false },
    'Anel',
  )
  const node = created.nodes.at(-1)!
  const shape = created.geometries.at(-1)!
  expect(shape.kind === 'path' && shape.closed).toBe(true)
  expect(readSceneDocument(sceneToJson(created)).status).toBe('valid')
  const editor = createDocumentEditorStore({
    asset: document,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  try {
    editor.getState().commit(created)
    expect(buildSceneGeometry(shape).issues).toEqual([])
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(document.geometries)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    const opened = editScenePath(editor.getState().asset, node.id, { ...settings, closed: false })
    expect(
      opened.geometries.at(-1)?.kind === 'path' &&
        (opened.geometries.at(-1) as typeof shape & { closed: boolean }).closed,
    ).toBe(false)
    expect(readSceneDocument(sceneToJson(opened)).status).toBe('valid')
  } finally {
    editor.getState().dispose()
  }
})
test('a path copied from an animated piece receives independent matching movement tracks', () => {
  const { document } = setup()
  document.animations = [sceneAnimationClip()]
  const original = structuredClone(document)
  const created = createScenePath(document, 'body', chosen, settings, 'Tubo animado')
  const track = created.animations?.[0]?.tracks[1]
  expect(track?.nodeId).toBe(created.nodes.at(-1)?.id)
  expect(track?.keys).toEqual(document.animations[0]?.tracks[0]?.keys)
  expect(track?.keys[0]?.value).not.toBe(document.animations[0]?.tracks[0]?.keys[0]?.value)
  expect(readSceneDocument(created).status).toBe('valid')
  expect(document).toEqual(original)
})

function setup() {
  const document = convertSceneNodesToMesh(migrateLegacyModel(makeModel()).document, ['body'])
  const mesh = document.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
  return { document, mesh }
}

test('chain traversal is deterministic, owned and rejects gaps, forks, cycles and special-ID collisions', () => {
  const { mesh } = setup()
  const points = meshPathPoints(mesh, chosen)
  expect(points).toEqual(meshPathPoints(mesh, [...chosen].reverse()))
  expect(points.map((p) => p.id)).toEqual(['v_000', 'v_010', 'v_110'])
  expect(points[0]!.position).toEqual(mesh.vertices.v_000!)
  expect(points[0]!.position).not.toBe(mesh.vertices.v_000)
  for (const edges of [
    [],
    ['missing'],
    [...chosen, meshEdgeKey('v_010', 'v_011')],
    [chosen[0]!, meshEdgeKey('v_111', 'v_101')],
    [...chosen, meshEdgeKey('v_110', 'v_100'), meshEdgeKey('v_100', 'v_000')],
  ])
    expect(() => meshPathPoints(mesh, edges)).toThrow()
  const lines = {
    ...mesh,
    vertices: {
      ['__proto__']: [0, 0, 0] as [number, number, number],
      constructor: [0, 1, 0] as [number, number, number],
    },
    faces: {},
    looseEdges: [['__proto__', 'constructor'] as [string, string]],
  }
  expect(meshPathPoints(lines, [meshEdgeKey('__proto__', 'constructor')]).map((p) => p.id)).toEqual(
    ['__proto__', 'constructor'],
  )
})

test('creating and editing a parametric tube preserve the source, follow transforms and survive JSON/undo/conversion', () => {
  const { document } = setup()
  const original = structuredClone(document)
  const created = createScenePath(document, 'body', chosen, settings, 'Alça')
  const node = created.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Missing path node')
  const geometry = created.geometries.at(-1)!
  if (geometry.kind !== 'path') throw new Error('Missing path')
  expect(created.nodes[0]).toBe(document.nodes[0])
  expect(node.transform).toBe(document.nodes[0]!.transform)
  expect(created.geometries[0]).toBe(document.geometries[0])
  expect(created.materials).toBe(document.materials)
  expect(created.images).toBe(document.images)
  const edited = editScenePath(created, node.id, { ...settings, radius: 0.2, around: 12 })
  const path = edited.geometries.at(-1)!
  if (path.kind !== 'path') throw new Error('Missing path')
  expect(path.points).toBe(geometry.points)
  expect(editScenePath(edited, node.id, { radius: 0.2, around: 12, endCaps: true })).toBe(edited)
  const pointEdit = editScenePath(edited, node.id, {
    point: path.points[1]!.id,
    position: [0.3, 1.4, 0.2],
  })
  const changed = pointEdit.geometries.at(-1)!
  if (changed.kind !== 'path') throw new Error('Missing path')
  expect(changed.points[0]).toBe(path.points[0])
  expect(changed.points[1]!.id).toBe(path.points[1]!.id)
  expect(changed.points[1]!.position).toEqual([0.3, 1.4, 0.2])
  expect(readSceneDocument(sceneToJson(pointEdit)).status).toBe('valid')
  const editor = createDocumentEditorStore({
    asset: document,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60000,
  })
  try {
    editor.getState().commit(created)
    editor.getState().commit(pointEdit)
    const converted = convertSceneNodesToMesh(pointEdit, [node.id])
    expect(buildSceneGeometry(converted.geometries.at(-1)!).positions).toEqual(
      buildSceneGeometry(changed).positions,
    )
    editor.getState().commit(converted)
    editor.getState().undo()
    expect(editor.getState().asset.geometries.at(-1)!.kind).toBe('path')
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(created.geometries)
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(document.geometries)
  } finally {
    editor.getState().dispose()
  }
  expect(document).toEqual(original)
  const pivoted = moveScenePivot(created, node.id, [0.13, 0.27, 0.49])
  const oldWorld = indexSceneDocument(created).scene.worldMatrices.get(node.id)!
  const newWorld = indexSceneDocument(pivoted).scene.worldMatrices.get(node.id)!
  const moved = pivoted.geometries.at(-1)!
  if (moved.kind !== 'path') throw new Error('Missing path')
  const oldVertices = pathMesh(geometry).mesh.vertices
  const newVertices = pathMesh(moved).mesh.vertices
  for (const [id, point] of Object.entries(oldVertices)) {
    const a = transformPoint(oldWorld, point),
      b = transformPoint(newWorld, newVertices[id]!)
    for (let axis = 0; axis < 3; axis++) expect(b[axis]).toBeCloseTo(a[axis]!, 12)
  }
  const bounds = sceneBounds(indexSceneDocument(created), { nodeIds: new Set([node.id]) })!
  for (const point of Object.values(oldVertices)) {
    const world = transformPoint(oldWorld, point)
    for (let axis = 0; axis < 3; axis++)
      expect(world[axis]! >= bounds.min[axis]! && world[axis]! <= bounds.max[axis]!).toBe(true)
  }
})

test('shared paths isolate changes, duplication owns points and painted bindings, and locks/budgets reject atomically', () => {
  const { document } = setup()
  const created = createScenePath(document, 'body', chosen, settings, 'Tubo')
  const node = created.nodes.at(-1)!
  if (node.kind !== 'mesh') throw new Error('Missing node')
  const shared = { ...created, nodes: [...created.nodes, { ...node, id: 'shared' }] }
  const changed = editScenePath(shared, node.id, { ...settings, radius: 0.3 })
  expect(changed.geometries).toHaveLength(shared.geometries.length + 1)
  expect(changed.geometries.at(-2)).toBe(shared.geometries.at(-1))
  expect(changed.nodes.at(-1)).toBe(shared.nodes.at(-1))
  const duplicate = duplicateSceneNodes(created, [node.id])
  const path = created.geometries.at(-1)!,
    copy = duplicate.geometries.at(-1)!
  if (path.kind !== 'path' || copy.kind !== 'path') throw new Error('Missing paths')
  expect(copy.points).toEqual(path.points)
  expect(copy.points[0]!.position).not.toBe(path.points[0]!.position)
  expect(() =>
    editScenePath(setSceneNodeFlag(created, [node.id], 'locked', true), node.id, {
      ...settings,
      radius: 0.3,
    }),
  ).toThrow('Destrave')
  expect(() =>
    createScenePath(
      setSceneNodeFlag(document, ['body'], 'locked', true),
      'body',
      chosen,
      settings,
      'Tubo',
    ),
  ).toThrow('Destrave')
  expect(() => editScenePath(created, node.id, { point: 'missing', position: [0, 0, 0] })).toThrow()
  const heavy = {
    ...created,
    nodes: Array.from({ length: 128 }, (_, i) => ({ ...node, id: `n:${i}` })),
  }
  expect(indexSceneDocument(heavy).triangleCount).toBe(6144)
  expect(() => editScenePath(heavy, 'n:0', { ...settings, around: 64 })).not.toThrow()
  const manyMirrors = {
    ...created,
    nodes: [node],
    mirrors: Array.from({ length: 100 }, (_, i) => ({
      id: `m:${i}`,
      name: 'Espelho',
      sourceId: node.id,
      axis: 'x' as const,
      offset: i,
    })),
  }
  expect(() => editScenePath(manyMirrors, node.id, { ...settings, around: 64 })).toThrow(
    'orçamento',
  )
})
