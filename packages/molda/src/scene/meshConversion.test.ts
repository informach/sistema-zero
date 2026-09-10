import { expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import { convertSceneNodesToMesh, groupSceneNodes, setSceneNodeFlag } from './commands'
import type { MoldaSceneDocument, SceneMeshGeometry } from './document'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

function fixture() {
  return migrateLegacyModel(makeModel()).document
}

test('conversion of nested selection is one undo and retains transforms, paint and mirrors', () => {
  const source = groupSceneNodes(fixture(), ['body', 'wing'], { nextId: () => 'group' })
  const original = structuredClone(source)
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  try {
    const next = convertSceneNodesToMesh(source, ['group', 'body'])
    expect(next.geometries.every((g) => g.kind === 'mesh')).toBe(true)
    expect(next.nodes).toEqual(source.nodes)
    expect(next.images).toBe(source.images)
    expect(next.materials).toBe(source.materials)
    expect(next.mirrors).toBe(source.mirrors)
    expect(indexSceneDocument(next).scene.worldMatrices).toEqual(
      indexSceneDocument(source).scene.worldMatrices,
    )
    const read = readSceneDocument(sceneToJson(next))
    expect(read.status).toBe('valid')
    if (read.status !== 'valid') throw new Error(read.status)
    expect(read.document).toEqual(next)
    editor.getState().commit(next)
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(source.geometries)
    expect(editor.getState().canUndo).toBe(false)
    editor.getState().redo()
    expect(editor.getState().asset.geometries).toEqual(next.geometries)
    expect(convertSceneNodesToMesh(next, ['group'])).toBe(next)
    expect(() =>
      convertSceneNodesToMesh(setSceneNodeFlag(source, ['wing'], 'locked', true), ['group']),
    ).toThrow()
    expect(() => convertSceneNodesToMesh(source, ['missing'])).toThrow()
    expect(source).toEqual(original)
  } finally {
    editor.getState().dispose()
  }
})

test('copy-on-write protects unselected geometry users and keeps sharing inside the selection', () => {
  const source = fixture()
  const body = source.nodes.find((n) => n.id === 'body')
  if (body?.kind !== 'mesh') throw new Error('Missing mesh')
  source.nodes.push({ ...body, id: 'shared-one' }, { ...body, id: 'shared-two' })
  let ids = 0
  const next = convertSceneNodesToMesh(source, ['body', 'shared-one'], () => `new-${++ids}`)
  expect(ids).toBe(1)
  expect(next.geometries.find((g) => g.id === body.geometryId)).toBe(
    source.geometries.find((g) => g.id === body.geometryId),
  )
  for (const node of next.nodes) {
    if (node.kind !== 'mesh') continue
    if (node.id === 'body' || node.id === 'shared-one') expect(node.geometryId).toBe('new-1')
    if (node.id === 'shared-two') expect(node.geometryId).toBe(body.geometryId)
  }
  expect(readSceneDocument(sceneToJson(next)).status).toBe('valid')
  const all = convertSceneNodesToMesh(source, ['body', 'shared-one', 'shared-two'], () => {
    throw new Error('Unnecessary allocation')
  })
  expect(all.geometries).toHaveLength(source.geometries.length)
  expect(() => convertSceneNodesToMesh(source, ['body'], () => body.id)).toThrow()
})

test('copy-on-write respects authorial geometry budget including unreferenced resources', () => {
  const base = fixture()
  const body = base.nodes.find((n) => n.id === 'body')
  if (body?.kind !== 'mesh') throw new Error('Missing body')
  const geometry = base.geometries.find((g) => g.id === body.geometryId)
  if (!geometry) throw new Error('Missing geometry')
  const spare: SceneMeshGeometry = {
    id: 'spare',
    kind: 'mesh',
    vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0] },
    looseEdges: [],
    faces: Object.fromEntries(
      Array.from({ length: 19_980 }, (_, i) => [
        `f${i}`,
        {
          corners: [
            { vertexId: 'a', uv: [0, 0] },
            { vertexId: 'b', uv: [1, 0] },
            { vertexId: 'c', uv: [0, 1] },
          ],
        },
      ]),
    ),
  }
  const source: MoldaSceneDocument = {
    ...base,
    nodes: [body, { ...body, id: 'shared' }],
    geometries: [geometry, spare],
    mirrors: [],
  }
  expect(readSceneDocument(sceneToJson(source)).status).toBe('valid')
  expect(() => {
    convertSceneNodesToMesh(source, ['body'], () => 'converted')
  }).toThrow()
  expect(source.geometries).toHaveLength(2)
})
