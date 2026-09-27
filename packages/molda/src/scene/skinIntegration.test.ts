import { expect, test } from 'bun:test'
import { readMoldaDocument } from '../core/documentReader'
import { structuredBytes } from '../core/structuredBytes'
import { encodeSceneGlb } from '../export/sceneGlb'
import { SceneGlbLossError } from '../export/sceneGlbReport'
import { MoldaStorageBudgetError } from '../state/guardedWrite'
import { createSceneEditorStore } from '../state/sceneEditorStore'
import { createScenePersistence } from '../state/scenePersistence'
import { readGlb } from '../testing/glbRead'
import { nativeDatabase } from '../testing/nativeDatabase'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { allocateSceneId } from './commandContext'
import {
  deleteSceneNodes,
  duplicateSceneNodes,
  editSceneMesh,
  moveScenePivot,
  setSceneNodeFlag,
  transformSceneNodes,
  ungroupSceneNodes,
} from './commands'
import { indexSceneDocument } from './documentIndex'
import { sceneToJson } from './documentJson'
import { identityMatrix } from './matrix'
import { readSceneDocument } from './readDocument'
import { bindSceneSkin } from './skinBinding'
import {
  createSceneSkin,
  rebindSceneSkin,
  removeSceneSkin,
  renameSceneSkin,
  setSceneSkinWeights,
} from './skinCommands'
import { deformSceneSkin, prepareSceneSkin } from './skinPose'

function fixture() {
  const {
    document,
    input: { id, ...input },
  } = makeSceneSkinFixture()
  return { source: document, input, bound: createSceneSkin(document, input, () => id) }
}

test('native reader retains owned weights and inverse binds without enabling public v2 reads', () => {
  const { source, bound } = fixture(),
    original = structuredClone(bound)
  const raw = JSON.parse(JSON.stringify(sceneToJson(bound))),
    read = readSceneDocument(raw)
  expect(read.status).toBe('valid')
  if (read.status !== 'valid') throw new Error('Expected valid skin document')
  expect(read.document).toEqual(bound)
  expect(read.document.skins![0]!.weights.v_0_0 === raw.skins[0].weights.v_0_0).toBe(false)
  expect(
    read.document.skins![0]!.joints[0]!.inverseBindMatrix ===
      raw.skins[0].joints[0].inverseBindMatrix,
  ).toBe(false)
  expect(readMoldaDocument(raw)).toEqual({ status: 'unsupported', version: 2, raw })
  const absent = readSceneDocument(source),
    empty = readSceneDocument({ ...source, skins: [] })
  expect(absent.status === 'valid' && Object.hasOwn(absent.document, 'skins')).toBe(false)
  expect(empty.status === 'valid' && empty.document.skins).toEqual([])
  const index = indexSceneDocument(bound)
  expect(index.skinVertexCount).toBe(4)
  expect(index.skinsByNode.get('part-0')).toBe(bound.skins![0])
  expect([...index.skinJointNodes]).toEqual(['upper', 'lower'])
  expect(() => allocateSceneId(bound, () => 'skin')()).toThrow('identidade')
  expect(readSceneDocument({ ...bound, skins: [bound.skins![0], bound.skins![0]] }).status).toBe(
    'invalid',
  )
  const invalid = structuredClone(bound)
  invalid.skins![0]!.joints[0]!.nodeId = 'missing'
  const refused = readSceneDocument(invalid)
  expect(refused.status).toBe('invalid')
  expect(refused.status !== 'valid' && refused.raw === invalid).toBe(true)
  expect(bound).toEqual(original)
})

