import { describe, expect, test } from 'bun:test'
import { structuredBytes } from '../core/structuredBytes'
import { createDocumentEditorStore } from '../state/editorStore'
import { makeModel } from '../testing/fixtures'
import {
  addSceneBox,
  addSceneMirror,
  deleteSceneNodes,
  duplicateSceneNodes,
  groupSceneNodes,
  moveScenePivot,
  removeSceneMirrors,
  renameSceneNode,
  reparentSceneNodes,
  setSceneNodeFlag,
  transformSceneNodes,
  ungroupSceneNodes,
} from './commands'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { evaluateSceneInstances } from './evaluate'
import { identityMatrix, transformPoint } from './matrix'
import { migrateLegacyModel } from './migrateLegacy'
import { readSceneDocument } from './readDocument'

function fixture(): MoldaSceneDocument {
  return migrateLegacyModel(makeModel()).document
}

function ids() {
  let count = 0
  return () => `copy-${++count}`
}

function matrices(document: MoldaSceneDocument) {
  return indexSceneDocument(document).scene.worldMatrices
}

function expectWorldPreserved(before: MoldaSceneDocument, after: MoldaSceneDocument) {
  const oldWorlds = matrices(before)
  for (const [id, matrix] of matrices(after)) {
    const original = oldWorlds.get(id)
    if (!original) continue
    for (let i = 0; i < 16; i++) expect(matrix[i]).toBeCloseTo(original[i] ?? NaN, 9)
  }
}

function expectValid(document: MoldaSceneDocument) {
  const read = readSceneDocument(sceneToJson(document))
  expect(read.status).toBe('valid')
}

