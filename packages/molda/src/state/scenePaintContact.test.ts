import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useScenePaint } from '../components/editor/scene/useScenePaint'
import { structuredBytes } from '../core/structuredBytes'
import { addScenePrimitive } from '../scene/commands'
import { buildSceneGeometry } from '../scene/geometry'
import type { ScenePaintContact } from '../scene/imagePaint'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { createDocumentEditorStore } from './editorStore'

function fixture() {
  let n = 0
  let source = migrateLegacyModel(makeModel({ parts: [] })).document
  source = addScenePrimitive(source, 'box', 'Esquerda', () => `paint${++n}`)
  source = addScenePrimitive(source, 'box', 'Direita', () => `paint${++n}`)
  const nodes = source.nodes.filter((node) => node.kind === 'mesh')
  const first = nodes[0]!,
    second = nodes[1]!
  // Shared geometry and material must remain independent after painting either instance.
  source = {
    ...source,
    nodes: source.nodes.map((node) =>
      node.id === second.id
        ? { ...second, geometryId: first.geometryId, materialId: first.materialId }
        : node,
    ),
  }
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  const hook = renderHook(() => useScenePaint(editor, true))
  const contact = (
    id: string,
    weights: [number, number, number] = [0.2, 0.3, 0.5],
  ): ScenePaintContact => {
    const current = editor.getState().content
    const node = current.nodes.find((node) => node.id === id)
    if (node?.kind !== 'mesh') throw new Error('Missing node')
    const geometry = current.geometries.find((geometry) => geometry.id === node.geometryId)!
    const triangle = buildSceneGeometry(geometry).faceIds.indexOf('py')
    return { kind: 'surface', nodeId: id, faceId: 'py', triangle, barycentric: weights, frame: 0 }
  }
  return {
    source,
    editor,
    hook,
    first,
    second,
    contact,
    close: () => {
      hook.unmount()
      editor.getState().dispose()
    },
  }
}

test('a first stroke crosses unprepared shared pieces, stages pixels/UVs/materials atomically, and has one undo', async () => {
  const f = fixture()
  try {
    let accepted = false
    act(() => {
      f.hook.result.current.setColor([29, 57, 113, 255])
    })
    act(() => {
      accepted = f.hook.result.current.actions.begin(f.contact(f.first.id))
    })
    expect(accepted).toBe(true)
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    act(() => f.hook.result.current.actions.move(null))
    act(() => f.hook.result.current.actions.move(f.contact(f.second.id)))
    expect(f.hook.result.current.error).toBeNull()
    expect(f.editor.getState().saveSnapshot()).toBe(f.source)
    const preview = f.editor.getState().content
    expect(preview.images).toHaveLength(2)
    for (const image of preview.images)
      expect(image.layers[0]!.pixels.some((value) => value > 0)).toBe(true)
    act(() => f.hook.result.current.actions.end(true))
    expect(f.hook.result.current.recentColors).toEqual([[29, 57, 113, 255]])
    expect(f.hook.result.current.session).toBeNull()
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().content.geometries).toEqual(f.source.geometries)
    expect(f.editor.getState().content.images).toEqual(f.source.images)
    expect(f.editor.getState().canUndo).toBe(false)
    act(() => f.editor.getState().redo())
    expect(f.editor.getState().content.images).toEqual(preview.images)
  } finally {
    f.close()
  }
})

test('cancel or an invalid second piece rolls the entire stroke back, including prepared resources', () => {
  for (const invalid of [false, true]) {
    const f = fixture()
    try {
      act(() => {
        expect(f.hook.result.current.actions.begin(f.contact(f.first.id))).toBe(true)
      })
      act(() =>
        f.hook.result.current.actions.move(
          invalid ? { ...f.contact(f.second.id), faceId: 'missing' } : f.contact(f.second.id),
        ),
      )
      if (!invalid) act(() => f.hook.result.current.actions.end(false))
      expect(f.editor.getState().content).toBe(f.source)
      expect(f.editor.getState().canUndo).toBe(false)
      expect(f.hook.result.current.recentColors).toEqual([])
      expect(f.hook.result.current.drawing).toBe(false)
      if (invalid) expect(f.hook.result.current.error).toBeTruthy()
    } finally {
      f.close()
    }
  }
})

test('Shift replaces its previous line preview, commits only the final line and restores on cancellation', () => {
  const f = fixture()
  try {
    act(() => f.hook.result.current.setBrush(1))
    const start = () => f.contact(f.first.id, [0.8, 0.1, 0.1])
    const end = () => f.contact(f.first.id, [0.1, 0.8, 0.1])
    const intermediate = () => f.contact(f.first.id, [0.1, 0.1, 0.8])
    act(() => {
      expect(f.hook.result.current.actions.begin(start())).toBe(true)
    })
    act(() => f.hook.result.current.actions.move(end()))
    act(() => f.hook.result.current.actions.end(true))
    const direct = f.editor.getState().content.images[0]!.layers[0]!.pixels.slice()
    act(() => f.editor.getState().undo())
    for (const commit of [false, true]) {
      act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })))
      act(() => {
        expect(f.hook.result.current.actions.begin(start())).toBe(true)
      })
      act(() => f.hook.result.current.actions.move(intermediate()))
      act(() => f.hook.result.current.actions.move(end()))
      expect(f.editor.getState().content.images[0]!.layers[0]!.pixels).toEqual(direct)
      expect(f.editor.getState().saveSnapshot().images).toEqual(f.source.images)
      act(() => f.hook.result.current.actions.end(commit))
      act(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' })))
      expect(f.editor.getState().canUndo).toBe(commit)
      if (!commit) expect(f.editor.getState().content.images).toEqual(f.source.images)
    }
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }))
    f.close()
  }
})

test('Alt samples without losing the previous tool and blur cancels a stroke with its resources', () => {
  const f = fixture()
  try {
    act(() => f.hook.result.current.setEraser(true))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' })))
    expect(f.hook.result.current.picker).toBe(true)
    act(() => f.hook.result.current.sample([123, 45, 67, 255]))
    expect(f.hook.result.current.ink).toEqual([123, 45, 67, 255])
    expect(f.hook.result.current.recentColors).toEqual([])
    act(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' })))
    expect(f.hook.result.current.picker).toBe(false)
    expect(f.hook.result.current.eraser).toBe(true)
    act(() => f.hook.result.current.setEraser(false))
    act(() => {
      expect(f.hook.result.current.actions.begin(f.contact(f.first.id))).toBe(true)
    })
    act(() => window.dispatchEvent(new Event('blur')))
    expect(f.editor.getState().content.images).toEqual(f.source.images)
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.hook.result.current.drawing).toBe(false)
  } finally {
    f.close()
  }
})