test('weight commands are atomic copy-on-write, normalize only on request, and rebind only explicitly', () => {
  const { source, input, bound } = fixture(),
    original = structuredClone(bound),
    skin = bound.skins![0]!
  expect(source.skins).toBeUndefined()
  expect(bound.geometries).toBe(source.geometries)
  expect(bound.images).toBe(source.images)
  expect(skin.weights).not.toBe(input.weights)
  expect(() => createSceneSkin(bound, input)).toThrow('já tem')
  expect(() => createSceneSkin(source, { ...input, id: 'hidden' } as typeof input)).toThrow(
    'Campo desconhecido',
  )
  const patch = {
    v_0_0: [
      { jointId: 'upper', weight: 2 },
      { jointId: 'lower', weight: 6 },
    ],
  }
  expect(() => setSceneSkinWeights(bound, 'skin', patch)).toThrow('Normalizar')
  const changed = setSceneSkinWeights(bound, 'skin', patch, { normalize: true }),
    next = changed.skins![0]!
  expect(next.weights.v_0_0).toEqual([
    { jointId: 'upper', weight: 0.25 },
    { jointId: 'lower', weight: 0.75 },
  ])
  expect(next.weights.v_1_0).toBe(skin.weights.v_1_0)
  expect(next.joints).toBe(skin.joints)
  expect(changed.nodes).toBe(bound.nodes)
  expect(changed.geometries).toBe(bound.geometries)
  expect(patch.v_0_0[0]!.weight).toBe(2)
  expect(setSceneSkinWeights(changed, 'skin', { v_0_0: next.weights.v_0_0! })).toBe(changed)
  expect(setSceneSkinWeights(changed, 'skin', {})).toBe(changed)
  expect(() =>
    setSceneSkinWeights(bound, 'skin', {
      v_0_0: [{ jointId: 'upper', weight: 1 }],
      v_1_0: [{ jointId: 'absent', weight: 1 }],
    }),
  ).toThrow('fora do vínculo')
  expect(() => setSceneSkinWeights(bound, 'skin', { absent: patch.v_0_0 })).toThrow('ponto ausente')
  expect(() =>
    setSceneSkinWeights(bound, 'skin', patch, { normalize: true, hidden: true } as {
      normalize: boolean
    }),
  ).toThrow('Campo desconhecido')
  expect(rebindSceneSkin(bound, 'skin')).toBe(bound)
  expect(renameSceneSkin(bound, 'skin', skin.name)).toBe(bound)
  const renamed = renameSceneSkin(bound, 'skin', 'Novo vínculo')
  expect(renamed.skins![0]!.weights).toBe(skin.weights)
  const delta = identityMatrix()
  delta[12] = 0.37
  const posed = transformSceneNodes(bound, ['lower'], delta)
  expect(posed.skins).toBe(bound.skins)
  const rebound = rebindSceneSkin(posed, 'skin')
  expect(rebound.skins![0]!.weights).toBe(skin.weights)
  expect(rebound.skins![0]!.joints[0]).toBe(skin.joints[0])
  expect(rebound.skins![0]!.joints[1]).not.toEqual(skin.joints[1])
  const prepared = prepareSceneSkin(rebound, rebound.skins![0]!),
    positions = deformSceneSkin(prepared, indexSceneDocument(rebound).scene.worldMatrices)
  for (let i = 0; i < positions.length; i++)
    expect(positions[i]!).toBeCloseTo(prepared.positions[i]!, 12)
  expect(removeSceneSkin(bound, 'skin').skins).toEqual([])
  expect(bound).toEqual(original)
})

test('inherited mesh locks protect bindings while locked referenced joints remain untouched', () => {
  const { source, input, bound } = fixture(),
    locked = setSceneNodeFlag(bound, ['rig'], 'locked', true)
  for (const command of [
    () => removeSceneSkin(locked, 'skin'),
    () => renameSceneSkin(locked, 'skin', 'Outro'),
    () => rebindSceneSkin(locked, 'skin'),
    () => setSceneSkinWeights(locked, 'skin', {}),
  ])
    expect(command).toThrow('Destrave')
  expect(() => createSceneSkin(setSceneNodeFlag(source, ['rig'], 'locked', true), input)).toThrow(
    'Destrave',
  )
  const jointLocked = setSceneNodeFlag(source, ['upper'], 'locked', true),
    created = createSceneSkin(jointLocked, input, () => 'skin')
  expect(created.nodes).toBe(jointLocked.nodes)
  expect(removeSceneSkin(created, 'skin').nodes).toBe(jointLocked.nodes)
})

