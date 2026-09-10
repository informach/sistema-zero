import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { transformPoint } from '../../../scene/matrix'
import { createSceneSkin } from '../../../scene/skinCommands'
import { createDocumentEditorStore } from '../../../state/editorStore'
import type { SceneSkinPaintPreview } from '../../../state/sceneSkinPaintGesture'
import { makeSceneSkinFixture } from '../../../testing/sceneSkin'
import type {
  SceneViewportCallbacks,
  SceneViewportFactory,
} from '../../../viewport/sceneViewportTypes'
import { SceneWorkshop } from './SceneWorkshop'

async function setup() {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    source = createSceneSkin(document, input, () => id),
    editor = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      autosaveMs: 60000,
      persistence: { save: async () => undefined },
    }),
    ports: Array<{
      callbacks: SceneViewportCallbacks
      enabled: boolean
      radius: number | undefined
      updates: number
      previews: Array<SceneSkinPaintPreview | null>
      disposed: boolean
    }> = [],
    factory: SceneViewportFactory = (_canvas, callbacks) => {
      const state: (typeof ports)[number] = {
        callbacks,
        enabled: false,
        radius: undefined,
        updates: 0,
        previews: [],
        disposed: false,
      }
      ports.push(state)
      return {
        setDocument: () => {
          state.updates++
          return []
        },
        setSelection: () => {},
        setIsolation: () => {},
        setView: () => {},
        frame: () => {},
        setTransformTool: () => {},
        setAreaTool: () => {},
        setComponentSelection: () => {},
        setPaintTarget: () => {},
        setImageFrame: () => {},
        setPose: () => {},
        setAnimationEditing: () => {},
        setSupportGuides: () => {},
        setSkinWeightTarget: () => {},
        setSkinPaintEnabled: (enabled, radius) => {
          state.enabled = enabled
          state.radius = radius
        },
        setSkinPaintPreview: (preview) => {
          state.previews.push(preview)
        },
        cancelGesture: () => {},
        renderThumb: () => null,
        dispose: () => {
          state.disposed = true
        },
      }
    },
    view = render(
      <StrictMode>
        <SceneWorkshop editor={editor} viewportFactory={factory} />
      </StrictMode>,
    ),
    mesh = source.geometries[0]!
  if (mesh.kind !== 'mesh') throw new Error('Mesh expected')
  await waitFor(() => expect(ports.length).toBeGreaterThan(0))
  const port = ports.at(-1)!,
    sample = {
      faceId: 'f_0_0',
      point: transformPoint(
        indexSceneDocument(source).scene.worldMatrices.get(input.nodeId)!,
        mesh.vertices.v_0_0!,
      ),
    }
  act(() => port.callbacks.select('part-0', false))
  fireEvent.click(screen.getByRole('button', { name: COPY.scene.editSkinBase }))
  fireEvent.change(screen.getByLabelText(COPY.scene.weightMap.title), {
    target: { value: 'upper' },
  })
  fireEvent.click(screen.getByRole('button', { name: COPY.scene.skinPaint.add }))
  fireEvent.change(screen.getByLabelText(COPY.scene.skinPaint.radius), { target: { value: '0.1' } })
  return { editor, source, view, port, ports, sample, factory }
}

test('workshop brush controls preview without document renders, preserve thumbnails and apply one undo in StrictMode', async () => {
  const { editor, source, view, port, ports, sample } = await setup(),
    copy = COPY.scene.skinPaint
  try {
    expect(port.enabled).toBe(true)
    expect(port.radius).toBe(0.1)
    expect(screen.getByText(copy.reachHint)).not.toBeNull()
    expect(screen.getByText(copy.previewHint)).not.toBeNull()
    const updates = port.updates
    act(() => {
      expect(port.callbacks.skinPaint!.begin(sample)).toBe(true)
      for (let i = 0; i < 40; i++) port.callbacks.skinPaint!.move(sample)
    })
    expect(port.updates).toBe(updates)
    expect(port.previews.filter((preview) => preview?.delta.size)).toHaveLength(1)
    expect(screen.getByText(copy.painting(1))).not.toBeNull()
    expect(editor.getState().asset).toBe(source)
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().setThumb('data:image/png;base64,new'))
    expect(screen.getByText(copy.painting(1))).not.toBeNull()
    act(() => port.callbacks.skinPaint!.end(true))
    expect(screen.getByText(copy.applied(1))).not.toBeNull()
    expect(editor.getState().asset.thumb).toBe('data:image/png;base64,new')
    expect(editor.getState().asset.skins![0]!.weights.v_0_0![0]!.weight).toBe(0.25)
    expect(editor.getState().asset.skins![0]!.joints).toBe(source.skins![0]!.joints)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.undo }))
    expect(editor.getState().asset.skins).toEqual(source.skins)
    expect(editor.getState().canUndo).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: copy.off }))
    expect(port.enabled).toBe(false)
    expect(port.radius).toBeUndefined()
    expect(screen.getByText(COPY.scene.weightMap.hint)).not.toBeNull()
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
  expect(ports.every((port) => port.disposed)).toBe(true)
})

