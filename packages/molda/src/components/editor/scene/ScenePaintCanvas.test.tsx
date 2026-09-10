import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { sceneBaseColor, scenePalette } from '../../../scene/composite'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeModel } from '../../../testing/fixtures'
import { ScenePaintCanvas } from './ScenePaintCanvas'
import { useScenePaint } from './useScenePaint'

function setup() {
  const source = migrateLegacyModel(makeModel()).document
  const image = source.images[0]!
  const material = source.materials.find((entry) => entry.colorImageId === image.id)!
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  function Harness() {
    const paint = useScenePaint(editor)
    const palette = scenePalette(source)
    return paint.data ? (
      <ScenePaintCanvas
        image={paint.data.image}
        palette={palette}
        base={sceneBaseColor(material, palette)}
        drawing={paint.drawing}
        actions={paint.actions}
      />
    ) : (
      <button
        type="button"
        onClick={() =>
          paint.open({
            nodeId: 'body',
            materialId: material.id,
            imageId: image.id,
            layerId: image.layers[0]!.id,
          })
        }
      >
        Open
      </button>
    )
  }
  const view = render(
    <StrictMode>
      <Harness />
    </StrictMode>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  const button = screen.getByRole('button', { name: COPY.scene.paintCanvas })
  const captured = new Set<number>()
  button.setPointerCapture = (id) => {
    captured.add(id)
  }
  button.hasPointerCapture = (id) => captured.has(id)
  button.releasePointerCapture = (id) => {
    captured.delete(id)
  }
  // A rectangular canvas with a non-zero page offset, not its larger button wrapper.
  button.querySelector('canvas')!.getBoundingClientRect = () => new DOMRect(20, 40, 160, 240)
  function pointer(type: string, x: number, y: number, pointerId = 1) {
    fireEvent(
      button,
      new PointerEvent(type, {
        bubbles: true,
        pointerId,
        button: 0,
        clientX: 25 + x * 10,
        clientY: 275 - y * 10,
      }),
    )
  }
  return {
    editor,
    source,
    captured,
    button,
    pointer,
    close() {
      view.unmount()
      editor.getState().dispose()
    },
  }
}

test('2D pointer painting uses actual rectangular UV bounds, final release sample and one undo', () => {
  const f = setup()
  try {
    f.pointer('pointerdown', 0, 0)
    expect(f.captured.has(1)).toBe(true)
    f.pointer('pointermove', 1, 0)
    f.pointer('pointerup', 3, 0)
    expect(f.editor.getState().asset.images[0]!.layers[0]!.pixels.slice(0, 4)).toEqual(
      new Uint8Array([7, 7, 7, 7]),
    )
    expect(f.editor.getState().asset.images[0]!.layers[0]!.pixels.slice(16)).toEqual(
      f.source.images[0]!.layers[0]!.pixels.slice(16),
    )
    expect(f.captured.size).toBe(0)
    act(() => f.editor.getState().undo())
    expect(f.editor.getState().asset.images).toEqual(f.source.images)
    expect(f.editor.getState().canUndo).toBe(false)
    f.pointer('pointerdown', 0, 1)
    f.pointer('pointermove', -10, 1)
    f.pointer('pointerup', 4, 1)
    expect(f.editor.getState().asset.images[0]!.layers[0]!.pixels.slice(17, 20)).toEqual(
      f.source.images[0]!.layers[0]!.pixels.slice(17, 20),
    )
  } finally {
    f.close()
  }
})

test('2D blur, second touch and failed capture cancel without committing partial pixels', () => {
  const f = setup()
  try {
    f.pointer('pointerdown', 1, 0)
    act(() => window.dispatchEvent(new Event('blur')))
    f.pointer('pointerup', 2, 0)
    expect(f.editor.getState().asset.images).toEqual(f.source.images)
    expect(f.captured.size).toBe(0)
    f.pointer('pointerdown', 1, 0)
    f.pointer('pointerdown', 2, 0, 2)
    f.pointer('pointerup', 3, 0)
    expect(f.editor.getState().asset.images).toEqual(f.source.images)
    f.button.setPointerCapture = () => {
      throw new Error('Detached canvas')
    }
    f.pointer('pointerdown', 1, 0)
    f.pointer('pointerup', 3, 0)
    expect(f.editor.getState().asset.images).toEqual(f.source.images)
    expect(f.editor.getState().canUndo).toBe(false)
  } finally {
    f.close()
  }
})

test('an external revision invalidates a captured stroke and late input cannot overwrite it', () => {
  const f = setup()
  try {
    f.pointer('pointerdown', 1, 0)
    const external = { ...f.source, name: 'Outra revisão' }
    act(() => f.editor.getState().commit(external))
    const accepted = f.editor.getState().asset
    f.pointer('pointermove', 4, 0)
    f.pointer('pointerup', 6, 0)
    expect(f.editor.getState().asset).toBe(accepted)
    expect(f.editor.getState().asset.images).toEqual(f.source.images)
    expect(f.captured.size).toBe(0)
  } finally {
    f.close()
  }
})
