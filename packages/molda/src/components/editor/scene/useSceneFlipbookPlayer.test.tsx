import { expect, spyOn, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import { setSceneImageFlipbook } from '../../../scene/imageFlipbookCommands'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeSceneAtlasDocument } from '../../../testing/sceneAtlasFixture'
import { useSceneFlipbookPlayer } from './useSceneFlipbookPlayer'

test('flipbook session pauses on revision/blur/hidden and StrictMode cleanup cancels callbacks without touching history', () => {
  const original = makeSceneAtlasDocument(),
    image = original.images[0]!
  const asset = setSceneImageFlipbook(original, image.id, {
    frameWidth: image.width / 2,
    frameHeight: image.height / 2,
    frames: [0, 3, 1],
    fps: 8,
    loop: true,
  })
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
    now: () => asset.updatedAt,
  })
  const frames = new Map<number, FrameRequestCallback>()
  let id = 0
  const request = spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++id, callback)
    return id
  })
  const cancel = spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  const clock = spyOn(performance, 'now').mockReturnValue(0)
  const view = renderHook(() => useSceneFlipbookPlayer(editor), { wrapper: StrictMode })
  const player = view.result.current
  try {
    act(() => player.setImage(asset.images[0]!))
    for (const stop of [
      () => window.dispatchEvent(new Event('blur')),
      () => {
        const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
        try {
          document.dispatchEvent(new Event('visibilitychange'))
        } finally {
          if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
          else Reflect.deleteProperty(document, 'hidden')
        }
      },
      () => editor.getState().commit({ ...asset, name: 'Novo nome' }),
    ]) {
      act(() => player.play())
      expect(frames.size).toBe(1)
      act(stop)
      expect(player.getSnapshot().playing).toBe(false)
      expect(frames.size).toBe(0)
    }
    expect(editor.getState().contentRevision).toBe(1)
    act(() => editor.getState().undo())
    expect(editor.getState().asset).toEqual({ ...asset, updatedAt: asset.updatedAt + 2 })
    expect(editor.getState().canUndo).toBe(false)
    act(() => player.play())
    const late = [...frames.values()][0]!
    view.unmount()
    expect(frames.size).toBe(0)
    late(1000)
    expect(frames.size).toBe(0)
    expect(player.getSnapshot().source).toBeNull()
  } finally {
    view.unmount()
    editor.getState().dispose()
    request.mockRestore()
    cancel.mockRestore()
    clock.mockRestore()
  }
})
