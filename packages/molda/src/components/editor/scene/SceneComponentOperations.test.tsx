import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import { encodeSceneGlb } from '../../../export/sceneGlb'
import { addScenePrimitive, editSceneMesh } from '../../../scene/commands'
import { createSceneProject } from '../../../scene/createProject'
import { identityMatrix } from '../../../scene/matrix'
import { editMeshFaces } from '../../../scene/meshFaces'
import { indexMeshEdges } from '../../../scene/meshTopology'
import { sceneGeometryMesh } from '../../../scene/parametricGeometry'
import { readSceneDocument } from '../../../scene/readDocument'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { useSceneWorkshop } from './useSceneWorkshop'

function fixture(hole = false) {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Operações' }),
    'box',
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
  const view = renderHook(() => useSceneWorkshop(editor), { wrapper: StrictMode })
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
