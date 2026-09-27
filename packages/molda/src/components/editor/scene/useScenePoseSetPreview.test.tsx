import { expect, test } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { structuredBytes } from '../../../core/structuredBytes'
import { captureSceneAnimationPoseSet } from '../../../scene/animationPoseSet'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeSceneTwoBoneFixture } from '../../../testing/sceneTwoBone'
import { useScenePoseSetPreview } from './useScenePoseSetPreview'
import { useSceneWorkshop } from './useSceneWorkshop'

test('closed panels cannot start a preview and their callbacks stay revoked after reopening', () => {
  const source = makeSceneTwoBoneFixture()
  const copied = captureSceneAnimationPoseSet(source, 'clip', ['root'], 0)
  copied.entries[0]!.pose.translation = [0, 1, 0]
  const pairs = [{ sourceId: 'root', targetId: 'root' }]
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  const view = renderHook(
    ({ open }) => {
      const workshop = useSceneWorkshop(editor)
      return { workshop, input: useScenePoseSetPreview(workshop, 'clip', 0, open) }
    },
    { initialProps: { open: false }, wrapper: StrictMode },
  )
  try {
    const { animation, animationPose } = view.result.current.workshop
    act(() => animation.setClip(source, 'clip'))
    const closed = view.result.current.input
    act(() => expect(closed.preview(copied, pairs)).toBe(false))
    view.rerender({ open: true })
    const previous = view.result.current.input
    act(() => expect(previous.preview(copied, pairs)).toBe(true))
    view.rerender({ open: false })
    expect(animationPose.getSnapshot().pose).toBeNull()
    act(() => expect(previous.preview(copied, pairs)).toBe(false))
    view.rerender({ open: true })
    act(() => expect(view.result.current.input.preview(copied, pairs)).toBe(true))
    const pose = animationPose.getSnapshot().pose
    act(() => {
      previous.cancel()
      closed.cancel()
      expect(previous.preview(copied, pairs)).toBe(false)
    })
    expect(animationPose.getSnapshot().pose).toBe(pose)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('mapped-pose forms revoke old scopes and do not steal a replacement on the same source/time, including reentrancy', () => {
  const source = makeSceneTwoBoneFixture()
  const copied = captureSceneAnimationPoseSet(source, 'clip', ['root', 'middle'], 0)
  copied.entries[0]!.pose.translation = [0.25, 0.5, 0]
  const pairs = copied.entries.map((entry) => ({ sourceId: entry.nodeId, targetId: entry.nodeId }))
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => {} },
    autosaveMs: 60_000,
  })
  const view = renderHook(
    ({ time }) => {
      const workshop = useSceneWorkshop(editor)
      return { workshop, input: useScenePoseSetPreview(workshop, 'clip', time, true) }
    },
    { initialProps: { time: 0 }, wrapper: StrictMode },
  )
  try {
    const { animation, animationPose } = view.result.current.workshop
    act(() => animation.setClip(source, 'clip'))
    const old = view.result.current.input
    act(() => expect(old.preview(copied, pairs)).toBe(true))
    act(() => view.result.current.workshop.select('root', false))
    const selected = view.result.current.input
    act(() => expect(selected.preview(copied, pairs)).toBe(true))
    const pose = animationPose.getSnapshot().pose
    act(() => {
      old.cancel()
      expect(old.preview(copied, pairs)).toBe(false)
    })
    expect(animationPose.getSnapshot().pose).toBe(pose)
    act(() => animationPose.beginTwoBone(['root', 'middle', 'tip']))
    const other = animationPose.getSnapshot()
    act(() => {
      selected.cancel()
      expect(selected.preview(copied, pairs)).toBe(false)
    })
    expect(animationPose.getSnapshot()).toBe(other)
    act(() => animationPose.cancel())
    let armed = true
    const off = animationPose.subscribe(() => {
      if (armed && animationPose.getSnapshot().kind === 'pose-set') {
        armed = false
        selected.cancel()
      }
    })
    act(() => expect(selected.preview(copied, pairs)).toBe(false))
    off()
    expect(animationPose.getSnapshot().pose).toBeNull()
    act(() => expect(selected.preview(copied, pairs)).toBe(true))
    act(() => animation.seek(1))
    view.rerender({ time: 1 })
    const latest = view.result.current.input
    act(() => expect(latest.preview(copied, pairs)).toBe(true))
    act(() => {
      selected.cancel()
      expect(selected.preview(copied, pairs)).toBe(false)
    })
    expect(animationPose.getSnapshot().kind).toBe('pose-set')
    view.unmount()
    expect(latest.preview(copied, pairs)).toBe(false)
    expect(animationPose.getSnapshot().kind).toBeNull()
    expect(editor.getState().asset).toBe(source)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})