test('whole and partial rig duplication remap owned weights without changing the rest deformation', () => {
  const { bound } = fixture(),
    original = structuredClone(bound)
  for (const selection of [['rig'], ['part-0'], ['part-0', 'upper']]) {
    let n = 0
    const copied = duplicateSceneNodes(bound, selection, () => `copy-${++n}`),
      skin = copied.skins![1]!
    expect(copied.skins![0]).toBe(bound.skins![0])
    expect(skin.weights.v_0_0).not.toBe(bound.skins![0]!.weights.v_0_0)
    expect(skin.joints[0]!.inverseBindMatrix).not.toBe(
      bound.skins![0]!.joints[0]!.inverseBindMatrix,
    )
    expect(skin.joints[0]!.nodeId === 'upper').toBe(
      selection.length === 1 && selection[0] === 'part-0',
    )
    const prepared = prepareSceneSkin(copied, skin),
      positions = deformSceneSkin(prepared, indexSceneDocument(copied).scene.worldMatrices)
    for (let i = 0; i < positions.length; i++)
      expect(positions[i]!).toBeCloseTo(prepared.positions[i]!, 12)
    expect(readSceneDocument(copied).status).toBe('valid')
  }
  let n = 0
  expect(duplicateSceneNodes(bound, ['upper'], () => `bone-${++n}`).skins).toBe(bound.skins)
  expect(bound).toEqual(original)
})

test('deleting bound meshes removes only their bindings; removing used joints or changing pivots/topology refuses', () => {
  const { bound } = fixture(),
    original = structuredClone(bound)
  expect(deleteSceneNodes(bound, ['part-0']).skins).toEqual([])
  expect(deleteSceneNodes(bound, ['rig']).skins).toEqual([])
  expect(() => deleteSceneNodes(bound, ['upper'])).toThrow('Desvincule')
  expect(() => ungroupSceneNodes(bound, ['upper'])).toThrow('Desvincule')
  for (const id of ['part-0', 'upper', 'lower'])
    expect(() => moveScenePivot(bound, id, [1, 0, 0])).toThrow('pivô')
  expect(moveScenePivot(bound, 'part-0', [0, 0, 0])).toBe(bound)
  expect(readSceneDocument(moveScenePivot(bound, 'rig', [1, 0, 0])).status).toBe('valid')
  expect(() =>
    editSceneMesh(bound, 'part-0', (mesh) => ({
      ...mesh,
      vertices: { ...mesh.vertices, extra: [0, 0, 0] },
    })),
  ).toThrow('topologia')
  const edited = editSceneMesh(bound, 'part-0', (mesh) => ({
    ...mesh,
    vertices: { ...mesh.vertices, v_0_0: [0.1, 0, 0] },
  }))
  expect(edited.skins).toBe(bound.skins)
  const singular = identityMatrix()
  singular[0] = 0
  expect(() => transformSceneNodes(bound, ['part-0'], singular)).toThrow('invertida')
  expect(readSceneDocument(transformSceneNodes(bound, ['lower'], singular)).status).toBe('valid')
  expect(bound).toEqual(original)
})

test('two meshes sharing geometry have independent weights and deleting one retains the other binding', () => {
  const { source, input } = fixture(),
    shared = { ...source, nodes: [...source.nodes, { ...source.nodes[0]!, id: 'other' }] }
  const a = createSceneSkin(shared, input, () => 'skin-a'),
    both = createSceneSkin(a, { ...input, nodeId: 'other' }, () => 'skin-b')
  const changed = setSceneSkinWeights(both, 'skin-a', { v_0_0: [{ jointId: 'upper', weight: 1 }] })
  expect(changed.geometries).toBe(shared.geometries)
  expect(changed.skins![1]).toBe(both.skins![1])
  const removed = deleteSceneNodes(changed, ['part-0'])
  expect(removed.skins).toEqual([both.skins![1]!])
  expect(removed.geometries).toEqual(shared.geometries)
})

