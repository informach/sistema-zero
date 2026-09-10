import { describe, expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import { sceneBounds } from './bounds'
import {
  addSceneLocator,
  addScenePrimitive,
  deleteSceneNodes,
  resizeScenePrimitive,
  setSceneNodeFlag,
} from './commands'
import { indexSceneDocument } from './documentIndex'
import { buildSceneGeometry } from './geometry'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

describe('scene primitives and locators', () => {
  test('all forms render and resize with local origin and paint intact', () => {
    for (const kind of ['box', 'wedge', 'cylinder', 'sphere'] as const) {
      const source = migrateLegacyModel(makeModel()).document
      const added = addScenePrimitive(source, kind, kind)
      const node = added.nodes.at(-1)
      if (node?.kind !== 'mesh') throw new Error('Missing shape')
      const resized = resizeScenePrimitive(added, node.id, [1.25, 3.5, 4.75])
      expect(resized.nodes).toBe(added.nodes)
      expect(resized.images).toBe(source.images)
      expect(resized.materials).toBe(added.materials)
      const geometry = resized.geometries.at(-1)
      if (!geometry || geometry.kind === 'mesh' || geometry.kind === 'path')
        throw new Error('Missing primitive')
      expect(geometry.to.map((value, axis) => value - (geometry.from[axis] ?? NaN))).toEqual([
        1.25, 3.5, 4.75,
      ])
      expect(buildSceneGeometry(geometry).positions.length).toBeGreaterThan(0)
      expect(readSceneDocument(resized).status).toBe('valid')
      expect(resizeScenePrimitive(resized, node.id, [1.25, 3.5, 4.75])).toBe(resized)
    }
  })
  test('shared geometry is copy-on-write and deletion preserves remaining and orphan resources', () => {
    const source = migrateLegacyModel(makeModel()).document
    const body = source.nodes[0]
    const wing = source.nodes[1]
    if (body?.kind !== 'mesh' || wing?.kind !== 'mesh') throw new Error('Missing nodes')
    wing.geometryId = body.geometryId
    const resized = resizeScenePrimitive(source, 'body', [5, 6, 7], () => 'resized')
    expect(resized.nodes[1]).toBe(wing)
    expect(resized.geometries).toHaveLength(3)
    const geometry = source.geometries[0]
    expect(resized.geometries[0]).toBe(geometry)
    const deleted = deleteSceneNodes(source, ['body'])
    expect(deleted.geometries).toEqual(source.geometries)
    const editor = createDocumentEditorStore({
      asset: resized,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
      autosaveMs: 60_000,
    })
    editor.getState().commit(deleteSceneNodes(resized, ['body']))
    expect(editor.getState().asset.geometries).toHaveLength(2)
    editor.getState().undo()
    expect(editor.getState().asset.geometries).toEqual(resized.geometries)
    expect(editor.getState().asset.images).toEqual(source.images)
    editor.getState().dispose()
    expect(() =>
      resizeScenePrimitive(setSceneNodeFlag(source, ['body'], 'locked', true), 'body', [5, 6, 7]),
    ).toThrow()
    expect(() => resizeScenePrimitive(source, 'body', [Infinity, 1, 1])).toThrow()
    expect(() => resizeScenePrimitive(source, 'body', [0, 1, 1])).toThrow()
  })
  test('locators have a frameable origin without creating geometry or changing export bounds', () => {
    const source = migrateLegacyModel(makeModel()).document
    const added = addSceneLocator(source, 'Mão', () => 'hand')
    expect(added.geometries).toBe(source.geometries)
    const index = indexSceneDocument(added)
    expect(sceneBounds(index, { nodeIds: new Set(['hand']) })).toBeNull()
    expect(sceneBounds(index, { nodeIds: new Set(['hand']), includeLocators: true })).toEqual({
      min: [0, 0, 0],
      max: [0, 0, 0],
    })
    const hidden = setSceneNodeFlag(added, ['hand'], 'hidden', true)
    expect(
      sceneBounds(indexSceneDocument(hidden), {
        nodeIds: new Set(['hand']),
        includeLocators: true,
        includeHidden: false,
      }),
    ).toBeNull()
    expect(readSceneDocument(added).status).toBe('valid')
  })
})
