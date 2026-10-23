import { expect, test } from 'bun:test'
import { act, fireEvent, render, waitFor } from '@testing-library/react'
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

function setup(transform?: SceneTransformActions, selected: readonly string[] = []) {
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
    spaces: Array<'world' | 'local' | 'pivot'>
    supports: boolean[]
    disposed: boolean
  }> = []
  let fail = false
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    const state: (typeof ports)[number] = {
      callbacks,
      document: null,
      updates: 0,
      poses: [],
      spaces: [],
      supports: [],
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
      setTransformSpace: (space) => state.spaces.push(space),
      setAreaTool: () => {},
      setComponentSelection: () => {},
      setPaintTarget: () => {},
      setAnimationEditing: () => {},
      setSupportGuides: (enabled) => state.supports.push(enabled),
      setSkinWeightTarget: () => {},
      setSkinPaintEnabled: () => {},
      setSkinPaintPreview: () => {},
      setImageFrame: () => {},
      cancelGesture: () => {},
      renderThumb: () => null,
      dispose: () => {
        state.disposed = true
      },
    }
  }
  const source = animatedScene()
  const content = (document: MoldaSceneDocument, mode: 'model' | 'animation' = 'model') => (
    <StrictMode>
      <SceneCanvas
        document={document}
        selection={selected}
        isolation={null}
        onSelect={() => {}}
        factory={factory}
        animation={animation}
        flipbook={flipbook}
        transform={transform}
        mode={mode}
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
    setMode: (mode: 'model' | 'animation', document = source) =>
      view.rerender(content(document, mode)),
    fail: (value: boolean) => {
      fail = value
    },
  }
}

test('animation starts on the piece axes and keeps its explicit choice separate from modeling', async () => {
  const f = setup()
  try {
    await waitFor(() => expect(f.ports.at(-1)?.updates).toBe(1))
    const spaces = () => f.ports.at(-1)!.spaces
    expect(spaces().at(-1)).toBe('world')
    f.setMode('animation')
    expect(spaces().at(-1)).toBe('local')
    fireEvent.change(f.view.getByLabelText('Eixos de Mover e Girar'), {
      target: { value: 'world' },
    })
    expect(spaces().at(-1)).toBe('world')
    f.setMode('model')
    fireEvent.change(f.view.getByLabelText('Eixos de Mover e Girar'), {
      target: { value: 'local' },
    })
    expect(spaces().at(-1)).toBe('local')
    f.setMode('animation')
    expect(spaces().at(-1)).toBe('world')
    f.setMode('model')
    expect(spaces().at(-1)).toBe('local')
  } finally {
    f.view.unmount()
  }
})

test('saved pivot face axis becomes the selected rotation space in modeling and animation', async () => {
  const initial = animatedScene()
  const id = initial.nodes[0]!.id
  const f = setup(undefined, [id])
  try {
    const aligned = {
      ...f.source,
      nodes: f.source.nodes.map((node) =>
        node.id === id
          ? { ...node, pivotAxis: [Math.SQRT1_2, Math.SQRT1_2, 0] as [number, number, number] }
          : node,
      ),
    }
    f.rerender(aligned)
    await waitFor(() => expect(f.ports.at(-1)?.spaces.at(-1)).toBe('pivot'))
    const select = f.view.getByLabelText('Eixos de Mover e Girar')
    expect((select as HTMLSelectElement).value).toBe('pivot')
    fireEvent.change(select, { target: { value: 'world' } })
    expect(f.ports.at(-1)?.spaces.at(-1)).toBe('world')
    f.setMode('animation', aligned)
    await waitFor(() => expect(f.ports.at(-1)?.spaces.at(-1)).toBe('pivot'))
  } finally {
    f.view.unmount()
  }
})

test('bones become visible and selectable when entering animation', async () => {
  const f = setup()
  try {
    await waitFor(() => expect(f.ports.at(-1)?.supports.at(-1)).toBe(false))
    f.setMode('animation')
    expect(f.ports.at(-1)?.supports.at(-1)).toBe(true)
    f.setMode('model')
    expect(f.ports.at(-1)?.supports.at(-1)).toBe(false)
  } finally {
    f.view.unmount()
  }
})

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
