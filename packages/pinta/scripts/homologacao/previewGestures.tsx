/** QA host: actual preview hooks, component, map-set facade and IndexedDB. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import '../../playground/styles.css'
import { PintaAppProvider } from '../../src/components/appContext'
import { PintaEditorProvider } from '../../src/components/editor/editorContext'
import { MapLibraryPreview } from '../../src/components/editor/MapLibraryPreview'
import { MapObjectsOverlay } from '../../src/components/editor/MapObjectsOverlay'
import { useLibraryPlacement } from '../../src/components/editor/mapTools/useLibraryPlacement'
import { useObjectScatter } from '../../src/components/editor/mapTools/useObjectScatter'
import { ToastProvider } from '../../src/components/ui/Toast'
import {
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  type PintaAsset,
} from '../../src/core/project'
import { createClipboardStore } from '../../src/state/clipboardStore'
import { createEditorStore } from '../../src/state/editorStore'
import { createGalleryStore } from '../../src/state/galleryStore'
import { createMapSetEditorStore } from '../../src/state/mapSetEditorStore'
import { createPaletteLibraryStore } from '../../src/state/paletteLibraryStore'
import { createPintaPersistence } from '../../src/state/persistence'
import { createSessionStore } from '../../src/state/sessionStore'
import { libraryPlacement } from '../../src/tiles/libraryPlacement'
import { addMapObject, createMapObject } from '../../src/tiles/mapObjects'
import { DEFAULT_OBJECT_SCATTER } from '../../src/tiles/objectScatter'
import { expandRegionMap, prepareMapRegions } from '../../src/tiles/regionMap'
import { createMapSet } from '../../src/tiles/sets'
import { addObjectLayer } from '../../src/tiles/tilemapOps'

async function start() {
  const params = new URLSearchParams(location.search),
    operation = params.get('operation') ?? 'scatter',
    ending = params.get('ending') ?? 'undo',
    set = params.get('set') === '1',
    persistence = createPintaPersistence({ namespace: `preview-${crypto.randomUUID()}` }),
    art = createTilesetAsset({ name: 'arvore', tileSize: 16 })
  art.tiles[0]!.data.fill(1)
  const base = addObjectLayer(
      createTilemapAsset({ name: 'vila', tilesetId: art.id, cols: 8, rows: 6 }),
      'Objetos',
    ),
    map = addMapObject(
      base,
      base.layers.at(-1)!.id,
      createMapObject({
        name: 'arvore',
        shape: 'art',
        art: { assetId: art.id, tile: 0 },
        x: 0,
        y: 0,
        width: 16,
        height: 16,
      }),
    ),
    seed = set ? createMapSet(map, { col: 0, row: 0, cols: 8, rows: 6 }, 16, 'conjunto') : map
  await persistence.persistAssets([art, seed])
  const loaded = await persistence.loadAssetById(seed.id)
  if (!loaded || (loaded.kind !== 'tilemap' && loaded.kind !== 'map-set'))
    throw Error('Documento não reabriu')
  const initial = loaded,
    initialMap = initial.kind === 'map-set' ? initial.map : initial,
    layerId = initialMap.layers.find(isObjectLayer)!.id,
    source = initialMap.layers.find(isObjectLayer)!.objects[0]!,
    settings = { ...DEFAULT_OBJECT_SCATTER, width: 1, density: 1, spacing: 0 }
  let expected: PintaAsset = initial,
    armed = true
  const outer = createEditorStore({
    asset: initial,
    autosaveDelayMs: 100000,
    persist: (asset) => persistence.persistAssets([asset]),
    acceptEdit: () => {
      if (armed && ending === 'host') {
        armed = false
        expected = { ...initial, name: 'revisao-externa' }
        outer.getState().replace(expected)
      }
      return true
    },
  })
  outer.subscribe((state) => {
    if (armed && ending === 'subscriber' && state.asset !== initial) {
      armed = false
      expected = { ...state.asset, name: 'revisao-externa' }
      outer.getState().replace(expected)
    }
  })
  const facade = set ? createMapSetEditorStore(outer) : null,
    editor = facade?.store ?? outer
  if (facade) outer.subscribe(() => facade.store.setState(facade.read(), true))
  const gallery = createGalleryStore(persistence),
    session = createSessionStore()
  gallery.setState({ assets: [art, initial], loaded: true })
  const app = {
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
  const prepared = prepareMapRegions(initialMap)
  if (!prepared.ok) throw Error(prepared.reason)
  const expanded = expandRegionMap(prepared.map, { col: -4, row: -4, cols: 12, rows: 10 })
  if (!expanded.ok) throw Error(expanded.reason)
  const region = expanded.map,
    regionalPreview = libraryPlacement(region, layerId, art, 16, { x: -24.25, y: -8.5 }, false)
  if (!regionalPreview) throw Error('Prévia regional recusada')
  const readonlyPreview = { ...regionalPreview, source: art }
  const normalize = (asset: PintaAsset) =>
    JSON.stringify({
      ...asset,
      updatedAt: 0,
      ...(asset.kind === 'map-set' ? { map: { ...asset.map, updatedAt: 0 } } : {}),
    })
  const hash = async (text: string) =>
    [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  function Lab() {
    const root = useSyncExternalStore(outer.subscribe, outer.getState),
      state = useSyncExternalStore(editor.subscribe, editor.getState),
      paperRef = useRef<HTMLDivElement>(null),
      stageRef = useRef<HTMLDivElement>(null),
      [cellPx, setCellPx] = useState(32),
      [saved, setSaved] = useState<unknown>(null),
      [selected, setSelected] = useState(0)
    if (state.asset.kind !== 'tilemap') throw Error('Mapa esperado')
    const current = state.asset,
      common = {
        editor,
        map: current,
        layerId,
        tileSize: 16,
        cellPx,
        pad: 0,
        paperRef,
        stageRef,
        showToast: () => {},
      },
      library = useLibraryPlacement({
        ...common,
        assets: gallery.getState().assets,
        snap: false,
        position: () => ({ x: 40, y: 40 }),
        onSelect: () => setSelected((n) => n + 1),
      }),
      scatter = useObjectScatter({ ...common, source, active: true, settings })
    useEffect(() => {
      const key = (event: KeyboardEvent) => {
        if (event.key === 'z') setCellPx(48)
      }
      window.addEventListener('keydown', key)
      return () => window.removeEventListener('keydown', key)
    }, [])
    return (
      <PintaAppProvider value={app}>
        <ToastProvider>
          <PintaEditorProvider value={{ editor, session }}>
            <main data-pinta-theme="light" style={{ padding: 12 }}>
              <button
                type="button"
                style={{ touchAction: 'none' }}
                onPointerDown={(event) => library.down(art, event)}
                onClick={(event) => library.click(art, event)}
              >
                Arrastar árvore
              </button>
              <div ref={stageRef} style={{ width: 400, height: 340, overflow: 'auto' }}>
                <div
                  ref={paperRef}
                  style={{
                    position: 'relative',
                    width: (operation === 'region' ? region.cols : current.cols) * cellPx,
                    height: (operation === 'region' ? region.rows : current.rows) * cellPx,
                  }}
                >
                  <canvas
                    data-stroke=""
                    width={256}
                    height={192}
                    style={{
                      touchAction: 'none',
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                    }}
                    onPointerDown={scatter.down}
                    onLostPointerCapture={scatter.lost}
                  />
                  {operation === 'region' ? (
                    <MapLibraryPreview
                      map={region}
                      preview={readonlyPreview}
                      tileSize={16}
                      pad={0}
                      cellPx={cellPx}
                    />
                  ) : operation === 'library' ? (
                    library.preview ? (
                      <MapLibraryPreview
                        map={current}
                        preview={library.preview}
                        tileSize={16}
                        pad={0}
                        cellPx={cellPx}
                      />
                    ) : null
                  ) : (
                    <MapObjectsOverlay
                      tilemap={scatter.preview?.map ?? current}
                      activeLayerId={layerId}
                      interactive={false}
                      tool={null}
                      tileSize={16}
                      pad={0}
                      scale={cellPx / 16}
                      snap={false}
                      selectedObjectId={null}
                      onSelectObject={() => {}}
                      previewIds={scatter.preview?.addedIds}
                    />
                  )}
                </div>
              </div>
              <output data-preview="">
                {operation === 'library' ? !!library.preview : scatter.preview ? 'yes' : 'no'}
              </output>
              <output data-state="">
                {JSON.stringify({ canUndo: root.canUndo, name: root.asset.name, selected })}
              </output>
              <button type="button" onClick={() => outer.getState().undo()}>
                Desfazer
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = await outer.getState().flush(),
                    persisted = await persistence.loadAssetById(initial.id)
                  setSaved({
                    ok: result.ok,
                    current: await hash(normalize(outer.getState().asset)),
                    expected: await hash(normalize(expected)),
                    persisted: persisted ? await hash(normalize(persisted)) : null,
                  })
                }}
              >
                Conferir salvamento
              </button>
              <output data-saved="">{JSON.stringify(saved)}</output>
            </main>
          </PintaEditorProvider>
        </ToastProvider>
      </PintaAppProvider>
    )
  }
  const element = document.getElementById('root')
  if (!element) throw Error('Host ausente')
  createRoot(element).render(<Lab />)
}
void start()