test.each([
  'escape',
  'radius',
  'strength',
  'bone',
  'tool',
  'camera',
  'context',
  'blur',
  'mode',
  'selection',
  'finish',
  'external',
  'undo-noop',
  'unmount',
] as const)('%s cancels workshop weight preview and its late completion cannot write', async (interruption) => {
  const { editor, source, view, port, sample } = await setup(),
    copy = COPY.scene.skinPaint
  try {
    act(() => expect(port.callbacks.skinPaint!.begin(sample)).toBe(true))
    switch (interruption) {
      case 'escape':
        fireEvent.keyDown(screen.getByRole('region', { name: COPY.scene.componentViewport }), {
          key: 'Escape',
        })
        break
      case 'radius':
        fireEvent.change(screen.getByLabelText(copy.radius), { target: { value: '2' } })
        expect(port.radius).toBe(2)
        break
      case 'strength':
        fireEvent.change(screen.getByLabelText(copy.strength), { target: { value: '75' } })
        break
      case 'bone':
        fireEvent.change(screen.getByLabelText(COPY.scene.weightMap.title), {
          target: { value: 'lower' },
        })
        break
      case 'tool':
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.selectBox }))
        break
      case 'camera':
        fireEvent.click(screen.getByRole('button', { name: COPY.editor.model.views.front }))
        break
      case 'context':
        act(() => port.callbacks.contextLost(true))
        break
      case 'blur':
        act(() => window.dispatchEvent(new Event('blur')))
        break
      case 'mode':
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.animationMode }))
        break
      case 'selection':
        act(() => port.callbacks.selectComponent?.('v_0_0', false))
        break
      case 'finish':
        fireEvent.click(screen.getByRole('button', { name: COPY.scene.finishFaces }))
        break
      case 'external':
        act(() => editor.getState().commit({ ...source, name: 'Another edit' }))
        break
      case 'undo-noop':
        fireEvent.keyDown(screen.getByRole('region', { name: COPY.scene.title }), {
          key: 'z',
          ctrlKey: true,
        })
        break
      case 'unmount':
        view.unmount()
        break
    }
    const current = editor.getState().asset
    act(() => {
      port.callbacks.skinPaint!.move(sample)
      port.callbacks.skinPaint!.end(true)
    })
    expect(editor.getState().asset).toBe(current)
    expect(current.skins).toBe(source.skins)
    expect(editor.getState().contentRevision).toBe(interruption === 'external' ? 1 : 0)
    expect(port.previews.at(-1)).toBeNull()
    if (interruption === 'escape') {
      expect(screen.getByRole('button', { name: COPY.scene.finishFaces })).not.toBeNull()
      expect(screen.getByRole('button', { name: copy.off }).getAttribute('aria-pressed')).toBe(
        'true',
      )
    }
    if (interruption === 'context' || interruption === 'unmount')
      act(() => expect(port.callbacks.skinPaint!.begin(sample)).toBe(false))
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('empty radius disables drawing, and subtracting without a recipient explains the unchanged points', async () => {
  const { editor, source, view, port, sample } = await setup(),
    copy = COPY.scene.skinPaint
  try {
    fireEvent.change(screen.getByLabelText(copy.radius), { target: { value: '' } })
    expect(screen.getByText(copy.radiusInvalid)).not.toBeNull()
    expect(port.enabled).toBe(false)
    act(() => expect(port.callbacks.skinPaint!.begin(sample)).toBe(false))
    fireEvent.change(screen.getByLabelText(copy.radius), { target: { value: '0.1' } })
    fireEvent.change(screen.getByLabelText(COPY.scene.weightMap.title), {
      target: { value: 'lower' },
    })
    fireEvent.click(screen.getByRole('button', { name: copy.subtract }))
    act(() => {
      port.callbacks.skinPaint!.begin(sample)
      port.callbacks.skinPaint!.end(true)
    })
    expect(screen.getByText(copy.refusals['no-recipient'](1))).not.toBeNull()
    expect(screen.getByText(copy.applied(0))).not.toBeNull()
    expect(editor.getState().asset).toBe(source)
    expect(editor.getState().canUndo).toBe(false)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('a replacement viewport revokes old input while a fresh stroke uses the new attachment', async () => {
  const { editor, source, view, port, ports, sample, factory } = await setup(),
    replacement: SceneViewportFactory = (...args) => factory(...args)
  try {
    act(() => expect(port.callbacks.skinPaint!.begin(sample)).toBe(true))
    view.rerender(
      <StrictMode>
        <SceneWorkshop editor={editor} viewportFactory={replacement} />
      </StrictMode>,
    )
    await waitFor(() => expect(ports.at(-1)).not.toBe(port))
    const next = ports.at(-1)!
    expect(next.enabled).toBe(true)
    expect(port.disposed).toBe(true)
    expect(editor.getState().asset).toBe(source)
    act(() => {
      expect(next.callbacks.skinPaint!.begin(sample)).toBe(true)
      expect(port.callbacks.skinPaint!.begin(sample)).toBe(false)
      port.callbacks.skinPaint!.move(sample)
      port.callbacks.skinPaint!.end(true)
    })
    expect(editor.getState().asset).toBe(source)
    act(() => next.callbacks.skinPaint!.end(true))
    expect(editor.getState().contentRevision).toBe(1)
    expect(editor.getState().asset.skins![0]!.weights.v_0_0![0]!.weight).toBe(0.25)
  } finally {
    view.unmount()
    editor.getState().dispose()
  }
})

test('replacing an editor with identical IDs and revision cannot commit its old stroke into either store', async () => {
  const { editor, source, view, port, sample, factory } = await setup(),
    next = createDocumentEditorStore({
      asset: source,
      sizeOf: structuredBytes,
      autosaveMs: 60000,
      persistence: { save: async () => undefined },
    })
  try {
    act(() => expect(port.callbacks.skinPaint!.begin(sample)).toBe(true))
    view.rerender(
      <StrictMode>
        <SceneWorkshop editor={next} viewportFactory={factory} />
      </StrictMode>,
    )
    act(() => port.callbacks.skinPaint!.end(true))
    expect(editor.getState().asset).toBe(source)
    expect(next.getState().asset).toBe(source)
    act(() => {
      expect(port.callbacks.skinPaint!.begin(sample)).toBe(true)
      port.callbacks.skinPaint!.end(true)
    })
    expect(editor.getState().canUndo).toBe(false)
    expect(next.getState().contentRevision).toBe(1)
  } finally {
    view.unmount()
    editor.getState().dispose()
    next.getState().dispose()
  }
})

test('hidden pages cancel a held stroke and reject new input until visible', async () => {
  const { editor, source, view, port, sample } = await setup(),
    descriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
  try {
    act(() => expect(port.callbacks.skinPaint!.begin(sample)).toBe(true))
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    act(() => {
      port.callbacks.skinPaint!.end(true)
      expect(port.callbacks.skinPaint!.begin(sample)).toBe(false)
    })
    expect(editor.getState().asset).toBe(source)
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
      document.dispatchEvent(new Event('visibilitychange'))
      expect(port.callbacks.skinPaint!.begin(sample)).toBe(true)
      port.callbacks.skinPaint!.end(true)
    })
    expect(editor.getState().contentRevision).toBe(1)
  } finally {
    if (descriptor) Object.defineProperty(document, 'hidden', descriptor)
    else Reflect.deleteProperty(document, 'hidden')
    view.unmount()
    editor.getState().dispose()
  }
})
