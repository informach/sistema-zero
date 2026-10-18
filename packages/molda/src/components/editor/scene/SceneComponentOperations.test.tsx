import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { type ReactNode, StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import type { MoldaToolAccess } from '../../../core/toolFamilies'
import { encodeSceneGlb } from '../../../export/sceneGlb'
import { addScenePrimitive, editSceneMesh } from '../../../scene/commands'
import { createSceneProject } from '../../../scene/createProject'
import { identityMatrix } from '../../../scene/matrix'
import { meshComponentEdges, meshComponentIds } from '../../../scene/meshComponents'
import { editMeshFaces } from '../../../scene/meshFaces'
import { indexMeshEdges, meshEdgeKey } from '../../../scene/meshTopology'
import { sceneGeometryMesh } from '../../../scene/parametricGeometry'
import { readSceneDocument } from '../../../scene/readDocument'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeSceneGridGeometry } from '../../../testing/sceneFixtures'
import { MoldaToolAccessProvider } from '../../toolAccess'
import { useSceneWorkshop } from './useSceneWorkshop'

function fixture(hole = false, access?: MoldaToolAccess, kind: 'box' | 'cylinder' = 'box') {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Operações' }),
    kind,
    'corpo',
  )
  const node = source.nodes[0]!
  if (node.kind !== 'mesh') throw new Error('Missing mesh')
  const initial = sceneGeometryMesh(source.geometries[0]!),
    opposite = Object.keys(initial.faces).find((id) =>
      initial.faces[id]!.corners.every((c) => initial.vertices[c.vertexId]![0] < 0),
    )!
  const faceId = Object.keys(initial.faces).find((id) =>
    initial.faces[id]!.corners.every((c) => initial.vertices[c.vertexId]![0] > 0),
  )!
  if (hole)
    source = editSceneMesh(source, node.id, (mesh) => editMeshFaces(mesh, [opposite], 'remove'))
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60000,
  })
  const view = renderHook(() => useSceneWorkshop(editor), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <StrictMode>
        <MoldaToolAccessProvider access={access}>{children}</MoldaToolAccessProvider>
      </StrictMode>
    ),
  })
  act(() => view.result.current.select(node.id, false))
  act(() => view.result.current.components.open('face', [faceId]))
  return {
    source,
    node,
    faceId,
    editor,
    view,
    close() {
      view.unmount()
      editor.getState().dispose()
    },
  }
}

test.each([
  'edge',
  'vertex',
] as const)('extruding a selected %s previews stable linked geometry, cancels and commits one undo', (mode) => {
  const f = fixture()
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    const chosen = meshComponentIds(mesh, mode)[0]!
    act(() => f.view.result.current.components.open(mode, [chosen]))
    act(() => expect(f.view.result.current.components.operation.start('extrude')).toBe(true))
    expect(f.view.result.current.components.operation.canConfirm).toBe(false)
    expect(f.view.result.current.components.transformTools).toEqual(['move'])
    const offset: [number, number, number] = [1, 2, 3]
    act(() => f.view.result.current.components.operation.configure({ kind: 'extrude', offset }))
    const preview = f.view.result.current.components.operation.document!
    const targets = f.view.result.current.components.operation.selection!
    expect(targets.mode).toBe(mode)
    expect(targets.ids).toHaveLength(1)
    expect(targets.ids).not.toContain(chosen)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    act(() =>
      f.view.result.current.components.operation.configure({ kind: 'extrude', offset: [2, 3, 4] }),
    )
    expect(f.view.result.current.components.operation.selection!.ids).toEqual(targets.ids)
    act(() => f.view.result.current.components.operation.cancel())
    expect(f.view.result.current.components.selection).toEqual({
      nodeId: f.node.id,
      mode,
      ids: [chosen],
    })
    expect(f.editor.getState().content).toBe(f.source)
    act(() => f.view.result.current.components.operation.start('extrude'))
    act(() => expect(f.view.result.current.components.transform.begin()).toBe(true))
    const delta = identityMatrix()
    delta[12] = 1
    delta[13] = 2
    delta[14] = 3
    act(() => expect(f.view.result.current.components.transform.preview(delta)).toBe(true))
    act(() => f.view.result.current.components.transform.end(true))
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    const changed = sceneGeometryMesh(f.editor.getState().content.geometries[0]!)
    expect(Object.keys(changed.faces)).toHaveLength(mode === 'edge' ? 7 : 6)
    expect(changed.looseEdges).toHaveLength(mode === 'vertex' ? 1 : 0)
    expect(f.view.result.current.components.selection?.mode).toBe(mode)
    expect(f.view.result.current.components.selection?.ids).not.toContain(chosen)
    expect(readSceneDocument(f.editor.getState().content).status).toBe('valid')
    expect(preview.nodes).toEqual(f.source.nodes)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
    act(() => f.view.result.current.redo())
    expect(f.editor.getState().content.geometries[0]).toEqual(changed)
  } finally {
    f.close()
  }
})

