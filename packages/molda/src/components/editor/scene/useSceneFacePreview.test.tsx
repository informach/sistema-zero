import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { structuredBytes } from '../../../core/structuredBytes'
import { convertSceneNodesToMesh } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeModel } from '../../../testing/fixtures'
import { type SceneFaceSession, useSceneFacePreview } from './useSceneFacePreview'

function setup() {
  const source = convertSceneNodesToMesh(migrateLegacyModel(makeModel()).document, ['body']),
    editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      autosaveMs: 60_000,
      persistence: { save: async () => {} },
    }),
    sessions: Array<SceneFaceSession | null> = [],
    select = (session: SceneFaceSession | null) => {
      sessions.push(session)
    },
    hook = renderHook(() => useSceneFacePreview(editor, select))
  function begin() {
    const asset = editor.getState().asset,
      node = asset.nodes.find((node) => node.id === 'body')!,
      mesh =
        node.kind === 'mesh'
          ? asset.geometries.find((geometry) => geometry.id === node.geometryId)
          : null
    if (mesh?.kind !== 'mesh') throw new Error('Expected editable fixture')
    hook.result.current.begin(
      'inset',
      { nodeId: node.id, geometryId: mesh.id, faceIds: ['px'] },
      mesh,
    )
  }
  return { source, editor, sessions, hook, begin }
}

test('a nested external revision closes the old owner while a replacement preview remains editable', () => {
  const f = setup()
  let replaced = false
  const replacement: { before: MoldaSceneDocument | null } = { before: null }
  const off = f.editor.subscribe((state, previous) => {
    if (state.contentRevision === previous.contentRevision || replaced) return
    replaced = true
    f.editor.getState().commit({ ...state.asset, name: 'Alteração preservada' })
    replacement.before = f.editor.getState().asset
    f.begin()
  })
  try {
    act(() => f.begin())
    act(() => {
      expect(f.hook.result.current.update(0.2)).toBe(false)
    })
    expect(f.hook.result.current.tool).toBe('inset')
    expect(f.hook.result.current.error).toBeNull()
    const before = replacement.before
    if (!before) throw new Error('Expected a replacement revision')
    expect(f.editor.getState().asset).toBe(before)
    act(() => {
      expect(f.hook.result.current.update(0.3)).toBe(true)
    })
    act(() => f.hook.result.current.confirm())
    expect(f.hook.result.current.tool).toBeNull()
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().asset.geometries).toEqual(before.geometries)
    expect(f.editor.getState().asset.name).toBe('Alteração preservada')
  } finally {
    off()
    f.hook.unmount()
    f.editor.getState().dispose()
  }
})

test('own previews and non-content metadata do not invalidate the owner; cancellation adds no undo', () => {
  const f = setup()
  try {
    act(() => f.begin())
    for (const amount of [0.1, 0.3, 0]) {
      act(() => {
        expect(f.hook.result.current.update(amount)).toBe(true)
      })
      expect(f.hook.result.current.tool).toBe('inset')
      expect(f.hook.result.current.error).toBeNull()
    }
    act(() => f.editor.getState().setThumb('data:image/png;base64,AA=='))
    expect(f.hook.result.current.tool).toBe('inset')
    act(() => f.hook.result.current.cancel())
    expect(f.hook.result.current.tool).toBeNull()
    expect(f.hook.result.current.error).toBeNull()
    expect(f.editor.getState().canUndo).toBe(false)
    expect(f.editor.getState().asset.geometries).toEqual(f.source.geometries)
    expect(f.sessions.at(-1)?.faceIds).toEqual(['px'])
  } finally {
    f.hook.unmount()
    f.editor.getState().dispose()
  }
})
