import { createRoot } from 'react-dom/client'
import '../../playground/styles.css'
import { PintaAppProvider } from '../../src/components/appContext'
import { PintaEditorProvider } from '../../src/components/editor/editorContext'
import { TilemapEditor } from '../../src/components/editor/TilemapEditor'
import { ToastProvider } from '../../src/components/ui/Toast'
import {
  createTilemapAsset,
  isTileLayer,
  isTilesetKind,
  tileLayerTilesetId,
} from '../../src/core/project'
import { createClipboardStore } from '../../src/state/clipboardStore'
import { createGalleryStore } from '../../src/state/galleryStore'
import { createPaletteLibraryStore } from '../../src/state/paletteLibraryStore'
import { createPintaPersistence } from '../../src/state/persistence'
import { createSessionStore } from '../../src/state/sessionStore'
import type { AutomapBook } from '../../src/tiles/automapping/book'
import { automapSheetIdentity } from '../../src/tiles/automapping/book'
import { createAutomapEditor, isAutomapEditorMap } from '../../src/tiles/automapping/editor'
import { decodeAutomapGallery } from '../../src/tiles/automapping/native'
import { automapRepository } from '../../src/tiles/automapping/repository'
import { cellAt, createMapLayerCellReader } from '../../src/tiles/tilemapOps'
import { vilaEFloresta } from '../homologacao/fixture'

const profile = new URL(location.href).searchParams.get('profile') ?? 'teste'
const db = await new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(`qa-pinta-autorregras-${profile}`, 1)
  request.onupgradeneeded = () => request.result.createObjectStore('documents')
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})
const repository = automapRepository(db, 'documents', 'mundo')
async function village() {
  const source = vilaEFloresta()
  const land = source.assets.find((a) => a.id === source.map.tilesetId)
  if (!land || !isTilesetKind(land)) throw Error('Peças da vila ausentes')
  const map = createTilemapAsset({
    name: 'vila',
    tilesetId: land.id,
    cols: source.map.cols,
    rows: source.map.rows,
  })
  const first = map.layers[0]!
  if (!isTileLayer(first)) throw Error('Camada ausente')
  const fields = source.map.layers
    .filter(isTileLayer)
    .filter((l) => tileLayerTilesetId(source.map, l) === land.id)
  const readers = fields.map((field) => createMapLayerCellReader(source.map, field.id)!)
  const floor = first.cells.slice(),
    front = first.cells.slice()
  for (let i = 1; i < floor.length; i++) {
    const x = i % map.cols,
      y = Math.floor(i / map.cols)
    floor[i] = readers[0]!.at(x, y)
    for (const reader of readers.slice(1)) {
      const cell = reader.at(x, y)
      if (cell !== -1) front[i] = cell
    }
  }
  map.layers = [
    { ...first, id: 'chao', name: 'Chão', cells: floor },
    { ...first, id: 'frente', name: 'Frente', cells: front },
  ]
  const { sha256 } = await automapSheetIdentity(land)
  const plane = (layer: string) => ({ layer, sheet: land.id, sha256, cells: [0] })
  const book: AutomapBook = {
    format: 'pinta-regras',
    version: 1,
    seed: 7,
    rules: [
      {
        id: 'grama',
        name: 'Grama',
        width: 1,
        height: 1,
        input: [plane('chao')],
        outputs: [[plane('frente')]],
      },
    ],
  }
  return { assets: [land, map], books: new Map([[map.id, book]]) }
}
const text = await repository.read()
const gallery = text === null ? await village() : await decodeAutomapGallery(text)
if (!gallery) throw Error('Documento inválido')
const mapId = [...gallery.books.keys()][0]!
const editor = await createAutomapEditor({ gallery, mapId, repository, autosaveDelayMs: 60000 })
const session = createSessionStore({ tool: 'pencil', zoom: 1.5 })
const persistence = createPintaPersistence({ namespace: `qa-automapping-${profile}` })
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
for (const asset of gallery.assets) if (isTilesetKind(asset)) app.gallery.getState().absorb(asset)
Object.assign(window, {
  automapQA: {
    snapshot: () => {
      const state = editor.getState(),
        map = state.asset
      if (!isAutomapEditorMap(map)) throw Error('Mapa ausente')
      return {
        ground: cellAt(map, 'chao', 0, 0),
        front: cellAt(map, 'frente', 0, 0),
        rules: map.automapping.rules.length,
        seed: map.automapping.seed,
        dirty: state.dirty,
        canUndo: state.canUndo,
        canRedo: state.canRedo,
        saveState: state.saveState,
      }
    },
    undo: () => editor.getState().undo(),
    redo: () => editor.getState().redo(),
    flush: () => editor.getState().flush(),
    file: () => repository.read(),
  },
})
createRoot(document.getElementById('root')!).render(
  <PintaAppProvider value={app}>
    <ToastProvider>
      <PintaEditorProvider value={{ editor, session }}>
        <main
          data-pinta-theme="light"
          className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-pin-bg text-pin-text"
        >
          <TilemapEditor />
        </main>
      </PintaEditorProvider>
    </ToastProvider>
  </PintaAppProvider>,
)
