import { expect, test } from 'bun:test'
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive } from '../../../scene/commands'
import { createSceneProject } from '../../../scene/createProject'
import { sceneGeometryMesh } from '../../../scene/parametricGeometry'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'
import { useSceneKnife } from './useSceneKnife'
import { useSceneWorkshop } from './useSceneWorkshop'

function fixture(shared = false) {
  let source = addScenePrimitive(
    createSceneProject({ kind: 'empty', name: 'Faca' }),
    'box',
    'corpo',
  )
  const node = source.nodes[0]!
  if (node.kind !== 'mesh') throw new Error('Missing mesh')
  if (shared)
    source = { ...source, nodes: [...source.nodes, { ...node, id: 'other', name: 'Outra peça' }] }
  const mesh = sceneGeometryMesh(source.geometries.find((g) => g.id === node.geometryId)!)
  const faceId = Object.keys(mesh.faces)[0]!,
    corners = mesh.faces[faceId]!.corners
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  return {
    source,
    node,
    mesh,
    editor,
    faceId,
    points: [corners[0]!.vertexId, corners[2]!.vertexId],
  }
}

test('knife applies one undoable surface cut, selects all resulting faces and supports a separate extrusion', () => {
  const f = fixture(),
    view = renderHook(() => useSceneWorkshop(f.editor), { wrapper: StrictMode })
  try {
    act(() => view.result.current.select(f.node.id, false))
    act(() => view.result.current.setTool('knife'))
    for (const vertexId of f.points)
      act(() => view.result.current.knife.mark({ kind: 'vertex', vertexId }))
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(view.result.current.knife.canConfirm).toBe(true)
    act(() => expect(view.result.current.confirmKnife()).toBe(true))
    const cut = f.editor.getState().asset
    expect(cut.nodes).toEqual(f.source.nodes)
    expect(cut.materials).toBe(f.source.materials)
    expect(cut.images).toBe(f.source.images)
    expect(Object.keys(sceneGeometryMesh(cut.geometries[0]!).faces)).toHaveLength(7)
    expect(view.result.current.components.selection?.mode).toBe('face')
    expect(view.result.current.components.selection?.ids).toHaveLength(2)
    const child = view.result.current.components.selection!.ids.find((id) => id !== f.faceId)!
    act(() => view.result.current.components.select(child, false))
    act(() => view.result.current.components.beginPreview('extrude'))
    act(() => expect(view.result.current.components.preview.update(0.5)).toBe(true))
    act(() => view.result.current.components.preview.confirm())
    expect(
      Object.keys(sceneGeometryMesh(f.editor.getState().asset.geometries[0]!).faces),
    ).toHaveLength(10)
    act(() => view.result.current.undo())
    expect(f.editor.getState().asset.geometries).toEqual(cut.geometries)
    act(() => view.result.current.undo())
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    f.editor.getState().dispose()
  }
})

test('cancel restores the previous face selection; undo and interruptions discard the draft without editing', () => {
  const f = fixture(),
    view = renderHook(() => useSceneWorkshop(f.editor), { wrapper: StrictMode })
  try {
    act(() => view.result.current.select(f.node.id, false))
    act(() => view.result.current.components.open('face', [f.faceId]))
    act(() => view.result.current.setTool('knife'))
    for (const vertexId of f.points)
      act(() => view.result.current.knife.mark({ kind: 'vertex', vertexId }))
    act(() => view.result.current.cancelKnife())
    expect(view.result.current.components.selection?.ids).toEqual([f.faceId])
    expect(f.editor.getState().asset).toBe(f.source)
    expect(f.editor.getState().canUndo).toBe(false)
    act(() => view.result.current.setTool('knife'))
    for (const vertexId of f.points)
      act(() => view.result.current.knife.mark({ kind: 'vertex', vertexId }))
    act(() => view.result.current.undo())
    expect(view.result.current.knife.owner?.points).toEqual([])
    expect(f.editor.getState().asset).toBe(f.source)
    for (const interrupt of [
      () => fireEvent(window, new Event('blur')),
      () => fireEvent(document, new Event('webglcontextlost')),
    ]) {
      for (const vertexId of f.points)
        act(() => view.result.current.knife.mark({ kind: 'vertex', vertexId }))
      interrupt()
      expect(view.result.current.knife.owner?.points).toEqual([])
      expect(f.editor.getState().asset).toBe(f.source)
    }
    for (const vertexId of f.points)
      act(() => view.result.current.knife.mark({ kind: 'vertex', vertexId }))
    const stale = view.result.current.knife.confirm
    act(() => f.editor.getState().commit({ ...f.source, name: 'Outra revisão' }))
    act(() => expect(stale()).toBeNull())
    expect(f.editor.getState().asset.name).toBe('Outra revisão')
    expect(f.editor.getState().asset.geometries).toBe(f.source.geometries)
  } finally {
    view.unmount()
    f.editor.getState().dispose()
  }
})

