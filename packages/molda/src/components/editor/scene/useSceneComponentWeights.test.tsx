import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import { createSceneSkin } from '../../../scene/skinCommands'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeSceneSkinFixture } from '../../../testing/sceneSkin'
import { useSceneWorkshop } from './useSceneWorkshop'

function setup() {
  const fixture = makeSceneSkinFixture(),
    { id, ...input } = fixture.input,
    asset = createSceneSkin(fixture.document, input, () => id),
    editor = createDocumentEditorStore({
      asset,
      sizeOf: structuredBytes,
      autosaveMs: 60_000,
      persistence: { save: async () => undefined },
    }),
    view = renderHook(({ current }) => useSceneWorkshop(current), {
      initialProps: { current: editor },
      wrapper: StrictMode,
    })
  act(() => view.result.current.select('part-0', false))
  act(() => view.result.current.components.open('vertex'))
  act(() => view.result.current.components.select('v_0_0', false))
  return {
    asset,
    editor,
    view,
    dispose: () => {
      view.unmount()
      editor.getState().dispose()
    },
  }
}
const mix = [
  { jointId: 'upper', weight: 0.25 },
  { jointId: 'lower', weight: 0.75 },
]

test('captured weight commands cannot cross selection, revision, close or unmount; thumbnails remain unrelated', () => {
  const { asset, editor, view, dispose } = setup()
  try {
    let apply = view.result.current.components.weights!.onApply
    act(() => view.result.current.components.select('v_1_0', false))
    act(() => expect(apply(mix)).toBe(false))
    apply = view.result.current.components.weights!.onApply
    act(() => editor.getState().commit({ ...asset, name: 'Revisão' }))
    act(() => expect(apply(mix)).toBe(false))
    apply = view.result.current.components.weights!.onApply
    act(() => view.result.current.components.close())
    act(() => expect(apply(mix)).toBe(false))
    act(() => view.result.current.components.open('vertex'))
    act(() => view.result.current.components.select('v_0_0', false))
    apply = view.result.current.components.weights!.onApply
    act(() => view.result.current.components.select('missing-point', false))
    act(() => editor.getState().setThumb('data:image/png;base64,thumb'))
    act(() => expect(apply(mix)).toBe(true))
    expect(editor.getState().asset.thumb).toBe('data:image/png;base64,thumb')
    expect(editor.getState().asset.skins![0]!.weights.v_0_0).toEqual(mix)
    expect(editor.getState().asset.skins![0]!.weights.v_0_0).not.toBe(mix)
    act(() => expect(apply(mix)).toBe(false))
    apply = view.result.current.components.weights!.onApply
    const before = editor.getState().asset
    view.unmount()
    expect(apply([{ jointId: 'upper', weight: 1 }])).toBe(false)
    expect(editor.getState().asset).toBe(before)
  } finally {
    dispose()
  }
})

test('a pending component transform revokes previously captured weight actions without cancelling the gesture', () => {
  const { asset, editor, view, dispose } = setup()
  try {
    const apply = view.result.current.components.weights!.onApply
    act(() => expect(view.result.current.components.transform.begin()).toBe(true))
    expect(view.result.current.components.weights!.disabled).toBe(true)
    act(() => expect(apply(mix)).toBe(false))
    expect(view.result.current.components.transform.dragging).toBe(true)
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().canUndo).toBe(false)
    act(() => view.result.current.components.transform.cancel())
  } finally {
    dispose()
  }
})

test('replacing the editor revokes the UI draft identity even with the same document and revision', () => {
  const { asset, editor, view, dispose } = setup(),
    replacement = createDocumentEditorStore({
      asset,
      sizeOf: structuredBytes,
      autosaveMs: 60_000,
      persistence: { save: async () => undefined },
    })
  try {
    const previous = view.result.current.components.weights!
    view.rerender({ current: replacement })
    expect(view.result.current.components.weights!.sourceKey).not.toBe(previous.sourceKey)
    act(() => expect(previous.onApply(mix)).toBe(false))
    expect(editor.getState().asset).toBe(asset)
    expect(replacement.getState().asset).toBe(asset)
  } finally {
    dispose()
    replacement.getState().dispose()
  }
})