test('an extrusion preview cannot apply after its document changes or the window loses focus', () => {
  const f = fixture()
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    act(() =>
      f.view.result.current.components.open('vertex', [meshComponentIds(mesh, 'vertex')[0]!]),
    )
    act(() => f.view.result.current.components.operation.start('extrude'))
    act(() =>
      f.view.result.current.components.operation.configure({ kind: 'extrude', offset: [0, 1, 0] }),
    )
    const confirm = f.view.result.current.components.operation.confirm
    act(() => window.dispatchEvent(new Event('blur')))
    act(() => expect(confirm()).toBe(false))
    expect(f.editor.getState().content).toBe(f.source)
    act(() => f.view.result.current.components.operation.start('extrude'))
    act(() =>
      f.view.result.current.components.operation.configure({ kind: 'extrude', offset: [0, 1, 0] }),
    )
    const stale = f.view.result.current.components.operation.confirm
    const changed = addScenePrimitive(f.source, 'box', 'Outra peça')
    act(() => f.editor.getState().commit(changed))
    const committed = f.editor.getState().content
    act(() => expect(stale()).toBe(false))
    expect(f.editor.getState().content).toBe(committed)
    expect(committed.geometries).toEqual(changed.geometries)
  } finally {
    f.close()
  }
})

test('point extrusion uses the mesh permission without requiring advanced mesh tools', () => {
  const f = fixture(false, { allow: ['model.mesh'] })
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    act(() =>
      f.view.result.current.components.open('vertex', [meshComponentIds(mesh, 'vertex')[0]!]),
    )
    act(() => expect(f.view.result.current.components.operation.start('extrude')).toBe(true))
    act(() =>
      f.view.result.current.components.operation.configure({ kind: 'extrude', offset: [0, 1, 0] }),
    )
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    expect(sceneGeometryMesh(f.editor.getState().content.geometries[0]!).looseEdges).toHaveLength(1)
    act(() => expect(f.view.result.current.components.operation.start('duplicate')).toBe(false))
  } finally {
    f.close()
  }
})