test('K opens the surface knife; Enter applies it without creating pieces and Escape cancels it', async () => {
  const f = fixture(),
    probe = sceneViewportProbe()
  const view = render(<SceneWorkshop editor={f.editor} viewportFactory={probe.factory} />)
  try {
    await waitFor(() => expect(probe.ports.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.select('corpo') }))
    const workshop = screen.getByRole('region', { name: COPY.scene.title })
    fireEvent.keyDown(workshop, { key: 'k' })
    const panel = within(screen.getByRole('region', { name: 'Cortar' }))
    expect(panel.getByRole('button', { name: 'Aplicar corte' }).hasAttribute('disabled')).toBe(true)
    for (const vertexId of f.points)
      act(() =>
        probe.ports.at(-1)!.callbacks.guideInput!()!.knife!.mark({ kind: 'vertex', vertexId }),
      )
    expect(panel.getByText('2 pontos marcados')).toBeDefined()
    expect(screen.getByRole('button', { name: COPY.editor.undo }).hasAttribute('disabled')).toBe(
      false,
    )
    fireEvent.keyDown(workshop, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Cortar' })).toBeNull()
    expect(f.editor.getState().asset).toBe(f.source)
    fireEvent.keyDown(workshop, { key: 'k' })
    for (const vertexId of f.points)
      act(() =>
        probe.ports.at(-1)!.callbacks.guideInput!()!.knife!.mark({ kind: 'vertex', vertexId }),
      )
    fireEvent.keyDown(workshop, { key: 'Enter' })
    expect(f.editor.getState().asset.nodes).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Editar peça' })).toBeDefined()
    expect(screen.getByText('2 faces escolhidas')).toBeDefined()
    expect(
      screen.getByRole('button', { name: COPY.scene.facePreview.extrude }).hasAttribute('disabled'),
    ).toBe(false)
  } finally {
    view.unmount()
    f.editor.getState().dispose()
  }
})

test('knife edits a shared geometry copy and selects its new faces without changing the other piece', () => {
  const f = fixture(true),
    shared = f.source
  const view = renderHook(() => useSceneWorkshop(f.editor), { wrapper: StrictMode })
  try {
    act(() => view.result.current.select(f.node.id, false))
    act(() => view.result.current.setTool('knife'))
    for (const vertexId of f.points)
      act(() => view.result.current.knife.mark({ kind: 'vertex', vertexId }))
    act(() => expect(view.result.current.confirmKnife()).toBe(true))
    const cut = f.editor.getState().content
    const edited = cut.nodes.find((node) => node.id === f.node.id)!
    if (edited.kind !== 'mesh') throw new Error('Missing mesh')
    expect(edited.geometryId).not.toBe(f.node.geometryId)
    expect(cut.nodes.find((node) => node.id === 'other')).toBe(shared.nodes[1])
    expect(cut.geometries.find((geometry) => geometry.id === f.node.geometryId)).toBe(
      shared.geometries[0],
    )
    expect(view.result.current.components.uv?.mesh.id).toBe(edited.geometryId)
    expect(view.result.current.components.selection?.ids).toHaveLength(2)
    act(() => view.result.current.undo())
    expect(f.editor.getState().content.nodes).toEqual(shared.nodes)
    expect(f.editor.getState().content.geometries).toEqual(shared.geometries)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    f.editor.getState().dispose()
  }
})

test('replacing the editor discards a knife draft even when both editors share the same document', () => {
  const f = fixture()
  const replacement = createDocumentEditorStore({
    asset: f.source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60000,
  })
  const view = renderHook(
    ({ editor }) =>
      useSceneKnife(editor, (next) => {
        editor.getState().commit(next)
        return true
      }),
    { initialProps: { editor: f.editor }, wrapper: StrictMode },
  )
  try {
    act(() => view.result.current.start(f.node.id))
    for (const vertexId of f.points)
      act(() => view.result.current.mark({ kind: 'vertex', vertexId }))
    expect(view.result.current.canConfirm).toBe(true)
    const stale = view.result.current.confirm
    view.rerender({ editor: replacement })
    expect(view.result.current.owner).toBeNull()
    expect(view.result.current.canConfirm).toBe(false)
    expect(stale()).toBeNull()
    expect(f.editor.getState().content).toBe(f.source)
    expect(replacement.getState().content).toBe(f.source)
  } finally {
    view.unmount()
    f.editor.getState().dispose()
    replacement.getState().dispose()
  }
})
