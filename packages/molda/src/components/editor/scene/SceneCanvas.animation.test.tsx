import { expect, test } from 'bun:test'
import { act, render, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { SceneAnimationPose } from '../../../scene/sampleAnimation'
import { SceneValidationError } from '../../../scene/validation'
import { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import { SceneFlipbookPlayer } from '../../../state/SceneFlipbookPlayer'
import { animatedScene } from '../../../testing/sceneAnimation'
import type {
  SceneTransformActions,
  SceneViewportCallbacks,
  SceneViewportFactory,
} from '../../../viewport/sceneViewportTypes'
import { SceneCanvas } from './SceneCanvas'

function setup(transform?: SceneTransformActions) {
  let now = 0,
    nextId = 0
  const pending = new Map<number, () => void>()
  const clock = {
    now: () => now,
    request: (callback: () => void) => {
      pending.set(++nextId, callback)
      return nextId
    },
    cancel: (id: number) => {
      pending.delete(id)
    },
  }
  const animation = new SceneAnimationPlayer(clock),
    flipbook = new SceneFlipbookPlayer(clock)
  const ports: Array<{
    callbacks: SceneViewportCallbacks
    document: MoldaSceneDocument | null
    updates: number
    poses: Array<SceneAnimationPose | null>
    disposed: boolean
  }> = []
  let fail = false
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    const state: (typeof ports)[number] = {
      callbacks,
      document: null,
      updates: 0,
      poses: [],
      disposed: false,
    }
    ports.push(state)
    return {
      setDocument: (document) => {
        state.document = document
        state.updates++
        return []
      },
      setPose: (pose) => {
        if (pose && fail)
          throw new SceneValidationError('pose', 'Pose fora da precisão de desenho.')
        if (!state.disposed) state.poses.push(pose)
      },
      setSelection: () => {},
      setIsolation: () => {},
      setView: () => {},
      frame: () => {},
      setTransformTool: () => {},
      setAreaTool: () => {},
      setComponentSelection: () => {},
      setPaintTarget: () => {},
      setAnimationEditing: () => {},
      setSupportGuides: () => {},
      setSkinWeightTarget: () => {},
      setSkinPaintEnabled: () => {},
      setSkinPaintPreview: () => {},
      setImageFrame: () => {},
      cancelGesture: () => {},
      dispose: () => {
        state.disposed = true
      },
    }
  }
  const source = animatedScene()
  const content = (document: MoldaSceneDocument) => (
    <StrictMode>
      <SceneCanvas
        document={document}
        selection={[]}
        isolation={null}
        onSelect={() => {}}
        factory={factory}
        animation={animation}
        flipbook={flipbook}
        transform={transform}
      />
    </StrictMode>
  )
  const view = render(content(source))
  return {
    animation,
    source,
    ports,
    view,
    pending,
    tick: (time: number) => {
      now = time
      const callbacks = [...pending.values()]
      pending.clear()
      act(() => {
        for (const callback of callbacks) callback()
      })
    },
    rerender: (document: MoldaSceneDocument) => view.rerender(content(document)),
    fail: (value: boolean) => {
      fail = value
    },
  }
}

test('disposing a viewport cancels its captured transform and ignores a late successful pointer end', async () => {
  const endings: boolean[] = []
  const f = setup({
    begin: () => true,
    preview: () => true,
    end: (commit) => {
      endings.push(commit)
    },
  })
  try {
    await waitFor(() => expect(f.ports.at(-1)?.updates).toBe(1))
    const port = f.ports.at(-1)!
    expect(port.callbacks.transform!.begin()).toBe(true)
    f.view.unmount()
    port.callbacks.transform!.end(true)
    expect(endings).toEqual([false])
  } finally {
    f.view.unmount()
  }
})

test('canvas subscribes to poses directly without document updates per frame and keeps revision/lifecycle ownership', async () => {
  const f = setup()
  try {
    await waitFor(() => expect(f.ports.at(-1)?.updates).toBe(1))
    const port = f.ports.at(-1)!
    act(() => f.animation.setClip(f.source, 'clip'))
    act(() => f.animation.play())
    for (let i = 1; i <= 30; i++) f.tick(i * 16)
    expect(port.updates).toBe(1)
    expect(port.poses.at(-1)?.time).toBe(0.48)
    expect(port.poses.at(-1)?.source).toBe(f.source)
    expect(f.pending.size).toBe(1)
    act(() => port.callbacks.contextLost(true))
    expect(f.animation.getSnapshot().playing).toBe(false)
    expect(f.pending.size).toBe(0)
    act(() => port.callbacks.contextLost(false))
    expect(port.poses.at(-1)?.source).toBe(f.source)
    const next = { ...f.source, name: 'Nova revisão' }
    f.rerender(next)
    const afterChange = port.poses.length
    act(() => f.animation.seek(1))
    expect(port.poses).toHaveLength(afterChange)
    act(() => f.animation.setClip(next, 'clip'))
    expect(port.poses.at(-1)?.source).toBe(next)
    const updates = port.updates
    act(() => f.animation.play())
    f.tick(1000)
    expect(port.updates).toBe(updates)
    const late = [...f.pending.values()][0]!
    f.view.unmount()
    late()
    expect(f.pending.size).toBe(0)
    expect(f.ports.every((port) => port.disposed)).toBe(true)
  } finally {
    f.view.unmount()
    f.animation.setClip(null, null)
  }
})

test('draw failures stop playback, surface an error, and a subsequent valid seek recovers without remounting', async () => {
  const f = setup()
  try {
    await waitFor(() => expect(f.ports.at(-1)?.updates).toBe(1))
    const port = f.ports.at(-1)!
    act(() => f.animation.setClip(f.source, 'clip'))
    act(() => f.animation.play())
    f.fail(true)
    f.tick(500)
    expect(f.pending.size).toBe(0)
    expect(f.animation.getSnapshot()).toMatchObject({
      playing: false,
      error: 'Pose fora da precisão de desenho.',
    })
    expect(f.view.getByRole('alert').textContent).toContain('Pose fora da precisão')
    f.fail(false)
    act(() => f.animation.seek(0))
    expect(f.animation.getSnapshot().error).toBeNull()
    expect(f.view.queryByRole('alert')).toBeNull()
    expect(f.ports.at(-1)).toBe(port)
    expect(port.poses.at(-1)?.time).toBe(0)
    expect(port.updates).toBe(1)
  } finally {
    f.view.unmount()
    f.animation.setClip(null, null)
  }
})