test('native storage includes skin byte costs, owns save/read data, and retains a single undo/redo with CAS', async () => {
  const db = await nativeDatabase(),
    persistence = createScenePersistence(db.store),
    { bound } = fixture(),
    expected = structuredClone(bound)
  try {
    const save = persistence.save(bound, null)
    bound.skins![0]!.joints[0]!.inverseBindMatrix[12] = 99
    bound.skins![0]!.weights.v_0_0![0]!.weight = 99
    expect(await save).toEqual({ status: 'saved', revision: 1 })
    const read = await persistence.read(bound.id)
    if (read.status !== 'active') throw new Error('Expected active skin document')
    expect(read.document).toEqual(expected)
    expect(read.summary.bytes).toBe(structuredBytes(expected))
    const editor = createSceneEditorStore(read.document, 1, persistence, { autosaveMs: 60_000 })
    try {
      editor.getState().commit(removeSceneSkin(editor.getState().asset, 'skin'))
      await editor.getState().flush()
      editor.getState().undo()
      expect(editor.getState().asset.skins).toEqual(expected.skins)
      expect(editor.getState().canUndo).toBe(false)
      await editor.getState().flush()
      const reopened = await persistence.read(bound.id)
      if (reopened.status !== 'active') throw new Error('Expected persisted undo')
      expect(reopened.document.skins).toEqual(expected.skins)
      reopened.document.skins![0]!.weights.v_0_0![0]!.weight = 100
      expect(await persistence.read(bound.id)).toMatchObject({
        status: 'active',
        document: { skins: expected.skins },
      })
      expect(await persistence.save(expected, 1)).toEqual({ status: 'conflict' })
      editor.getState().redo()
      expect(editor.getState().asset.skins).toEqual([])
    } finally {
      editor.getState().dispose()
    }
  } finally {
    db.close()
  }
})

test('internal GLB exports bindings with explicit conversion consent and keeps unbound output unchanged', () => {
  const { source, bound } = fixture(),
    before = structuredClone(bound)
  expect(() => encodeSceneGlb(bound)).toThrow(SceneGlbLossError)
  const exported = encodeSceneGlb(bound, { allowLosses: true })
  expect(readGlb(exported.bytes).json.skins).toHaveLength(1)
  expect(encodeSceneGlb({ ...source, skins: [] }).bytes).toEqual(encodeSceneGlb(source).bytes)
  const invalid = { ...source, skins: [bindSceneSkin(source, makeSceneSkinFixture().input)] }
  invalid.skins[0]!.weights.v_0_0![0]!.weight = Number.NaN
  expect(readSceneDocument(invalid).status).toBe('invalid')
  expect(bound).toEqual(before)
})

test('bind, weights, pose capture and unlink each retain an exact undo/redo revision', async () => {
  const db = await nativeDatabase(),
    persistence = createScenePersistence(db.store),
    { source, input } = fixture()
  try {
    await persistence.save(source, null)
    const editor = createSceneEditorStore(source, 1, persistence, { autosaveMs: 60_000 })
    try {
      const revisions = [source],
        delta = identityMatrix()
      delta[12] = 0.125
      const commands = [
        () => createSceneSkin(editor.getState().asset, input, () => 'skin'),
        () =>
          setSceneSkinWeights(editor.getState().asset, 'skin', {
            v_0_0: [{ jointId: 'upper', weight: 1 }],
          }),
        () => transformSceneNodes(editor.getState().asset, ['lower'], delta),
        () => rebindSceneSkin(editor.getState().asset, 'skin'),
        () => removeSceneSkin(editor.getState().asset, 'skin'),
      ]
      for (const command of commands) {
        editor.getState().commit(command())
        revisions.push(editor.getState().asset)
      }
      for (let i = revisions.length - 2; i >= 0; i--) {
        editor.getState().undo()
        expect(editor.getState().asset.skins).toEqual(revisions[i]!.skins)
        expect(editor.getState().asset.nodes).toEqual(revisions[i]!.nodes)
      }
      expect(editor.getState().canUndo).toBe(false)
      for (const revision of revisions.slice(1)) {
        editor.getState().redo()
        expect(editor.getState().asset.skins).toEqual(revision.skins)
        expect(editor.getState().asset.nodes).toEqual(revision.nodes)
      }
      expect(editor.getState().canRedo).toBe(false)
    } finally {
      editor.getState().dispose()
    }
    const original = await db.dump(),
      quota = createScenePersistence(db.store, structuredBytes(source))
    await expect(
      quota.save(
        createSceneSkin(source, input, () => 'skin'),
        1,
      ),
    ).rejects.toBeInstanceOf(MoldaStorageBudgetError)
    expect(await db.dump()).toEqual(original)
  } finally {
    db.close()
  }
})
