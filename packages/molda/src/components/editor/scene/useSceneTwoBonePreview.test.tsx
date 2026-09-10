import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeSceneTwoBoneFixture } from '../../../testing/sceneTwoBone'
import { useSceneTwoBonePreview } from './useSceneTwoBonePreview'
import { useSceneWorkshop } from './useSceneWorkshop'

test('the form reuses preparation across invalidations and revokes old closures on time, document and unmount', () => {
  const source = makeSceneTwoBoneFixture(),
    editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
      autosaveMs: 60_000,
    }),
    view = renderHook(
      ({ time }) => {
        const workshop = useSceneWorkshop(editor)
        return {
          workshop,
          input: useSceneTwoBonePreview(workshop, ['root', 'middle', 'tip'], 'clip', time),
        }
      },
      { initialProps: { time: 0 }, wrapper: StrictMode },
    )
  try {
    const { animation, animationPose } = view.result.current.workshop,
      old = view.result.current.input
    act(() => animation.setClip(source, 'clip'))
    act(() => expect(old.preview([1, 1, 0])).toBe(true))
    const geometry = Object.getOwnPropertyDescriptor(source, 'geometries')!
    Object.defineProperty(source, 'geometries', {
      configurable: true,
      get() {
        throw new Error('A form adjustment must not index geometry again')
      },
    })
    try {
      for (let i = 0; i < 20; i++) {
        act(() => old.invalidate())
        expect(animationPose.getSnapshot().pending).toBe(false)
        act(() => expect(old.preview([1, 1, i / 100])).toBe(true))
      }
    } finally {
      Object.defineProperty(source, 'geometries', geometry)
    }
    act(() => animation.seek(1))
    expect(old.preview([1, 1, 0])).toBe(false)
    view.rerender({ time: 1 })
    const current = view.result.current.input
    act(() => expect(current.preview([0, 1, 0])).toBe(true))
    const pose = animationPose.getSnapshot().pose
    act(() => {
      old.cancel()
      old.invalidate()
      expect(old.preview([NaN, 0, 0])).toBe(false)
    })
    expect(animationPose.getSnapshot().pose).toBe(pose)
    act(() => editor.getState().setThumb('latest'))
    act(() => expect(current.preview([1, 1, 0])).toBe(true))
    act(() => editor.getState().replace({ ...editor.getState().asset, name: 'Changed content' }))
    expect(current.preview([1, 1, 0])).toBe(false)
    const latest = view.result.current.input
    act(() => expect(latest.preview([1, 1, 0])).toBe(true))
    view.unmount()
    expect(latest.preview([1, 1, 0])).toBe(false)
    latest.invalidate()
    latest.cancel()
    expect(animationPose.getSnapshot().pose).toBeNull()
    expect(editor.getState().asset.animations).toBe(source.animations)
    expect(editor.getState().asset.thumb).toBe('latest')
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