test('creating a face from two border edges previews without saving, cancels, and selects a face ready to pull', () => {
  const f = fixture(true)
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    const border = [...indexMeshEdges(mesh).edges]
      .filter(([, incident]) => incident.length === 1)
      .map(([id]) => id)
    const opposite = border.filter((id) => {
      const [a, b] = meshComponentEdges(mesh).get(id)!
      return mesh.vertices[a]![1] === mesh.vertices[b]![1]
    })
    act(() => f.view.result.current.components.open('edge', opposite))
    act(() => expect(f.view.result.current.components.operation.start('create')).toBe(true))
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    const preview = sceneGeometryMesh(
      f.view.result.current.components.operation.document!.geometries[0]!,
    )
    expect(Object.keys(preview.faces)).toHaveLength(6)
    act(() => f.view.result.current.components.operation.cancel())
    expect(f.view.result.current.components.selection?.ids).toEqual(opposite)
    expect(f.editor.getState().content).toBe(f.source)
    act(() => f.view.result.current.components.operation.start('create'))
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    const created = f.editor.getState().content
    expect(f.view.result.current.components.selection?.mode).toBe('face')
    expect(f.view.result.current.components.selection?.ids).toHaveLength(1)
    act(() => f.view.result.current.components.beginPreview('extrude'))
    act(() => expect(f.view.result.current.components.preview.update(1)).toBe(true))
    act(() => f.view.result.current.components.preview.confirm())
    expect(
      Object.keys(sceneGeometryMesh(f.editor.getState().content.geometries[0]!).faces),
    ).toHaveLength(10)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(created.geometries)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('creating an edge from two points uses mesh access and selects the edge for further extrusion', () => {
  const f = fixture(false, { allow: ['model.mesh'] })
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    const corners = mesh.faces[f.faceId]!.corners
    const ids = [corners[0]!.vertexId, corners[2]!.vertexId]
    act(() => f.view.result.current.components.open('vertex', ids))
    act(() => expect(f.view.result.current.components.operation.start('create')).toBe(true))
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    expect(f.view.result.current.components.selection).toEqual({
      nodeId: f.node.id,
      mode: 'edge',
      ids: [meshEdgeKey(ids[0]!, ids[1]!)],
    })
    const result = sceneGeometryMesh(f.editor.getState().content.geometries[0]!)
    expect(result.faces).toBe(mesh.faces)
    expect(result.looseEdges).toHaveLength(1)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
  } finally {
    f.close()
  }
})

test('face creation can retarget an invalid selection without changing the saved document', () => {
  const f = fixture(true)
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    const border = [...indexMeshEdges(mesh).edges]
      .filter(([, incident]) => incident.length === 1)
      .map(([id]) => id)
    act(() => f.view.result.current.components.open('edge', [border[0]!]))
    act(() => f.view.result.current.components.operation.start('create'))
    expect(f.view.result.current.components.operation.canConfirm).toBe(false)
    expect(f.view.result.current.components.operation.error).toBeTruthy()
    act(() => f.view.result.current.components.selectMany(border, false))
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    act(() => f.view.result.current.components.operation.cancel())
    expect(f.view.result.current.components.selection?.ids).toEqual([border[0]!])
  } finally {
    f.close()
  }
})

