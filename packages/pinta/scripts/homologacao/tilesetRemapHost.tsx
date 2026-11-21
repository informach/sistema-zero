/** QA host for the actual TileStrip and stores. Public dense assets only. */
import { pintaAssetToWire } from '../../src/assets/wire'
import { type PintaAppContextValue, PintaAppProvider } from '../../src/components/appContext'
import { PintaEditorProvider } from '../../src/components/editor/editorContext'
import { TileStrip } from '../../src/components/editor/TileStrip'
import { ToastProvider } from '../../src/components/ui/Toast'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  isTilesetKind,
  type PintaAsset,
} from '../../src/core/project'
import { createClipboardStore } from '../../src/state/clipboardStore'
import { createEditorStore, type PintaEditorStore } from '../../src/state/editorStore'
import { createGalleryStore } from '../../src/state/galleryStore'
import { createPaletteLibraryStore } from '../../src/state/paletteLibraryStore'
import { createPintaPersistence } from '../../src/state/persistence'
import { createSessionStore } from '../../src/state/sessionStore'
import { addMapObject, createMapObject } from '../../src/tiles/mapObjects'
import { createMapSet } from '../../src/tiles/sets'
import { addObjectLayer, setCell } from '../../src/tiles/tilemapOps'

export type TileRemapMode = 'normal' | 'overflow' | 'supersede'

export async function createTilesetRemapHost(mode: TileRemapMode, namespace: string) {
  const sheet = {
      ...createTilesetAsset({ name: 'qa-pecas', tileSize: 16 }),
      tiles: [1, 2, 3].map((color) => {
        const tile = createBitmap(16, 16)
        tile.data.fill(color)
        return tile
      }),
      solid: [false, false, false],
      platform: [false, false, false],
    },
    other = createTilesetAsset({ name: 'qa-outras', tileSize: 16 })
  let objectMap = addObjectLayer(
    createTilemapAsset({ name: 'qa-objeto', tilesetId: other.id, cols: 2, rows: 2 }),
    'Objetos',
  )
  objectMap = addMapObject(
    objectMap,
    objectMap.layers.at(-1)!.id,
    createMapObject({
      name: 'Placa',
      shape: 'art',
      width: 16,
      height: 16,
      art: { assetId: sheet.id, tile: 1 },
    }),
  )
  const terrain = createTilemapAsset({ name: 'qa-terreno', tilesetId: sheet.id, cols: 2, rows: 2 })
  terrain.layers[0]!.cells![0] = 1
  terrain.layers[0]!.cells![1] = 2
  const set = createMapSet(terrain, { col: 0, row: 0, cols: 2, rows: 2 }, 16, 'qa-conjunto')
  const seeds: PintaAsset[] = [sheet, other, objectMap, terrain, set]
  if (mode === 'overflow') {
    const blocked = createTilemapAsset({ name: 'qa-limite', tilesetId: sheet.id, cols: 2, rows: 2 })
    seeds.push(setCell(blocked, blocked.layers[0]!.id, 0, 0, 255))
  }
  const persistence = createPintaPersistence({ namespace })
  await persistence.persistAssets(seeds)
  const gallery = createGalleryStore(persistence)
  await gallery.getState().load()
  const initial = gallery.getState().assets.find((a) => a.id === sheet.id)
  if (!initial || !isTilesetKind(initial)) throw Error('Peças ausentes')
  let editorForValidation: PintaEditorStore | null = null,
    adopted = false,
    writes = 0
  const editor = createEditorStore({
    asset: initial,
    autosaveDelayMs: 100000,
    persist: async (asset, linked) => {
      writes++
      await persistence.persistAssets([asset, ...linked])
    },
    onSaved: (asset, linked) => gallery.getState().absorbMany([asset, ...linked]),
    acceptEdit: () => {
      if (mode === 'supersede' && !adopted) {
        adopted = true
        if (!editorForValidation) throw Error('Editor ainda não montado')
        editorForValidation
          .getState()
          .replace({ ...editorForValidation.getState().asset, name: 'qa-adotado' })
      }
      return true
    },
  })
  editorForValidation = editor
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
  function Host() {
    return (
      <PintaAppProvider value={app}>
        <ToastProvider>
          <PintaEditorProvider value={{ editor, session }}>
            <TileStrip />
            <button type="button" onClick={() => editor.getState().undo()}>
              Desfazer QA
            </button>
            <button type="button" onClick={() => editor.getState().redo()}>
              Refazer QA
            </button>
          </PintaEditorProvider>
        </ToastProvider>
      </PintaAppProvider>
    )
  }
  return {
    Host,
    editor,
    session,
    gallery,
    namespace,
    snapshot: () => ({
      asset: pintaAssetToWire(editor.getState().asset),
      linked: (editor.getState().linkedAssets ?? []).map(pintaAssetToWire),
      confirmed: gallery.getState().assets.map(pintaAssetToWire),
      frame: session.getState().frameIndex,
      canUndo: editor.getState().canUndo,
      dirty: editor.getState().dirty,
      writes,
    }),
    flush: () => editor.getState().flush(),
    stored: async () =>
      (await createPintaPersistence({ namespace }).listAllAssets()).map(pintaAssetToWire),
  }
}
