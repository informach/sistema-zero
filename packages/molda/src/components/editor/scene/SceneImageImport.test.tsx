import { expect, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { encodePng } from '../../../export/png'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { makeModel } from '../../../testing/fixtures'
import { installReferenceImageRuntime } from '../../../testing/referenceImageRuntime'
import { SceneImageImport } from './SceneImageImport'

test('local file import previews before one undoable commit and rejects pending or previewed work from a replaced source', async () => {
  const runtime = installReferenceImageRuntime()
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 255, 17, 33, 65, 0,
  ])
  const context = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
    drawImage: () => {},
    getImageData: () => ({ data: pixels }),
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: () => {},
  })) as unknown as HTMLCanvasElement['getContext'])
  const source = migrateLegacyModel(makeModel()).document
  const materialId = source.materials.find((m) => m.colorImageId)!.id
  const editor = createDocumentEditorStore({
    asset: source,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  function Harness() {
    const document = useStore(editor, (state) => state.asset)
    return (
      <SceneImageImport
        source={document}
        materialId={materialId}
        disabled={false}
        apply={(command) => {
          const next = command(editor.getState().asset)
          editor.getState().commit(next)
          return next
        }}
      />
    )
  }
  const view = render(
    <StrictMode>
      <Harness />
    </StrictMode>,
  )
  const file = new File([new Uint8Array(encodePng(new Uint8Array(pixels), 2, 2))], 'cores.png')
  const choose = () =>
    fireEvent.change(screen.getByLabelText(COPY.scene.imageImportChoose), {
      target: { files: [file] },
    })
  try {
    choose()
    await waitFor(() => expect(runtime.images.length).toBe(1))
    expect(editor.getState().asset).toBe(source)
    await act(async () => runtime.images[0]!.finish())
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: COPY.scene.imageImportConfirm }) !== null).toBe(
        true,
      ),
    )
    expect(editor.getState().canUndo).toBe(false)
    expect(runtime.revoke).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageImportConfirm }))
    expect(editor.getState().asset.images.at(-1)!.layers[0]!.pixels).toEqual(
      new Uint8Array([...pixels.slice(8), ...pixels.slice(0, 8)]),
    )
    expect(screen.queryByRole('button', { name: COPY.scene.imageImportConfirm }) === null).toBe(
      true,
    )
    act(() => editor.getState().undo())
    expect(editor.getState().asset.images).toEqual(source.images)
    expect(editor.getState().canUndo).toBe(false)
    choose()
    await waitFor(() => expect(runtime.images.length).toBe(2))
    act(() => editor.getState().commit({ ...editor.getState().asset, name: 'Revisão externa' }))
    const external = editor.getState().asset
    expect(runtime.images[1]!.removed).toBe(true)
    await act(async () => runtime.images[1]!.finish())
    expect(editor.getState().asset).toBe(external)
    expect(screen.queryByRole('button', { name: COPY.scene.imageImportConfirm }) === null).toBe(
      true,
    )
    choose()
    await waitFor(() => expect(runtime.images.length).toBe(3))
    await act(async () => runtime.images[2]!.finish())
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: COPY.scene.imageImportConfirm }) !== null).toBe(
        true,
      ),
    )
    act(() => editor.getState().undo())
    expect(screen.queryByRole('button', { name: COPY.scene.imageImportConfirm }) === null).toBe(
      true,
    )
    choose()
    await waitFor(() => expect(runtime.images.length).toBe(4))
    fireEvent.click(screen.getByRole('button', { name: COPY.scene.imageImportCancel }))
    await act(async () => runtime.images[3]!.finish())
    expect(screen.queryByRole('button', { name: COPY.scene.imageImportConfirm }) === null).toBe(
      true,
    )
    expect(editor.getState().canUndo).toBe(false)
    expect(runtime.revoke).toHaveBeenCalledTimes(4)
  } finally {
    view.unmount()
    editor.getState().dispose()
    context.mockRestore()
    runtime.restore()
  }
})