describe('scene authoring commands', () => {
  test('group/reparent/ungroup preserve world space, original references and nested selection', () => {
    const source = fixture()
    const original = structuredClone(source)
    const grouped = groupSceneNodes(source, ['wing', 'body'], { nextId: () => 'group' })
    expect(grouped.nodes.find((node) => node.id === 'body')?.parentId).toBe('group')
    expect(grouped.nodes.find((node) => node.id === 'wing')?.parentId).toBe('group')
    expect(grouped.images).toBe(source.images)
    expect(grouped.geometries).toBe(source.geometries)
    expectWorldPreserved(source, grouped)
    const nested = groupSceneNodes(grouped, ['group', 'body'], { nextId: () => 'outer' })
    expect(nested.nodes.find((node) => node.id === 'body')?.parentId).toBe('group')
    expectWorldPreserved(grouped, nested)
    const outside = reparentSceneNodes(nested, ['group', 'body'], null)
    expect(outside.nodes.find((node) => node.id === 'body')?.parentId).toBe('group')
    expectWorldPreserved(nested, outside)
    expect(reparentSceneNodes(outside, ['group'], null)).toBe(outside)
    const separated = ungroupSceneNodes(nested, ['group', 'outer'])
    expect(separated.nodes.map((node) => node.parentId)).toEqual([null, null])
    expectWorldPreserved(source, separated)
    expectValid(separated)
    expect(source).toEqual(original)
  })

  test('ungroup preserves hidden state and works below a singular surviving parent without inversion', () => {
    const grouped = groupSceneNodes(fixture(), ['body', 'wing'], { nextId: () => 'group' })
    const nested = groupSceneNodes(grouped, ['group'], { nextId: () => 'outer' })
    const outer = nested.nodes.find((node) => node.id === 'outer')
    if (outer?.transform.kind !== 'trs') throw new Error('Missing outer')
    outer.transform.scale = [0, -2, 0.5]
    const hidden = setSceneNodeFlag(nested, ['group'], 'hidden', true)
    const separated = ungroupSceneNodes(hidden, ['group'])
    expectWorldPreserved(hidden, separated)
    expect(separated.nodes.find((node) => node.id === 'body')?.hidden).toBe(true)
    expect(separated.nodes.find((node) => node.id === 'body')?.parentId).toBe('outer')
    expectValid(separated)
  })

  test('world transforms apply once to covered descendants and retain shear under a nonuniform parent', () => {
    const grouped = groupSceneNodes(fixture(), ['body', 'wing'], { nextId: () => 'group' })
    const group = grouped.nodes.find((node) => node.id === 'group')
    if (!group) throw new Error('Missing group')
    group.transform = {
      kind: 'affine',
      matrix: [1, 0, 0, 0, 0.4, -2, 0, 0, 0.3, 0, 0.5, 0, 3, 4, 5, 1],
    }
    const delta = identityMatrix()
    delta[12] = 2.345
    delta[13] = -4.567
    const moved = transformSceneNodes(grouped, ['body'], delta)
    const before = matrices(grouped).get('body')
    const after = matrices(moved).get('body')
    if (!before || !after) throw new Error('Missing matrices')
    expect(after[12]).toBeCloseTo(before[12] + 2.345, 10)
    expect(after[13]).toBeCloseTo(before[13] - 4.567, 10)
    expect(moved.nodes[1]).toBe(grouped.nodes[1])
    expect(moved.images).toBe(grouped.images)
    const all = transformSceneNodes(grouped, ['group', 'body'], delta)
    expect(matrices(all).get('body')?.[12]).toBeCloseTo(before[12] + 2.345, 10)
    expect(all.nodes[0]).toBe(grouped.nodes[0])
    expect(transformSceneNodes(grouped, ['group'], identityMatrix())).toBe(grouped)
    expectValid(all)
  })

  test('cyclic, singular and locked operations fail atomically, including locked descendants', () => {
    const source = groupSceneNodes(fixture(), ['body'], { nextId: () => 'group' })
    const original = structuredClone(source)
    expect(() => reparentSceneNodes(source, ['group'], 'body')).toThrow()
    const locked = setSceneNodeFlag(source, ['body'], 'locked', true)
    for (const operation of [
      () => groupSceneNodes(locked, ['group']),
      () => deleteSceneNodes(locked, ['group']),
      () => duplicateSceneNodes(locked, ['group']),
      () => moveScenePivot(locked, 'group', [1, 0, 0]),
      () => reparentSceneNodes(locked, ['group'], 'wing'),
    ])
      expect(operation).toThrow('Destrave')
    const group = source.nodes.find((node) => node.id === 'group')
    if (group?.transform.kind !== 'trs') throw new Error('Missing group')
    group.transform.scale = [0, 1, 1]
    expect(() => reparentSceneNodes(source, ['wing'], 'group')).toThrow()
    expect(() => groupSceneNodes(source, ['body'])).toThrow()
    group.transform.scale = [1, 1, 1]
    expect(source).toEqual(original)
    expect(() => groupSceneNodes(source, ['missing'])).toThrow()
    expect(() => groupSceneNodes(source, ['body'], { nextId: () => 'wing' })).toThrow()
  })

  test('pivot movement preserves painted world geometry, child world matrices and shared geometry ownership', () => {
    const source = fixture()
    const body = source.nodes[0]
    const wing = source.nodes[1]
    if (body?.kind !== 'mesh' || wing?.kind !== 'mesh') throw new Error('Missing meshes')
    wing.geometryId = body.geometryId
    source.nodes.push({
      id: 'point',
      kind: 'locator',
      name: 'Ponto',
      parentId: body.id,
      hidden: false,
      locked: false,
      transform: { kind: 'trs', translation: [1, 2, 3], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    })
    const original = structuredClone(source)
    const moved = moveScenePivot(
      source,
      body.id,
      [0.12345, -1.23456, 2.34567],
      () => 'geometry-copy',
    )
    const movedNode = moved.nodes[0]
    if (movedNode?.kind !== 'mesh') throw new Error('Missing moved node')
    expect(movedNode.geometryId).toBe('geometry-copy')
    expect(moved.nodes[1]).toBe(wing)
    const oldGeometry = source.geometries.find((geometry) => geometry.id === body.geometryId)
    const newGeometry = moved.geometries.find((geometry) => geometry.id === movedNode.geometryId)
    const before = matrices(source).get(body.id)
    const after = matrices(moved).get(body.id)
    if (
      !oldGeometry ||
      !newGeometry ||
      oldGeometry.kind === 'mesh' ||
      oldGeometry.kind === 'path' ||
      newGeometry.kind === 'mesh' ||
      newGeometry.kind === 'path' ||
      !before ||
      !after
    )
      throw new Error('Missing geometry')
    for (const key of ['from', 'to'] as const) {
      const a = transformPoint(before, oldGeometry[key])
      const b = transformPoint(after, newGeometry[key])
      for (let axis = 0; axis < 3; axis++) expect(b[axis]).toBeCloseTo(a[axis] ?? NaN, 10)
    }
    expect(newGeometry.surfaces).toBe(oldGeometry.surfaces)
    expect(moved.images).toBe(source.images)
    expect(matrices(moved).get('point')).toEqual(matrices(source).get('point'))
    expect(source).toEqual(original)
    expectValid(moved)
  })

  test('duplication remaps subtrees, face materials, shared images and mirrors without coupling to originals', () => {
    const source = groupSceneNodes(fixture(), ['body', 'wing'], { nextId: () => 'group' })
    const body = source.nodes[0]
    const wing = source.nodes[1]
    if (body?.kind !== 'mesh' || wing?.kind !== 'mesh') throw new Error('Missing mesh')
    wing.geometryId = body.geometryId
    const mirrored = addSceneMirror(source, 'body', {
      axis: 'z',
      offset: 1.25,
      nextId: () => 'mirror',
    })
    const original = structuredClone(mirrored)
    const copied = duplicateSceneNodes(mirrored, ['group', 'body'], ids())
    const addedNodes = copied.nodes.slice(source.nodes.length)
    const copiedBody = addedNodes.find((node) => node.name === body.name)
    const copiedWing = addedNodes.find((node) => node.name === wing.name)
    const copiedGroup = addedNodes.find((node) => node.kind === 'group')
    if (copiedBody?.kind !== 'mesh' || copiedWing?.kind !== 'mesh' || !copiedGroup)
      throw new Error('Missing copies')
    expect(addedNodes).toHaveLength(3)
    expect(copiedBody.parentId).toBe(copiedGroup.id)
    expect(copiedWing.geometryId).toBe(copiedBody.geometryId)
    expect(copiedBody.geometryId).not.toBe(body.geometryId)
    expect(copied.geometries).toHaveLength(source.geometries.length + 1)
    expect(copied.images).toHaveLength(source.images.length + 1)
    expect(copied.mirrors[1]?.sourceId).toBe(copiedBody.id)
    const geometry = copied.geometries.find((entry) => entry.id === copiedBody.geometryId)
    if (!geometry || geometry.kind === 'mesh') throw new Error('Missing copied geometry')
    const material = copied.materials.find((entry) => entry.id === geometry.surfaces.py?.materialId)
    const image = copied.images.find((entry) => entry.id === material?.colorImageId)
    const layer = image?.layers[0]
    if (!layer) throw new Error('Missing copied paint')
    layer.pixels[0] = 12
    expect(mirrored).toEqual(original)
    expect(copied.nodes[0]).toBe(mirrored.nodes[0])
    expectValid(copied)
    expect(() => duplicateSceneNodes(mirrored, ['group'], () => 'one-id')).toThrow()
  })

  test('delete removes complete subtrees and mirrors but retains authorial shared paint resources', () => {
    const source = groupSceneNodes(fixture(), ['body'], { nextId: () => 'group' })
    const mirrored = addSceneMirror(source, 'body', {
      axis: 'x',
      offset: 0,
      nextId: () => 'mirror',
    })
    const removed = deleteSceneNodes(mirrored, ['group', 'body'])
    expect(removed.nodes.map((node) => node.id)).toEqual(['wing'])
    expect(removed.mirrors).toHaveLength(0)
    const body = source.nodes.find((node) => node.id === 'body')
    if (body?.kind !== 'mesh') throw new Error('Missing body')
    expect(removed.geometries).toEqual(
      source.geometries.filter((geometry) => geometry.id !== body.geometryId),
    )
    expect(removed.materials).toBe(source.materials)
    expect(removed.images).toBe(source.images)
    expectValid(removed)
  })

  test('creating and deleting more than the geometry budget does not exhaust an empty workshop', () => {
    let document = fixture()
    const nextId = ids()
    for (let iteration = 0; iteration < 140; iteration++) {
      document = addSceneBox(document, 'Caixa', nextId)
      const node = document.nodes.at(-1)
      if (!node) throw new Error('Missing created node')
      document = deleteSceneNodes(document, [node.id])
    }
    expect(document.nodes).toHaveLength(2)
    expect(document.geometries).toHaveLength(2)
    expectValid(document)
  })

  test('node flags, rename and mirror removal are explicit, preserve independent locks and return no-op identity', () => {
    const source = groupSceneNodes(fixture(), ['body'], { nextId: () => 'group' })
    const locked = setSceneNodeFlag(
      setSceneNodeFlag(source, ['body'], 'locked', true),
      ['group'],
      'locked',
      true,
    )
    const unlocked = setSceneNodeFlag(locked, ['group'], 'locked', false)
    expect(unlocked.nodes[0]?.locked).toBe(true)
    expect(() => renameSceneNode(unlocked, 'body', 'Novo')).toThrow()
    const named = renameSceneNode(unlocked, 'wing', ' Asa direita ')
    expect(named.nodes[1]?.name).toBe('Asa direita')
    expect(renameSceneNode(named, 'wing', 'Asa direita')).toBe(named)
    expect(setSceneNodeFlag(named, ['wing'], 'hidden', false)).toBe(named)
    expect(() => renameSceneNode(named, 'wing', '  ')).toThrow()
    const mirrored = addSceneMirror(source, 'body', {
      axis: 'y',
      offset: 0.5,
      nextId: () => 'mirror',
    })
    expect(
      evaluateSceneInstances(indexSceneDocument(mirrored)).find((entry) => entry.id === 'mirror')
        ?.orientation,
    ).toBe(-1)
    expect(removeSceneMirrors(mirrored, ['mirror']).mirrors).toEqual([])
    expect(() => removeSceneMirrors(mirrored, ['unknown'])).toThrow()
  })

  test('budget and numerical overflow refuse the whole change', () => {
    const source = fixture()
    const first = source.nodes[0]
    if (!first) throw new Error('Missing mesh')
    source.nodes = Array.from({ length: 128 }, (_, i) => ({ ...first, id: `node-${i}` }))
    const original = structuredClone(source)
    expect(() => duplicateSceneNodes(source, ['node-0'])).toThrow('orçamento')
    expect(() => addSceneMirror(source, 'node-0', { axis: 'x', offset: 0 })).toThrow('orçamento')
    const delta = identityMatrix()
    delta[0] = Number.MAX_VALUE
    expect(() => transformSceneNodes(source, ['node-0'], delta)).toThrow()
    expect(source).toEqual(original)
  })

  test('a compound command commits and undoes as one real history entry', () => {
    const source = fixture()
    const editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
    try {
      const grouped = groupSceneNodes(source, ['body', 'wing'], { nextId: () => 'group' })
      editor.getState().commit(grouped)
      expect(editor.getState().asset.nodes).toEqual(grouped.nodes)
      editor.getState().undo()
      expect(editor.getState().asset.nodes).toEqual(source.nodes)
      expect(editor.getState().canUndo).toBe(false)
      editor.getState().redo()
      expect(editor.getState().asset.nodes).toEqual(grouped.nodes)
    } finally {
      editor.getState().dispose()
    }
  })
})
