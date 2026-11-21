/** QA-only host of the actual overlay, layer panel, editor facade and IndexedDB. */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import '../../playground/styles.css'
import { PintaAppProvider } from '../../src/components/appContext'
import { PintaEditorProvider } from '../../src/components/editor/editorContext'
import { MapLayerPanel } from '../../src/components/editor/MapLayerPanel'
import { MapObjectsOverlay } from '../../src/components/editor/MapObjectsOverlay'
import { ToastProvider } from '../../src/components/ui/Toast'
import {
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  type PintaAsset,
  type RegionTilemapAsset,
} from '../../src/core/project'
import { createClipboardStore } from '../../src/state/clipboardStore'
import { createEditorStore } from '../../src/state/editorStore'
import { createGalleryStore } from '../../src/state/galleryStore'
import { createMapSetEditorStore } from '../../src/state/mapSetEditorStore'
import { createPaletteLibraryStore } from '../../src/state/paletteLibraryStore'
import { createPintaPersistence } from '../../src/state/persistence'
import { createSessionStore } from '../../src/state/sessionStore'
import { addMapObject, createMapObject, createRegionMapObject } from '../../src/tiles/mapObjects'
import { expandRegionMap, prepareMapRegions } from '../../src/tiles/regionMap'
import { createMapSet } from '../../src/tiles/sets'
import { addObjectLayer } from '../../src/tiles/tilemapOps'

