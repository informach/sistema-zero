import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { convertSceneNodesToMesh, editSceneMesh, setSceneNodeFlag } from './commands'
import { sceneToJson } from './documentJson'
import { prepareMeshRemoval } from './meshRemoval'
import { meshEdgeKey } from './meshTopology'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'
import { readSceneGeometry } from './readGeometry'

test('point removal reports exact incident faces/loose edges and preserves every surviving authorial reference', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.looseEdges = [
    ['v_0_0', 'v_1_1'],
    ['v_1_1', 'v_2_2'],
    ['v_0_1', 'v_0_2'],
  ]
  mesh.vertices = { ...mesh.vertices, ['__proto__']: [1.23456789123, 3, 4] }
  const before = structuredClone(mesh)
  const removal = prepareMeshRemoval(mesh, { mode: 'vertex', ids: ['v_1_1', 'v_1_1'] })
  expect([removal.points, removal.faces, removal.looseEdges]).toEqual([1, 4, 2])
  expect(mesh).toEqual(before)
  const result = removal.apply()
  expect(Object.keys(result.faces)).toHaveLength(0)
  expect(Object.hasOwn(result.vertices, 'v_1_1')).toBe(false)
  expect(result.vertices.__proto__).toBe(mesh.vertices.__proto__)
  expect(result.looseEdges).toEqual([mesh.looseEdges[2]!])
  expect(result.looseEdges[0]).toBe(mesh.looseEdges[2]!)
  expect(readSceneGeometry(result)).toEqual(result)
  expect(mesh).toEqual(before)
})

test('edge removal deletes its adjacent faces, never removes endpoints, and does not affect unrelated UV', () => {
  const mesh = makeSceneGridGeometry(2)
  mesh.looseEdges = [['v_1_0', 'v_1_1']]
  const removal = prepareMeshRemoval(mesh, { mode: 'edge', ids: [meshEdgeKey('v_1_0', 'v_1_1')] })
  expect([removal.points, removal.faces, removal.looseEdges]).toEqual([0, 2, 1])
  const result = removal.apply()
  expect(result.vertices).toBe(mesh.vertices)
  expect(Object.keys(result.faces)).toEqual(['f_0_1', 'f_1_1'])
  expect(result.faces.f_0_1).toBe(mesh.faces.f_0_1)
  expect(result.faces.f_1_1).toBe(mesh.faces.f_1_1)
  expect(result.looseEdges).toEqual([])
  expect(readSceneGeometry(result)).toEqual(result)
  expect(prepareMeshRemoval(mesh, { mode: 'edge', ids: [] }).apply()).toBe(mesh)
  expect(() => prepareMeshRemoval(mesh, { mode: 'vertex', ids: ['missing'] })).toThrow('não existe')
})

test('component removal respects copy-on-write, locks and a single undo without modifying source materials/images', () => {
  const source = convertSceneNodesToMesh(migrateLegacyModel(makeModel()).document, ['body'])
  const node = source.nodes.find((n) => n.id === 'body')!
  if (node.kind !== 'mesh') throw new Error('Missing mesh node')
  source.nodes.push({ ...node, id: 'shared' })
  const mesh = source.geometries.find((g) => g.id === node.geometryId)!
  if (mesh.kind !== 'mesh') throw new Error('Missing mesh')
  const plan = prepareMeshRemoval(mesh, { mode: 'vertex', ids: [Object.keys(mesh.vertices)[0]!] })
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  try {
    expect(() =>
      editSceneMesh(setSceneNodeFlag(source, ['body'], 'locked', true), 'body', () => plan.apply()),
    ).toThrow()
    const next = editSceneMesh(
      source,
      'body',
      () => plan.apply(),
      () => 'copy',
    )
    expect(next.geometries.find((g) => g.id === mesh.id)).toBe(mesh)
    expect(next.images).toBe(source.images)
    expect(next.materials).toBe(source.materials)
    expect(next.nodes.find((n) => n.id === 'shared')).toBe(
      source.nodes.find((n) => n.id === 'shared'),
    )
    expect(readSceneDocument(sceneToJson(next)).status).toBe('valid')
    editor.getState().commit(next)
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(source.geometries)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    editor.getState().dispose()
  }
})
