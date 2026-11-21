/** Actual EditorScreen, host and persistence; no public format 8 injection. */

import { pintaAssetToWire } from '../../src/assets/wire'
import { type PintaAppContextValue, PintaAppProvider } from '../../src/components/appContext'
import { EditorScreen } from '../../src/components/editor/EditorScreen'
import { ToastProvider } from '../../src/components/ui/Toast'
import {
  createPixelBackgroundAsset,
  createTilemapAsset,
  createTilesetAsset,
  type PintaAsset,
} from '../../src/core/project'
import { createClipboardStore } from '../../src/state/clipboardStore'
import type { PintaEditorStore } from '../../src/state/editorStore'
import { createGalleryStore } from '../../src/state/galleryStore'
import { createPaletteLibraryStore } from '../../src/state/paletteLibraryStore'
import { createPintaPersistence } from '../../src/state/persistence'

export async function createResizeScreenHost(lesson: boolean, namespace: string) {
  const sheet = createTilesetAsset({ name: 'Peças', tileSize: 16 })
  const asset = lesson
    ? createTilemapAsset({ name: 'Mapa da aula', tilesetId: sheet.id, cols: 4, rows: 4 })
    : createPixelBackgroundAsset({ name: 'Céu', width: 32, height: 32 })
  if (asset.kind === 'pixel-background') asset.cels[0]!.data.fill(1)
  const persistence = createPintaPersistence({ namespace })
  await persistence.persistAssets([asset, sheet])
  const gallery = createGalleryStore(persistence)
  await gallery.getState().load()
  let editor: PintaEditorStore | null = null
  const current = () => {
    if (!editor) throw Error('Editor ainda não montado')
    return editor
  }
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
    ...(lesson ? { lesson: { allowResize: true, allowExport: true } } : {}),
    onEditorReady: (value) => {
      editor = value
    },
  }
  function Host() {
    return (
      <PintaAppProvider value={app}>
        <ToastProvider>
          <EditorScreen assetId={asset.id} />
        </ToastProvider>
      </PintaAppProvider>
    )
  }
  return {
    Host,
    namespace,
    ready: () => !!editor,
    snapshot: () => {
      const state = current().getState()
      return { asset: pintaAssetToWire(state.asset), canUndo: state.canUndo, dirty: state.dirty }
    },
    adopt: () => {
      const state = current().getState(),
        source = state.asset
      if (source.kind !== 'pixel-background') throw Error('Arte ausente')
      const next: PintaAsset = {
        ...source,
        name: 'qa-adotado',
        cels: source.cels.map((cel) => ({ ...cel, data: new Uint8Array(cel.data.length).fill(3) })),
      }
      state.replace(next)
    },
    flush: () => current().getState().flush(),
  }
}