test('face extrusion accepts the Move handles and confirms topology and movement together', () => {
  const f = fixture()
  try {
    act(() => f.view.result.current.components.beginPreview('extrude'))
    expect(f.view.result.current.components.transformTools).toEqual(['move'])
    act(() => expect(f.view.result.current.components.transform.begin()).toBe(true))
    const delta = identityMatrix()
    delta[12] = 2
    delta[13] = 1
    act(() => expect(f.view.result.current.components.transform.preview(delta)).toBe(true))
    act(() => f.view.result.current.components.transform.end(true))
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    const before = sceneGeometryMesh(f.source.geometries[0]!)
    const after = sceneGeometryMesh(f.editor.getState().asset.geometries[0]!)
    expect(Object.keys(after.faces)).toHaveLength(10)
    for (let i = 0; i < before.faces[f.faceId]!.corners.length; i++) {
      const original = before.vertices[before.faces[f.faceId]!.corners[i]!.vertexId]!
      const point = after.vertices[after.faces[f.faceId]!.corners[i]!.vertexId]!
      expect(point).toEqual([original[0] + 2, original[1] + 1, original[2]])
    }
    act(() => f.view.result.current.components.preview.confirm())
    const confirmed = f.editor.getState().content
    expect(Object.keys(sceneGeometryMesh(confirmed.geometries[0]!).faces)).toHaveLength(10)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('canceling an extrusion drag restores the previous amount and canceling the preview restores the source', () => {
  const f = fixture()
  try {
    act(() => f.view.result.current.components.beginPreview('extrude'))
    act(() => f.view.result.current.components.preview.update(0.5))
    const previous = f.editor.getState().asset.geometries
    act(() => f.view.result.current.components.transform.begin())
    const delta = identityMatrix()
    delta[13] = 0.5
    act(() => expect(f.view.result.current.components.transform.preview(delta)).toBe(true))
    expect(f.view.result.current.components.preview.amount).toBeCloseTo(Math.hypot(0.5, 0.5))
    act(() => f.view.result.current.components.transform.end(false))
    expect(f.view.result.current.components.preview.amount).toBe(0.5)
    expect(f.editor.getState().asset.geometries).toEqual(previous)
    act(() => f.view.result.current.components.preview.cancel())
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('region inset previews one border, cancels and confirms one undo with the inner cap still selected', () => {
  const f = fixture(false, undefined, 'cylinder')
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    const cap = Object.keys(mesh.faces).filter((id) => id.startsWith('top:'))
    act(() => f.view.result.current.components.open('face', cap))
    act(() => f.view.result.current.components.beginPreview('inset'))
    act(() => expect(f.view.result.current.components.preview.update(0.25)).toBe(true))
    const first = f.editor.getState().content.geometries[0]!
    if (first.kind !== 'mesh') throw new Error('Missing inset preview')
    expect(Object.keys(first.faces)).toHaveLength(Object.keys(mesh.faces).length + cap.length)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.view.result.current.components.selection?.ids).toEqual(cap)
    act(() => f.view.result.current.components.preview.cancel())
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    act(() => f.view.result.current.components.beginPreview('inset'))
    act(() => expect(f.view.result.current.components.preview.update(0.4)).toBe(true))
    act(() => f.view.result.current.components.preview.confirm())
    expect(f.view.result.current.components.selection?.ids).toEqual(cap)
    expect(f.editor.getState().canUndo).toBe(true)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().content.nodes).toEqual(f.source.nodes)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('coplanar selection expands existing faces, toggles complete regions and remains session-only', () => {
  const f = fixture(false, undefined, 'cylinder')
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!)
    const cap = Object.keys(mesh.faces)
      .filter((id) => id.startsWith('top:'))
      .sort()
    const bottom = Object.keys(mesh.faces)
      .filter((id) => id.startsWith('bottom:'))
      .sort()
    const revision = f.editor.getState().contentRevision
    expect(f.view.result.current.components.coplanarSelection.enabled).toBe(false)
    act(() => f.view.result.current.components.select(cap[0]!, false))
    expect(f.view.result.current.components.selection?.ids).toEqual([cap[0]!])
    act(() => f.view.result.current.components.coplanarSelection.setEnabled(true))
    expect(f.view.result.current.components.selection?.ids.slice().sort()).toEqual(cap)
    act(() => f.view.result.current.components.select(bottom[0]!, true))
    expect(f.view.result.current.components.selection?.ids).toHaveLength(cap.length + bottom.length)
    act(() => f.view.result.current.components.select(cap[1]!, true))
    expect(f.view.result.current.components.selection?.ids.slice().sort()).toEqual(bottom)
    act(() => f.view.result.current.components.select(cap[0]!, false))
    expect(f.view.result.current.components.selection?.ids.slice().sort()).toEqual(cap)
    act(() => f.view.result.current.components.coplanarSelection.setEnabled(false))
    act(() => f.view.result.current.components.select(cap[1]!, false))
    expect(f.view.result.current.components.selection?.ids).toEqual([cap[1]!])
    expect(f.editor.getState().content).toBe(f.source)
    expect(f.editor.getState().contentRevision).toBe(revision)
    expect(f.editor.getState().canUndo).toBe(false)
    act(() => f.view.result.current.components.open('edge'))
    expect(f.view.result.current.components.coplanarSelection.enabled).toBe(false)
  } finally {
    f.close()
  }
})

test('whole-loop selection expands the current edge, follows single clicks, toggles complete loops and never edits the document', () => {
  const f = fixture()
  try {
    const source = editSceneMesh(f.source, f.node.id, () =>
      makeSceneGridGeometry(4, f.source.geometries[0]!.id),
    )
    act(() => f.editor.getState().commit(source))
    act(() => f.view.result.current.components.open('edge'))
    const baseline = f.editor.getState().content
    const revision = f.editor.getState().contentRevision
    const seed = meshEdgeKey('v_1_2', 'v_2_2')
    const loop = Array.from({ length: 4 }, (_, x) => meshEdgeKey(`v_${x}_2`, `v_${x + 1}_2`)).sort()
    expect(f.view.result.current.components.loopSelection.enabled).toBe(false)
    act(() => f.view.result.current.components.select(seed, false))
    expect(f.view.result.current.components.selection?.ids).toEqual([seed])
    act(() => f.view.result.current.components.loopSelection.setEnabled(true))
    expect(f.view.result.current.components.selection?.ids.slice().sort()).toEqual(loop)
    act(() => f.view.result.current.components.choose('none'))
    act(() => f.view.result.current.components.select(seed, false))
    expect(f.view.result.current.components.selection?.ids.slice().sort()).toEqual(loop)
    act(() => f.view.result.current.components.loopSelection.setEnabled(false))
    act(() => f.view.result.current.components.select(seed, false))
    expect(f.view.result.current.components.selection?.ids).toEqual([seed])
    // Adding a partly selected loop completes it; adding a complete loop removes it together.
    act(() => f.view.result.current.components.choose('none'))
    act(() => f.view.result.current.components.loopSelection.setEnabled(true))
    act(() => f.view.result.current.components.selectMany([seed], false))
    expect(f.view.result.current.components.selection?.ids).toEqual([seed])
    act(() => f.view.result.current.components.select(seed, true))
    expect(f.view.result.current.components.selection?.ids.slice().sort()).toEqual(loop)
    act(() => f.view.result.current.components.select(seed, true))
    expect(f.view.result.current.components.selection?.ids).toEqual([])
    expect(f.editor.getState().content).toBe(baseline)
    expect(f.editor.getState().contentRevision).toBe(revision)
    act(() => f.view.result.current.components.operation.start('ring'))
    act(() => f.view.result.current.components.select(seed, false))
    expect(f.view.result.current.components.selection?.ids).toEqual([seed])
    act(() => f.view.result.current.components.operation.cancel())
    act(() => f.view.result.current.components.setMode('vertex'))
    expect(f.view.result.current.components.loopSelection.enabled).toBe(false)
  } finally {
    f.close()
  }
})

test('face copy preview moves with the gizmo, stays outside saving and applies in one history entry', () => {
  const f = fixture()
  try {
    act(() => expect(f.view.result.current.components.operation.start('duplicate')).toBe(true))
    expect(f.view.result.current.components.operation.canConfirm).toBe(false)
    act(() => expect(f.view.result.current.components.transform.begin()).toBe(true))
    const delta = identityMatrix()
    delta[12] = 2
    act(() => expect(f.view.result.current.components.transform.preview(delta)).toBe(true))
    act(() => f.view.result.current.components.transform.end(true))
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    expect(
      Object.keys(sceneGeometryMesh(f.editor.getState().content.geometries[0]!).faces),
    ).toHaveLength(7)
    expect(f.view.result.current.components.selection?.ids).toHaveLength(1)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('multiple ring cuts preview and cancellation restore the original face selection; applying cuts one piece', () => {
  const f = fixture()
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!),
      seed = [...indexMeshEdges(mesh).edges.keys()][0]!
    act(() => f.view.result.current.components.operation.start('ring'))
    act(() => f.view.result.current.components.select(seed, false))
    act(() =>
      f.view.result.current.components.operation.configure({ kind: 'ring', count: 3, offset: 0.1 }),
    )
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    expect(f.view.result.current.components.operation.guide?.cut?.segments).toHaveLength(12)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    act(() => f.view.result.current.components.operation.cancel())
    expect(f.view.result.current.components.selection?.ids).toEqual([f.faceId])
    act(() => f.view.result.current.components.operation.start('ring'))
    act(() => f.view.result.current.components.select(seed, false))
    act(() =>
      f.view.result.current.components.operation.configure({ kind: 'ring', count: 3, offset: 0.1 }),
    )
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    expect(f.editor.getState().content.nodes).toHaveLength(1)
    expect(
      Object.keys(sceneGeometryMesh(f.editor.getState().content.geometries[0]!).faces),
    ).toHaveLength(18)
    expect(f.view.result.current.components.selection?.ids).toHaveLength(16)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
  } finally {
    f.close()
  }
})

test('hole preview fills a box border without saving and confirms one new selected face', () => {
  const f = fixture(true)
  try {
    const mesh = sceneGeometryMesh(f.source.geometries[0]!),
      border = [...indexMeshEdges(mesh).edges].filter(([, e]) => e.length === 1).map(([id]) => id)
    act(() => f.view.result.current.components.operation.start('fill'))
    act(() => f.view.result.current.components.selectMany(border, false))
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    const full = sceneGeometryMesh(f.editor.getState().content.geometries[0]!)
    expect(Object.keys(full.faces)).toHaveLength(6)
    for (const edges of indexMeshEdges(full).edges.values()) expect(edges).toHaveLength(2)
    expect(f.view.result.current.components.selection?.mode).toBe('face')
    expect(f.view.result.current.components.selection?.ids).toHaveLength(1)
    act(() => f.view.result.current.undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
  } finally {
    f.close()
  }
})

test('continuous reflection persists, maps generated selection to source, follows extrusion and bakes reversibly', () => {
  const f = fixture(true)
  try {
    act(() => f.view.result.current.components.operation.start('mirror'))
    act(() =>
      f.view.result.current.components.operation.configure({
        kind: 'mirror',
        axis: 0,
        copy: true,
        continuous: true,
      }),
    )
    expect(f.view.result.current.components.operation.canConfirm).toBe(true)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    act(() => expect(f.view.result.current.components.operation.confirm()).toBe(true))
    const mirrored = f.editor.getState().content,
      full = sceneGeometryMesh(mirrored.geometries[0]!)
    expect(full.symmetry).toBeDefined()
    expect(encodeSceneGlb(mirrored).stats.triangles).toBe(12)
    expect(readSceneDocument(mirrored).status).toBe('valid')
    const generated = full.symmetry!.faces[f.faceId]!
    act(() => f.view.result.current.components.select(generated, false))
    expect(f.view.result.current.components.selection?.ids).toEqual([f.faceId])
    act(() => f.view.result.current.components.beginPreview('extrude'))
    act(() => expect(f.view.result.current.components.preview.update(0.5)).toBe(true))
    act(() => f.view.result.current.components.preview.confirm())
    const pulled = f.editor.getState().content,
      shape = sceneGeometryMesh(pulled.geometries[0]!)
    expect(shape.symmetry!.center).toBe(full.symmetry!.center)
    expect(shape.symmetry!.faces[f.faceId]).toBe(generated)
    expect(Object.keys(shape.symmetry!.faces)).toHaveLength(5)
    expect(readSceneDocument(pulled).status).toBe('valid')
    act(() => expect(f.view.result.current.components.stopSymmetry()).toBe(true))
    expect(sceneGeometryMesh(f.editor.getState().content.geometries[0]!).symmetry).toBeUndefined()
    expect(f.editor.getState().content.geometries[0]!.kind).toBe('mesh')
    act(() => f.view.result.current.undo())
    expect(sceneGeometryMesh(f.editor.getState().content.geometries[0]!).symmetry).toEqual(
      shape.symmetry,
    )
  } finally {
    f.close()
  }
})
