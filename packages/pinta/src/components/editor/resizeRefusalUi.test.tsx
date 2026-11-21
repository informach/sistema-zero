import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { resizeTargetOf } from '../../core/assetResize'
import { COPY } from '../../core/copy'
import { createPixelBackgroundAsset } from '../../core/project'
import { createClipboardStore } from '../../state/clipboardStore'
import type { PintaEditorStore } from '../../state/editorStore'
import { createEditorStore } from '../../state/editorStore'
import { createGalleryStore } from '../../state/galleryStore'
import { createPaletteLibraryStore } from '../../state/paletteLibraryStore'
import { createPintaPersistence } from '../../state/persistence'
import { PintaAppProvider } from '../appContext'
import { ToastProvider } from '../ui/Toast'
import { EditorScreen } from './EditorScreen'
import { ResizeAssetDialog } from './ResizeAssetDialog'
import '../../testing/idbMock'

test('a refused resize keeps the dialog and original drawing instead of announcing success', async () => {
  const asset = createPixelBackgroundAsset({ name: 'Céu', width: 32, height: 32 }),
    target = resizeTargetOf(asset)!
  const editor = createEditorStore({ asset, persist: async () => {}, acceptEdit: () => false })
  const persistence = createPintaPersistence({ namespace: `resize-refusal-${crypto.randomUUID()}` })
  let closed = 0
  render(
    <PintaAppProvider
      value={{
        adapter: {},
        gallery: createGalleryStore(persistence),
        persistence,
        clipboard: createClipboardStore({ mirror: null }),
        paletteLibrary: createPaletteLibraryStore(persistence),
        openAsset: () => {},
        closeEditor: () => {},
        takeInitialIntent: () => null,
        initialIntentVersion: 0,
        requestInitialIntent: () => {},
        takeInitialAssetId: () => null,
      }}
    >
      <ToastProvider>
        <ResizeAssetDialog
          open
          asset={asset}
          target={target}
          onClose={() => {
            closed++
          }}
          onResize={(next) => editor.getState().commit(next)}
        />
      </ToastProvider>
    </PintaAppProvider>,
  )
  fireEvent.change(screen.getByLabelText(COPY.newAsset.customSize.width), {
    target: { value: '64' },
  })
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.apply }))
  expect(closed).toBe(0)
  expect(editor.getState().asset).toBe(asset)
  expect(editor.getState().canUndo).toBe(false)
  expect(
    screen.getByText('Não consegui mudar o tamanho. Seus desenhos foram mantidos.'),
  ).toBeTruthy()
  await editor.getState().flush()
})

test('the real topbar refuses a stale resize rather than overwriting artwork adopted before React renders', async () => {
  const asset = createPixelBackgroundAsset({ name: 'Céu', width: 32, height: 32 })
  asset.cels[0]!.data.fill(1)
  const persistence = createPintaPersistence({ namespace: `resize-stale-${crypto.randomUUID()}` })
  await persistence.persistAssets([asset])
  const gallery = createGalleryStore(persistence)
  await gallery.getState().load()
  const live: { editor?: PintaEditorStore } = {}
  render(
    <PintaAppProvider
      value={{
        adapter: {},
        gallery,
        persistence,
        clipboard: createClipboardStore({ mirror: null }),
        paletteLibrary: createPaletteLibraryStore(persistence),
        openAsset: () => {},
        closeEditor: () => {},
        takeInitialIntent: () => null,
        initialIntentVersion: 0,
        requestInitialIntent: () => {},
        takeInitialAssetId: () => null,
        onEditorReady: (editor) => {
          if (editor) live.editor = editor
        },
      }}
    >
      <ToastProvider>
        <EditorScreen assetId={asset.id} />
      </ToastProvider>
    </PintaAppProvider>,
  )
  await waitFor(() => expect(live.editor).toBeTruthy())
  const tip = screen.queryByRole('button', { name: 'Entendi!' })
  if (tip) fireEvent.click(tip)
  fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.button(32, 32) }))
  fireEvent.change(screen.getByLabelText(COPY.newAsset.customSize.width), {
    target: { value: '64' },
  })
  const editor = live.editor
  if (!editor) throw Error('Editor ausente')
  const current = editor.getState().asset
  if (current.kind !== 'pixel-background') throw Error('Desenho ausente')
  const adopted = {
    ...current,
    name: 'qa-adotado',
    cels: current.cels.map((cel) => ({ ...cel, data: new Uint8Array(cel.data.length).fill(3) })),
  }
  act(() => {
    editor.getState().replace(adopted)
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.resize.apply }))
  })
  try {
    expect(editor.getState().asset.name).toBe('qa-adotado')
    const after = editor.getState().asset
    if (after.kind !== 'pixel-background') throw Error('Desenho ausente')
    expect(after.cels[0]!.data[0]).toBe(3)
    expect(after.cels[0]!.width).toBe(32)
    expect(editor.getState().canUndo).toBe(false)
    expect(screen.getByRole('dialog', { name: COPY.editor.resize.title })).toBeTruthy()
    expect(screen.getByText(COPY.editor.resize.refused)).toBeTruthy()
    expect(screen.queryByText(COPY.editor.resize.done)).toBeNull()
  } finally {
    await act(async () => {
      await editor.getState().flush()
    })
  }
})
