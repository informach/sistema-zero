/**
 * A faixa de peças não renumera uma folha usada por um mapa projetado guardado: esse mapa não
 * abre aqui, então as casas dele não acompanhariam a nova numeração. A mesma operação sem
 * projetado segue como antes.
 */
import { afterEach, expect, test } from 'bun:test'
import '../../testing/idbMock'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createTilemapAsset, isTilesetKind, type PintaAsset } from '../../core/project'
import { pintaWorkshopAssetToJson } from '../../export/workshopDocument'
import { createClipboardStore } from '../../state/clipboardStore'
import { createEditorStore } from '../../state/editorStore'
import { createGalleryStore } from '../../state/galleryStore'
import { authorityKey } from '../../state/localAssetAuthority'
import { createPaletteLibraryStore } from '../../state/paletteLibraryStore'
import { dbNameFor, setPintaStorageNamespace } from '../../state/persistence'
import { createSessionStore } from '../../state/sessionStore'
import { createWorkshopPintaPersistence } from '../../state/workshopPersistence'
import { idbMockDb } from '../../testing/idbMock'
import { nativeNineGallery } from '../../testing/nativeNineFixtures'
import { type PintaAppContextValue, PintaAppProvider } from '../appContext'
import { ToastProvider } from '../ui/Toast'
import { PintaEditorProvider } from './editorContext'
import { TileStrip } from './TileStrip'

afterEach(() => {
  cleanup()
  setPintaStorageNamespace('')
})

async function tileStripHost(withProjected: boolean) {
  const namespace = `faixa-projetada-${crypto.randomUUID()}`
  setPintaStorageNamespace(namespace)
  const { sheet, iso } = await nativeNineGallery()
  const dense = createTilemapAsset({ name: 'quintal', tilesetId: sheet.id, cols: 2, rows: 2 })
  dense.layers[0]!.cells![0] = 2
  const seeds: PintaAsset[] = [dense]
  const persistence = createWorkshopPintaPersistence({ namespace })
  await persistence.persistAssets(withProjected ? [sheet, ...seeds, iso] : [sheet, ...seeds])
  const gallery = createGalleryStore(persistence)
  await gallery.getState().load()
  const initial = gallery.getState().assets.find((asset) => asset.id === sheet.id)
  if (!initial || !isTilesetKind(initial)) throw Error('Folha ausente')
  let writes = 0
  const editor = createEditorStore({
    asset: initial,
    autosaveDelayMs: 100000,
    persist: async (asset, linked) => {
      writes++
      await persistence.persistAssets([asset, ...linked])
    },
    onSaved: (asset, linked) => gallery.getState().absorbMany([asset, ...linked]),
  })
  const session = createSessionStore()
  session.getState().selectFrame(1)
  const app: PintaAppContextValue = {
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
  }
  render(
    <PintaAppProvider value={app}>
      <ToastProvider>
        <PintaEditorProvider value={{ editor, session }}>
          <TileStrip />
        </PintaEditorProvider>
      </ToastProvider>
    </PintaAppProvider>,
  )
  const db = idbMockDb(dbNameFor(namespace))
  return { editor, iso, db, namespace, writes: () => writes }
}

for (const [label, button] of [
  ['apagar', COPY.tiles.removeTile],
  ['inserir no meio', COPY.tiles.addTile],
] as const)
  test(`${label} uma peça da folha de um projetado é recusado e o projetado fica igual`, async () => {
    const host = await tileStripHost(true)
    const before = host.editor.getState().asset
    const stored = host.db.get(authorityKey(host.iso.id))
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(await screen.findByText(COPY.tiles.remapRefusedProjected)).toBeTruthy()
    expect(host.editor.getState().asset).toBe(before)
    expect(host.editor.getState().canUndo).toBe(false)
    await host.editor.getState().flush()
    expect(host.writes()).toBe(0)
    expect(host.db.get(authorityKey(host.iso.id))).toBe(stored)
    const reopened = await createWorkshopPintaPersistence({
      namespace: host.namespace,
    }).loadAssetById(host.iso.id)
    expect(reopened && pintaWorkshopAssetToJson(reopened)).toBe(pintaWorkshopAssetToJson(host.iso))
  })

test('sem projetado, apagar a peça renumera o mapa da folha como antes', async () => {
  const host = await tileStripHost(false)
  const before = host.editor.getState().asset
  fireEvent.click(screen.getByRole('button', { name: COPY.tiles.removeTile }))
  expect(screen.queryByText(COPY.tiles.remapRefusedProjected)).toBeNull()
  expect(host.editor.getState().asset).not.toBe(before)
  expect(host.editor.getState().canUndo).toBe(true)
  const linked = host.editor.getState().linkedAssets?.find(({ name }) => name === 'quintal')
  if (linked?.kind !== 'tilemap' || 'origin' in linked) throw Error('Mapa ausente')
  expect(linked.layers[0]!.cells![0]).toBe(1)
  await host.editor.getState().flush()
  expect(host.writes()).toBe(1)
})
