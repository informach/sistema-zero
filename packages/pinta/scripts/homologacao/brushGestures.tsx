/** QA-only host: actual gesture controller, renderer, store and IndexedDB. */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import '../../playground/styles.css'
import { DEFAULT_MAP_BRUSH } from '../../src/components/editor/MapTerrainPanel'
import {
  createTileGestures,
  type TileGesture,
  type TileGestureDeps,
} from '../../src/components/editor/mapTools/tileGestures'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type PintaAsset,
  type TilemapAsset,
} from '../../src/core/project'
import { createEditorStore } from '../../src/state/editorStore'
import { createPintaPersistence } from '../../src/state/persistence'
import { createSessionStore } from '../../src/state/sessionStore'
import type { CellPos } from '../../src/tiles/cellGeometry'
import { paintTilemapLayers, TileChunkCache } from '../../src/tiles/chunks'
import { pixelSheetCanvas } from '../../src/tiles/sheetCanvas'

async function start() {
  const persistence = createPintaPersistence({ namespace: `brush-proof-${crypto.randomUUID()}` }),
    art = createTilesetAsset({ name: 'Peças de QA', tileSize: 16 })
  art.tiles[0]!.data.fill(1)
  art.tiles.push({ ...art.tiles[0]!, data: new Uint8Array(256).fill(2) })
  art.solid = art.platform = [false, false]
  const seed = createTilemapAsset({ name: 'Revisão inicial', tilesetId: art.id, cols: 16, rows: 8 })
  await persistence.persistAssets([art, seed])
  const initial = await persistence.loadAssetById(seed.id)
  if (initial?.kind !== 'tilemap') throw Error('Mapa inicial não reabriu')
  let expected: TilemapAsset = initial,
    mode = 'normal'
  const normalize = (asset: PintaAsset) =>
      JSON.stringify({ ...asset, updatedAt: initial.updatedAt }),
    editor = createEditorStore({
      asset: initial,
      autosaveDelayMs: 100000,
      persist: (asset) => persistence.persistAssets([asset]),
      acceptEdit: (candidate) => {
        if (mode !== 'host') return true
        if (candidate.kind !== 'tilemap') return false
        const layer = candidate.layers[0]
        return !!layer && isTileLayer(layer) && layer.cells[18] === -1
      },
    })
  async function hash(text: string) {
    const value = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  function Lab() {
    const state = useSyncExternalStore(editor.subscribe, editor.getState),
      canvasRef = useRef<HTMLCanvasElement>(null),
      stageRef = useRef<HTMLDivElement>(null),
      gestureRef = useRef<TileGesture | null>(null),
      previewRef = useRef<CellPos[]>([]),
      [messages, setMessages] = useState<string[]>([]),
      [saved, setSaved] = useState<unknown>(null),
      cache = useMemo(() => new TileChunkCache(), []),
      sheet = useMemo(() => pixelSheetCanvas(art), [])
    const paint = useCallback(
      (map: TilemapAsset) => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || !sheet) return
        ctx.clearRect(0, 0, 256, 128)
        ctx.imageSmoothingEnabled = false
        paintTilemapLayers(ctx, map, new Map([[art.id, art]]), () => sheet, cache, {
          x: 0,
          y: 0,
          width: 256,
          height: 128,
        })
      },
      [cache, sheet],
    )
    const deps = useMemo<TileGestureDeps>(
      () => ({
        editor,
        session: createSessionStore(),
        tool: 'pencil',
        tilemap: initial,
        layerId: initial.layers[0]!.id,
        tileset: art,
        selectedTile: 0,
        stamp: null,
        brush: DEFAULT_MAP_BRUSH,
        autoExpand: false,
        tileSize: 16,
        cellPx: 16,
        gestureRef,
        previewCellsRef: previewRef,
        panRef: { current: null },
        stageRef,
        hoverRef: { current: () => {} },
        cellFromEvent: (event) => {
          const box = event.currentTarget.getBoundingClientRect()
          return {
            col: Math.floor((event.clientX - box.left) / 16),
            row: Math.floor((event.clientY - box.top) / 16),
          }
        },
        clampCell: (point) => ({
          col: Math.max(0, Math.min(15, point.col)),
          row: Math.max(0, Math.min(7, point.row)),
        }),
        repaintMap: paint,
        showToast: (message) => setMessages((values) => [...values, message]),
        setPanning: () => {},
        onGestureEnd: () => {},
        isLocked: () => false,
      }),
      [paint],
    )
    const gesture = useMemo(() => createTileGestures(deps), [deps])
    useEffect(() => {
      const key = (event: KeyboardEvent) => {
        if (event.key === 'r') {
          expected = {
            ...initial,
            name: 'revisao-externa',
            layers: initial.layers.map((layer) => {
              if (!isTileLayer(layer)) return layer
              const cells = new Int16Array(layer.cells)
              cells[cells.length - 1] = 1
              return { ...layer, cells }
            }),
          }
          editor.getState().replace(expected)
        } else if (event.key === 'Escape') gesture.cancel()
      }
      window.addEventListener('keydown', key)
      return () => window.removeEventListener('keydown', key)
    }, [gesture])
    useEffect(() => {
      if (state.asset.kind === 'tilemap') paint(state.asset)
    }, [state.asset, paint])
    return (
      <main data-pinta-theme="light" className="bg-pin-bg text-pin-text" style={{ padding: 12 }}>
        <p>QA do controlador real: R adota outra revisão; Esc cancela.</p>
        <label>
          Modo da prova{' '}
          <select
            aria-label="Modo da prova"
            onChange={(event) => {
              mode = event.target.value
              deps.stamp =
                mode === 'stamp'
                  ? { cols: 256, rows: 256, tiles: new Int16Array(65536).fill(0) }
                  : null
            }}
          >
            <option value="normal">Pincel</option>
            <option value="stamp">Recusa de carimbo grande</option>
            <option value="host">Recusa do host</option>
          </select>
        </label>
        <div ref={stageRef}>
          <canvas
            ref={canvasRef}
            width={256}
            height={128}
            aria-label="Palco de QA"
            className="pin-checkerboard pin-pixelated"
            style={{ touchAction: 'none' }}
            onPointerDown={gesture.down}
            onPointerMove={gesture.move}
            onPointerUp={gesture.up}
            onPointerCancel={gesture.cancel}
          />
        </div>
        <button type="button" onClick={() => editor.getState().undo()}>
          Desfazer
        </button>
        <button type="button" onClick={() => editor.getState().redo()}>
          Refazer
        </button>
        <button
          type="button"
          onClick={async () => {
            const result = await editor.getState().flush(),
              asset = await persistence.loadAssetById(initial.id)
            setSaved({
              ok: result.ok,
              current: await hash(normalize(editor.getState().asset)),
              expected: await hash(normalize(expected)),
              persisted: asset ? await hash(normalize(asset)) : null,
              diagnostic: {
                expected: JSON.parse(normalize(expected)),
                persisted: asset ? JSON.parse(normalize(asset)) : null,
              },
            })
          }}
        >
          Conferir salvamento
        </button>
        <output data-current="">
          {JSON.stringify({
            matches: normalize(state.asset) === normalize(expected),
            canUndo: state.canUndo,
            canRedo: state.canRedo,
            name: state.asset.name,
          })}
        </output>
        <output data-saved="">{JSON.stringify(saved)}</output>
        <output data-messages="">{JSON.stringify(messages)}</output>
      </main>
    )
  }
  const element = document.getElementById('root')
  if (!element) throw Error('Host ausente')
  createRoot(element).render(<Lab />)
}
void start()
