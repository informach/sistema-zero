import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createTilemapAsset } from '../../core/project'
import { createClipboardStore } from '../../state/clipboardStore'
import { createEditorStore } from '../../state/editorStore'
import { createGalleryStore } from '../../state/galleryStore'
import { createPaletteLibraryStore } from '../../state/paletteLibraryStore'
import { createPintaPersistence } from '../../state/persistence'
import { createSessionStore } from '../../state/sessionStore'
import { PintaAppProvider } from '../appContext'
import { ToastProvider } from '../ui/Toast'
import { PintaEditorProvider, useEditor } from './editorContext'
import { MapLayerPanel } from './MapLayerPanel'

function setup() {
  const base = createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 2, rows: 2 }),
    editor = createEditorStore({ asset: base, autosaveDelayMs: 100000, persist: async () => {} }),
    persistence = createPintaPersistence({ namespace: 'layer-gesture' }),
    app = {
      adapter: {},
      gallery: createGalleryStore(),
      persistence,
      clipboard: createClipboardStore({ mirror: null }),
      paletteLibrary: createPaletteLibraryStore(persistence),
      openAsset: () => {},
      closeEditor: () => {},
      takeInitialIntent: () => null,
      initialIntentVersion: 0,
      requestInitialIntent: () => {},
      takeInitialAssetId: () => null,
    },
    session = createSessionStore()
  function Host() {
    const asset = useEditor((state) => state.asset)
    if (asset.kind !== 'tilemap') throw Error('Mapa esperado')
    return (
      <MapLayerPanel
        tilemap={asset}
        activeLayerId={base.layers[0]!.id}
        layerTilesetChoices={[]}
        onSelectLayer={() => {}}
        onToggleFront={() => {}}
        onToggleVisible={() => {}}
        onRemoveLayer={() => {}}
        onAddLayer={() => {}}
        onAddObjectLayer={() => {}}
        onSetLayerTileset={() => {}}
      />
    )
  }
  const view = render(
    <PintaAppProvider value={app}>
      <ToastProvider>
        <PintaEditorProvider value={{ editor, session }}>
          <Host />
        </PintaEditorProvider>
      </ToastProvider>
    </PintaAppProvider>,
  )
  return { editor, base, slider: screen.getByRole('slider'), view }
}

for (const ending of ['change', 'release', 'cancel'])
  test(`opacidade: revisão do mesmo ID sobrevive a ${ending}`, async () => {
    const { editor, slider } = setup()
    fireEvent.pointerDown(slider, { pointerId: 1 })
    fireEvent.change(slider, { target: { value: '50' } })
    const changed = editor.getState().asset
    expect(changed.kind === 'tilemap' && changed.layers[0]?.opacity).toBe(0.5)
    act(() => editor.getState().replace({ ...editor.getState().asset, name: 'revisao-externa' }))
    const adopted = editor.getState().asset
    if (ending === 'change') fireEvent.change(slider, { target: { value: '25' } })
    if (ending === 'cancel') fireEvent.pointerCancel(slider, { pointerId: 1 })
    fireEvent.pointerUp(slider, { pointerId: 1 })
    expect(editor.getState().asset).toBe(adopted)
    expect(editor.getState().canUndo).toBe(false)
    await editor.getState().flush()
  })

for (const ending of ['cancel', 'escape', 'unmount'])
  test(`opacidade: ${ending} descarta o gesto`, async () => {
    const { editor, base, slider, view } = setup()
    fireEvent.pointerDown(slider, { pointerId: 1 })
    fireEvent.change(slider, { target: { value: '50' } })
    if (ending === 'unmount') view.unmount()
    else if (ending === 'escape') fireEvent.keyDown(slider, { key: 'Escape' })
    else fireEvent.pointerCancel(slider, { pointerId: 1 })
    fireEvent.pointerUp(slider, { pointerId: 1 })
    expect({ ...editor.getState().asset, updatedAt: base.updatedAt }).toEqual(base)
    expect(editor.getState().canUndo).toBe(false)
    await editor.getState().flush()
  })

test('opacidade: um gesto aceito conserva um desfazer/refazer', async () => {
  const { editor, base, slider } = setup()
  fireEvent.pointerDown(slider, { pointerId: 1 })
  fireEvent.change(slider, { target: { value: '70' } })
  fireEvent.change(slider, { target: { value: '50' } })
  fireEvent.pointerUp(slider, { pointerId: 1 })
  expect(editor.getState().canUndo).toBe(true)
  act(() => editor.getState().undo())
  expect(editor.getState().asset).toBe(base)
  expect(editor.getState().canUndo).toBe(false)
  act(() => editor.getState().redo())
  const actual = editor.getState().asset
  expect(actual.kind === 'tilemap' && actual.layers[0]?.opacity).toBe(0.5)
  await editor.getState().flush()
})

test('opacidade: soltar uma tecla durante o arrasto não fecha a propriedade do ponteiro', async () => {
  const { editor, slider } = setup()
  fireEvent.pointerDown(slider, { pointerId: 1 })
  fireEvent.change(slider, { target: { value: '50' } })
  act(() => editor.getState().replace({ ...editor.getState().asset, name: 'revisao-externa' }))
  const adopted = editor.getState().asset
  fireEvent.keyUp(slider, { key: 'r' })
  fireEvent.change(slider, { target: { value: '25' } })
  fireEvent.pointerUp(slider, { pointerId: 1 })
  expect(editor.getState().asset).toBe(adopted)
  expect(editor.getState().canUndo).toBe(false)
  await editor.getState().flush()
})
