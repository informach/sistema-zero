import { expect, spyOn, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import { deleteSceneAnimation, setSceneAnimationKey } from '../../../scene/animationCommands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { animatedScene, sceneAnimationClip } from '../../../testing/sceneAnimation'
import { useSceneAnimationPlayer } from './useSceneAnimationPlayer'

test('thumbnail updates preserve playback and preview ownership without adding history', () => {
  const asset = animatedScene()
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  const view = renderHook(() => useSceneAnimationPlayer(editor), { wrapper: StrictMode })
  try {
    const player = view.result.current
    act(() => {
      player.setClip(asset, 'clip')
      player.seek(1.123456789123)
    })
    act(() => player.play())
    const before = player.getSnapshot()
    act(() => editor.getState().setThumb('data:image/png;base64,thumb'))
    expect(player.getSnapshot()).toBe(before)
    expect(player.getSnapshot().playing).toBe(true)
    expect(player.getSnapshot().time).toBe(1.123456789123)
    expect(editor.getState().contentRevision).toBe(0)
    expect(editor.getState().canUndo).toBe(false)
    act(() => player.setPreview(asset, { ...sceneAnimationClip(), id: 'draft' }))
    const preview = player.getSnapshot()
    act(() => editor.getState().setThumb(undefined))
    expect(player.getSnapshot()).toBe(preview)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('any editor revision invalidates a preview, including a candidate using an existing clip ID', async () => {
  const asset = animatedScene()
  const saves: MoldaSceneDocument[] = []
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset,
    sizeOf: structuredBytes,
    persistence: {
      save: async (document) => {
        saves.push(document)
      },
    },
    autosaveMs: 60000,
  })
  const view = renderHook(() => useSceneAnimationPlayer(editor), { wrapper: StrictMode })
  try {
    const player = view.result.current
    act(() => player.setPreview(asset, sceneAnimationClip('wing')))
    act(() => player.seek(1))
    expect(editor.getState().asset).toBe(asset)
    expect(editor.getState().contentRevision).toBe(0)
    expect(editor.getState().canUndo).toBe(false)
    await editor.getState().flush()
    expect(saves).toHaveLength(0)
    act(() => editor.getState().commit({ ...asset, name: 'Nova revisão' }))
    expect(player.getSnapshot().source).toBeNull()
    expect(player.getSnapshot().pose).toBeNull()
    act(() => player.cancelPreview())
    expect(player.getSnapshot().source).toBeNull()
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('animation session pauses on revision/blur/hidden and StrictMode cleanup; playback does not create history', () => {
  const asset = animatedScene()
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
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
  const view = renderHook(() => useSceneAnimationPlayer(editor), { wrapper: StrictMode })
  const player = view.result.current
  try {
    act(() => player.setClip(asset, 'clip'))
    act(() => player.seek(0.123456789))
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
    ]) {
      act(() => player.play())
      expect(frames.size).toBe(1)
      act(stop)
      expect(player.getSnapshot().playing).toBe(false)
      expect(frames.size).toBe(0)
      expect(player.getSnapshot().time).toBe(0.123456789)
    }
    expect(editor.getState().contentRevision).toBe(0)
    expect(editor.getState().canUndo).toBe(false)
    act(() => player.play())
    act(() =>
      editor.getState().commit(
        setSceneAnimationKey(asset, 'clip', {
          nodeId: 'wing',
          channel: 'scale',
          key: { time: 0, value: [2, 1, 1], interpolation: 'linear' },
        }),
      ),
    )
    expect(player.getSnapshot().source?.document).toBe(editor.getState().asset)
    expect(player.getSnapshot().playing).toBe(false)
    expect(player.getSnapshot().time).toBe(0.123456789)
    expect(frames.size).toBe(0)
    act(() => editor.getState().undo())
    expect(player.getSnapshot().source?.document).toBe(editor.getState().asset)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().commit(deleteSceneAnimation(editor.getState().asset, 'clip')))
    expect(player.getSnapshot().source).toBeNull()
    act(() => editor.getState().undo())
    act(() => player.setClip(editor.getState().asset, 'clip'))
    act(() => player.play())
    const late = [...frames.values()][0]!
    view.unmount()
    late(1000)
    expect(frames.size).toBe(0)
    expect(player.getSnapshot().source).toBeNull()
    expect(player.getSnapshot().pose).toBeNull()
  } finally {
    view.unmount()
    editor.getState().dispose()
    request.mockRestore()
    cancel.mockRestore()
    clock.mockRestore()
  }
})

test('enabling reduced motion pauses playback without clearing the chosen pose or creating history', () => {
  const asset = animatedScene()
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  const media = spyOn(window, 'matchMedia').mockReturnValue(query)
  const clock = spyOn(performance, 'now').mockReturnValue(0)
  const view = renderHook(() => useSceneAnimationPlayer(editor))
  try {
    const player = view.result.current
    act(() => player.setClip(asset, 'clip'))
    act(() => player.seek(0.5))
    act(() => player.play())
    Object.defineProperty(query, 'matches', { configurable: true, value: true })
    act(() => query.dispatchEvent(new Event('change')))
    expect(player.getSnapshot()).toMatchObject({ time: 0.5, playing: false })
    expect(player.getSnapshot().pose?.source).toBe(asset)
    expect(editor.getState().contentRevision).toBe(0)
  } finally {
    view.unmount()
    editor.getState().dispose()
    media.mockRestore()
    clock.mockRestore()
  }
})

test('a new revision that cannot compose its current pose clears the old owner and reports the failure', () => {
  const asset = animatedScene()
  const editor = createDocumentEditorStore<MoldaSceneDocument>({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const view = renderHook(() => useSceneAnimationPlayer(editor))
  try {
    const player = view.result.current
    act(() => player.setClip(asset, 'clip'))
    act(() => player.seek(2))
    const next = structuredClone(asset)
    const node = next.nodes[0]!
    if (node.transform.kind !== 'trs') throw new Error('Missing TRS')
    node.transform.scale = [2, 1, 1]
    next.animations[0]!.tracks[0]!.keys[2]!.value[0] = Number.MAX_VALUE
    act(() => editor.getState().commit(next))
    expect(player.getSnapshot().source).toBeNull()
    expect(player.getSnapshot().pose).toBeNull()
    expect(player.getSnapshot().error).not.toBeNull()
    expect(editor.getState().asset.animations).toEqual(next.animations)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
