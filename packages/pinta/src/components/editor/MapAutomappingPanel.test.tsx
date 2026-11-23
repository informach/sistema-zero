import { expect, test } from 'bun:test'
import { act, fireEvent, render, waitFor, within } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createClipboardStore } from '../../state/clipboardStore'
import { createGalleryStore } from '../../state/galleryStore'
import { createPaletteLibraryStore } from '../../state/paletteLibraryStore'
import { createPintaPersistence } from '../../state/persistence'
import { createSessionStore } from '../../state/sessionStore'
import { automapFixture } from '../../testing/automapFixture'
import { createAutomapEditor, isAutomapEditorMap } from '../../tiles/automapping/editor'
import { decodeAutomapGallery } from '../../tiles/automapping/native'
import { cellAt } from '../../tiles/tilemapOps'
import { PintaAppProvider } from '../appContext'
import { ToastProvider } from '../ui/Toast'
import { PintaEditorProvider } from './editorContext'
import { TilemapEditor } from './TilemapEditor'

test('na oficina avançada o teclado e o ponteiro preveem a pincelada inteira, cancelar e desfazer conservam o mapa', async () => {
  const { sheet, map, gallery } = await automapFixture()
  let durable: string | null = null
  const editor = await createAutomapEditor({
    gallery,
    mapId: map.id,
    repository: {
      read: async () => durable,
      compareAndSet: async (prev, next) => {
        if (durable !== prev) return false
        durable = next
        return true
      },
    },
    autosaveDelayMs: 60000,
  })
  const persistence = createPintaPersistence({ namespace: 'automap-qa' })
  const app = {
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
  }
  app.gallery.getState().absorb(sheet)
  const session = createSessionStore({ zoom: 1, tool: 'pencil' })
  const view = render(
    <PintaAppProvider value={app}>
      <ToastProvider>
        <PintaEditorProvider value={{ editor, session }}>
          <TilemapEditor />
        </PintaEditorProvider>
      </ToastProvider>
    </PintaAppProvider>,
  )
  const ui = within(view.container)
  const name = COPY.automap
  try {
    fireEvent.change(ui.getByLabelText(COPY.scene.nivelDasFerramentas), {
      target: { value: 'advanced' },
    })
    await waitFor(() =>
      expect((ui.getByRole('button', { name: name.input }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(ui.getByLabelText(name.onPaint))
    const canvas = view.container.querySelector('canvas[tabindex]') as HTMLCanvasElement
    expect(canvas).toBeTruthy()
    const initial = editor.getState().asset
    fireEvent.focus(canvas)
    fireEvent.keyDown(canvas, { key: 'Home', ctrlKey: true })
    fireEvent.keyDown(canvas, { key: 'Enter' })
    await waitFor(() => expect(ui.getByRole('button', { name: name.cancel })).toBeTruthy())
    expect(editor.getState().asset).toBe(initial)
    expect(editor.getState().canUndo).toBe(false)
    fireEvent.keyDown(canvas, { key: 'Escape' })
    expect(ui.queryByRole('button', { name: name.cancel })).toBeNull()
    const pointer = {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
      clientX: 4,
      clientY: 4,
    }
    fireEvent.pointerDown(canvas, pointer)
    expect(editor.getState().asset).toBe(initial)
    fireEvent.pointerUp(canvas, { ...pointer, buttons: 0 })
    await waitFor(() => expect(ui.getByRole('button', { name: name.apply })).toBeTruthy())
    fireEvent.click(ui.getByRole('button', { name: name.apply }))
    const applied = editor.getState().asset
    if (!isAutomapEditorMap(applied)) throw Error('map')
    expect([cellAt(applied, 'chao', 0, 0), cellAt(applied, 'frente', 0, 0)]).toEqual([0, 0])
    act(() => editor.getState().undo())
    expect(editor.getState().canUndo).toBe(false)
    act(() => editor.getState().redo())
    await act(async () => {
      await editor.getState().flush()
    })
    expect((await decodeAutomapGallery(durable!))?.books.get(map.id)?.rules).toHaveLength(1)
    const current = editor.getState().asset
    if (!isAutomapEditorMap(current)) throw Error('map')
    const reverse = structuredClone(current.automapping)
    reverse.rules[0]!.outputs = [[{ ...reverse.rules[0]!.input[0]!, cells: [-1] }]]
    act(() => {
      editor.getState().commit({ ...current, automapping: reverse } as typeof current)
    })
    const same = editor.getState().asset
    await waitFor(() =>
      expect((ui.getByRole('button', { name: name.input }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.focus(canvas)
    fireEvent.keyDown(canvas, { key: 'Home', ctrlKey: true })
    fireEvent.keyDown(canvas, { key: 'ArrowRight' })
    fireEvent.keyDown(canvas, { key: 'Enter' })
    await waitFor(() => expect(ui.getByText(name.noChanges)).toBeTruthy())
    expect(ui.queryByRole('button', { name: name.apply })).toBeNull()
    expect(editor.getState().asset).toBe(same)
  } finally {
    view.unmount()
    await editor.getState().flush()
  }
})

async function mountRules() {
  const fixture = await automapFixture()
  let durable: string | null = null
  const editor = await createAutomapEditor({
    gallery: fixture.gallery,
    mapId: fixture.map.id,
    repository: {
      read: async () => durable,
      compareAndSet: async (prev, next) => {
        if (durable !== prev) return false
        durable = next
        return true
      },
    },
    autosaveDelayMs: 60000,
  })
  const persistence = createPintaPersistence({ namespace: 'automap-qa-import' })
  const app = {
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
  }
  app.gallery.getState().absorb(fixture.sheet)
  const session = createSessionStore({ zoom: 1, tool: 'pencil' })
  const view = render(
    <PintaAppProvider value={app}>
      <ToastProvider>
        <PintaEditorProvider value={{ editor, session }}>
          <TilemapEditor />
        </PintaEditorProvider>
      </ToastProvider>
    </PintaAppProvider>,
  )
  const ui = within(view.container)
  fireEvent.change(ui.getByLabelText(COPY.scene.nivelDasFerramentas), {
    target: { value: 'advanced' },
  })
  return { ...fixture, editor, view, ui }
}

test('importar regras mostra o nome da camada ou o número dela, nunca o identificador', async () => {
  const { book, editor, view, ui } = await mountRules()
  const ready = () =>
    waitFor(() =>
      expect(
        (ui.getByRole('button', { name: COPY.automap.input }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
  const upload = async (rules: typeof book) => {
    const input = view.container.querySelector('input[type=file]') as HTMLInputElement
    const file = new File([JSON.stringify(rules)], 'regras.json', { type: 'application/json' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })
    await waitFor(() => expect(ui.getByText(COPY.automap.importLayers)).toBeTruthy())
    return ui.getByText(COPY.automap.importLayers).closest('fieldset')!.textContent ?? ''
  }
  try {
    await ready()
    const foreign = structuredClone(book)
    const ids = ['7f9c2b1e-4d3a-4c55-9e1f-0a2b3c4d5e6f', 'c0ffee00-1234-4abc-8def-001122334455']
    foreign.rules[0]!.input[0]!.layer = ids[0]!
    foreign.rules[0]!.outputs[0]![0]!.layer = ids[1]!
    const fromAnotherMap = await upload(foreign)
    expect(fromAnotherMap).toContain(COPY.automap.importLayer('Grama', '1'))
    expect(fromAnotherMap).toContain(COPY.automap.importLayer('Grama', '2'))
    for (const id of ids) expect(fromAnotherMap).not.toContain(id)
    fireEvent.click(ui.getByRole('button', { name: COPY.automap.cancelImport }))
    const fromThisMap = await upload(book)
    expect(fromThisMap).toContain(COPY.automap.importLayer('Grama', 'Chão'))
    expect(fromThisMap).toContain(COPY.automap.importLayer('Grama', 'Frente'))
  } finally {
    view.unmount()
    await editor.getState().flush()
  }
})

test('pintar enquanto as peças carregam avisa que estão carregando, não que a folha mudou', async () => {
  const { editor, view, ui } = await mountRules()
  try {
    fireEvent.click(ui.getByLabelText(COPY.automap.onPaint))
    const canvas = view.container.querySelector('canvas[tabindex]') as HTMLCanvasElement
    fireEvent.focus(canvas)
    fireEvent.keyDown(canvas, { key: 'Home', ctrlKey: true })
    fireEvent.keyDown(canvas, { key: 'Enter' })
    const status = () =>
      view.container.querySelector('[data-pinta-automapping] [role=status]')?.textContent
    expect(status()).toBe(COPY.automap.loadingSheets)
    expect(COPY.automap.loadingSheets).not.toBe(COPY.automap.sheetError)
  } finally {
    view.unmount()
    await editor.getState().flush()
  }
})