async function start() {
  const params = new URLSearchParams(location.search),
    operation = params.get('operation') ?? 'move',
    set = params.get('set') === '1',
    refuse = params.get('host') === '1',
    persistence = createPintaPersistence({ namespace: `objects-proof-${crypto.randomUUID()}` }),
    art = createTilesetAsset({ name: 'pecas', tileSize: 16 }),
    map = addObjectLayer(
      createTilemapAsset({ name: 'vila', tilesetId: art.id, cols: 8, rows: 6 }),
      'Objetos',
    ),
    base = addMapObject(
      map,
      map.layers.at(-1)!.id,
      createMapObject({
        name: 'casa',
        x: 16,
        y: 16,
        width: 32,
        height: 32,
        ...(['vertex', 'insert'].includes(operation)
          ? {
              shape: 'polygon' as const,
              points: [
                { x: 0, y: 0 },
                { x: 32, y: 0 },
                { x: 32, y: 32 },
              ],
            }
          : {}),
      }),
    ),
    seed = set ? createMapSet(base, { col: 0, row: 0, cols: 8, rows: 6 }, 16, 'conjunto') : base
  await persistence.persistAssets([art, seed])
  const loaded = await persistence.loadAssetById(seed.id)
  if (!loaded || (loaded.kind !== 'tilemap' && loaded.kind !== 'map-set'))
    throw Error('Documento inicial não reabriu')
  const initial = loaded
  let expected: PintaAsset = initial
  const normalize = (asset: PintaAsset) =>
      JSON.stringify({
        ...asset,
        updatedAt: 0,
        ...(asset.kind === 'map-set' ? { map: { ...asset.map, updatedAt: 0 } } : {}),
      }),
    outer = createEditorStore({
      asset: initial,
      autosaveDelayMs: 100000,
      persist: (asset) => persistence.persistAssets([asset]),
      acceptEdit: (asset) => {
        const map = asset.kind === 'map-set' ? asset.map : asset
        return (
          !refuse ||
          map.kind !== 'tilemap' ||
          (map.layers.find(isObjectLayer)?.objects[0]?.x ?? 0) < 48
        )
      },
    }),
    facade = set ? createMapSetEditorStore(outer) : null,
    editor = facade?.store ?? outer
  if (facade) outer.subscribe(() => facade.store.setState(facade.read(), true))
  const initialMap = initial.kind === 'map-set' ? initial.map : initial,
    objectLayer = initialMap.layers.find(isObjectLayer)!,
    session = createSessionStore(),
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
    }
  // Read-only internal input, distinct from the public store; no fake schema-8 writer.
  let regionView: RegionTilemapAsset | null = null
  if (operation === 'region') {
    const prepared = prepareMapRegions(initialMap)
    if (!prepared.ok) throw Error(prepared.reason)
    const expanded = expandRegionMap(prepared.map, { col: -4, row: -4, cols: 12, rows: 10 })
    if (!expanded.ok) throw Error(expanded.reason)
    const object = createRegionMapObject({
      id: 'qa-negative-object',
      name: 'casa negativa',
      x: -24.25,
      y: -8.5,
      width: 16,
      height: 16,
    })
    if (!object) throw Error('Objeto regional inválido')
    regionView = addMapObject(expanded.map, objectLayer.id, object)
  }
  async function hash(text: string) {
    return Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
      (v) => v.toString(16).padStart(2, '0'),
    ).join('')
  }
  function Lab() {
    const state = useSyncExternalStore(editor.subscribe, editor.getState),
      root = useSyncExternalStore(outer.subscribe, outer.getState),
      [saved, setSaved] = useState<unknown>(null),
      [mounted, setMounted] = useState(true),
      [collapsed, setCollapsed] = useState(false),
      [zoom, setZoom] = useState(2)
    useEffect(() => {
      const key = (event: KeyboardEvent) => {
        if (event.key === 'r') {
          expected = { ...initial, name: 'revisao-externa' }
          outer.getState().replace(expected)
        }
        if (event.key === 'u') setMounted(false)
        if (event.key === 'c') setCollapsed(true)
        if (event.key === 'z') setZoom(4)
      }
      window.addEventListener('keydown', key)
      return () => window.removeEventListener('keydown', key)
    }, [])
    const asset = state.asset
    if (asset.kind !== 'tilemap') throw Error('Mapa esperado')
    return (
      <PintaAppProvider value={app}>
        <ToastProvider>
          <PintaEditorProvider value={{ editor, session }}>
            <main
              data-pinta-theme="light"
              className="bg-pin-bg text-pin-text"
              style={{ padding: 12 }}
            >
              <p>QA: R adota outra revisão; Esc cancela; U desmonta o controle.</p>
              {mounted ? (
                operation === 'opacity' ? (
                  <div style={{ width: 320 }}>
                    <MapLayerPanel
                      tilemap={asset}
                      activeLayerId={initialMap.layers[0]!.id}
                      layerTilesetChoices={[]}
                      onSelectLayer={() => {}}
                      onToggleFront={() => {}}
                      onToggleVisible={() => {}}
                      onRemoveLayer={() => {}}
                      onAddLayer={() => {}}
                      onAddObjectLayer={() => {}}
                      onSetLayerTileset={() => {}}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'relative',
                      width: collapsed ? 0 : (regionView?.cols ?? asset.cols) * 16 * zoom,
                      height: (regionView?.rows ?? asset.rows) * 16 * zoom,
                    }}
                  >
                    <MapObjectsOverlay
                      tilemap={regionView ?? asset}
                      activeLayerId={objectLayer.id}
                      interactive={!regionView}
                      tool={
                        regionView
                          ? null
                          : operation === 'draft'
                            ? 'object-polygon'
                            : operation === 'create'
                              ? 'object-rect'
                              : operation === 'point'
                                ? 'object-point'
                                : 'object-select'
                      }
                      tileSize={16}
                      pad={0}
                      scale={zoom}
                      snap={false}
                      selectedObjectId={
                        ['resize', 'vertex', 'insert'].includes(operation)
                          ? objectLayer.objects[0]!.id
                          : null
                      }
                      onSelectObject={() => {}}
                    />
                  </div>
                )
              ) : null}
              <button type="button" onClick={() => outer.getState().undo()}>
                Desfazer
              </button>
              <button type="button" onClick={() => outer.getState().redo()}>
                Refazer
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
              <output data-current="">
                {JSON.stringify({
                  matches: normalize(root.asset) === normalize(expected),
                  canUndo: root.canUndo,
                  name: root.asset.name,
                })}
              </output>
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
