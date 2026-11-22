import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { PintaMemoryAsset } from '../../core/assetMemory'
import { COPY } from '../../core/copy'
import { embeddedTilesetOf } from '../../core/mapResourceVersions'
import {
  effectiveLayer,
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  type RegionTilemapAsset,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../../core/project'
import type { PintaEditorStore } from '../../state/editorStore'
import type { LocalRegionAuthorSession } from '../../state/localRegionAuthorSession'
import { isMapObjectTool, type PintaSessionStore } from '../../state/sessionStore'
import type { CellPos } from '../../tiles/cellGeometry'
import { type MapViewport, TileChunkCache } from '../../tiles/chunks'
import { resolveMapTilesets } from '../../tiles/mapTilesets'
import { expandRegionMap } from '../../tiles/regionMap'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { FocalRegionMapStage } from './FocalRegionMapStage'
import { MapObjectPanel } from './MapObjectPanel'
import { MapEditorObjectsOverlay } from './MapObjectsOverlay'
import { MapPaper } from './MapStage'
import { MapStatusBar } from './MapStatusBar'
import { DEFAULT_MAP_BRUSH, MapBrushPanel } from './MapTerrainPanel'
import { paintMapCanvas } from './mapTools/mapCanvas'
import { createMapObjectActions } from './mapTools/mapObjectActions'
import { mapCellFromCanvas } from './mapTools/mapViewport'
import { createMapTileGestures, type PanGesture, type TileGesture } from './mapTools/tileGestures'
import { useMapAnimation } from './mapTools/useMapAnimation'
import { useMapSheets } from './mapTools/useMapSheets'
import { stageCursor } from './stageCursor'
import { type MapTool, TilemapToolbar } from './TilemapPanels'
import { TilePicker } from './TilePicker'
import { useMediaQuery } from './useMediaQuery'
import { SessionZoomControls } from './ZoomControls'

interface CompleteRegionMapWorkspaceProps {
  editor: PintaEditorStore<PintaMemoryAsset>
  session: PintaSessionStore
  gallery: readonly PintaMemoryAsset[]
}
export type RegionMapWorkspaceProps =
  | CompleteRegionMapWorkspaceProps
  | {
      focal: LocalRegionAuthorSession
      session: PintaSessionStore
    }

const mapOf = (asset: PintaMemoryAsset): RegionTilemapAsset | null =>
  asset.kind === 'tilemap' && 'origin' in asset ? asset : null
const MAP_TOOLS: readonly MapTool[] = [
  'pencil',
  'eraser',
  'line',
  'rect',
  'fill',
  'picker',
  'pan',
  'object-select',
  'object-point',
  'object-rect',
  'object-ellipse',
  'object-polygon',
  'object-polyline',
]

export function RegionMapWorkspace(props: RegionMapWorkspaceProps): JSX.Element | null {
  if ('focal' in props) return <FocalRegionMapStage {...props} />
  return <CompleteRegionMapWorkspace {...props} />
}

function CompleteRegionMapWorkspace(props: CompleteRegionMapWorkspaceProps): JSX.Element | null {
  const map = useStore(props.editor, (state) => mapOf(state.asset))
  if (!map) return null
  return <RegionalMapStage key={map.id} {...props} map={map} />
}

function RegionalMapStage({
  editor,
  session,
  gallery,
  map,
}: CompleteRegionMapWorkspaceProps & { map: RegionTilemapAsset }): JSX.Element {
  const { showToast } = useToast()
  const wide = useMediaQuery('(min-width: 768px)')
  const tool = useStore(session, (state) => state.tool) as MapTool
  const zoom = useStore(session, (state) => state.zoom)
  const stamp = useStore(session, (state) => state.stamp)
  const selectedTile = useStore(session, (state) => state.frameIndex)
  const autoExpand = useStore(session, (state) => state.autoExpand)
  const activeLayer = useStore(session, (state) => state.layerId)
  const linked = useStore(editor, (state) => state.linkedAssets)
  const [brush, setBrush] = useState(DEFAULT_MAP_BRUSH)
  const [collision, setCollision] = useState(false)
  const [snap, setSnap] = useState(true)
  const [panning, setPanning] = useState(false)
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])
  const stage = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const viewport = useRef<MapViewport>({ x: 0, y: 0, width: 0, height: 0 })
  const gesture = useRef<TileGesture<PintaMemoryAsset> | null>(null)
  const pan = useRef<PanGesture | null>(null)
  const previewCells = useRef<CellPos[]>([])
  const hover = useRef<(position: CellPos | null) => void>(() => {})
  const time = useRef(0)
  const cache = useMemo(() => new TileChunkCache(), [])
  const catalog = useMemo(() => {
    const assets = new Map(gallery.filter(isTilesetKind).map((asset) => [asset.id, asset]))
    for (const item of linked ?? []) if (isTilesetKind(item)) assets.set(item.id, item)
    return [...assets.values()]
  }, [gallery, linked])
  const ids = tilemapTilesetIds(map)
  const tilesetKey = JSON.stringify(ids)
  // biome-ignore lint/correctness/useExhaustiveDependencies: tileset ids/bindings, never cell edits
  const tilesetById = useMemo(
    () =>
      new Map(
        resolveMapTilesets(map, catalog).flatMap((tileset, i) =>
          tileset ? [[ids[i]!, tileset] as const] : [],
        ),
      ),
    [tilesetKey, map.resources, catalog],
  )
  const tilesets = useMemo(() => [...tilesetById.values()], [tilesetById])
  const sheets = useMapSheets(tilesets, showToast)
  const layer = map.layers.find((candidate) => candidate.id === activeLayer) ?? map.layers[0]
  const objectLayer = layer && isObjectLayer(layer) ? layer : null
  const tileLayer = layer && isTileLayer(layer) ? layer : null
  const primary = tilesetById.get(map.tilesetId)
  const tileset = tileLayer && tilesetById.get(tileLayerTilesetId(map, tileLayer))
  const tileSize = primary?.tileSize ?? 0
  const cellPx = Math.max(4, Math.round(zoom * tileSize))
  const pad = autoExpand ? 1 : 0
  const repaint = useCallback(
    (visible: RegionTilemapAsset) => {
      if (!canvas.current || !tileSize) return
      const drawn = paintMapCanvas({
        canvas: canvas.current,
        stage: stage.current,
        map: visible,
        cellPx,
        pad,
        tileSize,
        tilesetById,
        sheetOf: sheets.sheetOf,
        cache,
        time: time.current,
        showCollision: collision,
      })
      if (drawn) viewport.current = drawn
    },
    [cellPx, pad, tileSize, tilesetById, sheets.sheetOf, cache, collision],
  )
  const paintCurrent = useCallback(() => {
    const current = mapOf(editor.getState().asset)
    if (current) repaint(current)
  }, [editor, repaint])
  const animate = useCallback(
    (at: number) => {
      time.current = at
      paintCurrent()
    },
    [paintCurrent],
  )
  useMapAnimation(tilesets, animate)
  useEffect(() => () => cache.clear(), [cache])
  // biome-ignore lint/correctness/useExhaustiveDependencies: map and sheets update the same painter
  useEffect(() => {
    paintCurrent()
  }, [map, sheets.version, paintCurrent])
  useEffect(() => {
    const root = stage.current
    if (!root) return
    root.addEventListener('scroll', paintCurrent, { passive: true })
    const resize = new ResizeObserver(paintCurrent)
    resize.observe(root)
    return () => {
      resize.disconnect()
      root.removeEventListener('scroll', paintCurrent)
    }
  }, [paintCurrent])
  const objects = createMapObjectActions({
    editor,
    showToast,
    activeObjectLayer: objectLayer,
    selectedObjectId: selectedObjects.at(-1) ?? null,
    selectedObjectIds: selectedObjects,
    chooseObjects: setSelectedObjects,
    setSelectedObjectId: (id) => setSelectedObjects(id ? [id] : []),
  })
  function chooseObject(id: string | null, additive = false): void {
    setSelectedObjects((current) => {
      if (!id) return []
      if (!additive) return [id]
      return current.includes(id) ? current.filter((other) => other !== id) : [...current, id]
    })
  }
  const gestures = createMapTileGestures<PintaMemoryAsset, RegionTilemapAsset>(
    {
      editor,
      session,
      tool,
      tilemap: map,
      layerId: layer?.id ?? '',
      tileset: tileset || null,
      selectedTile,
      stamp,
      brush,
      autoExpand,
      tileSize,
      cellPx,
      gestureRef: gesture,
      previewCellsRef: previewCells,
      panRef: pan,
      stageRef: stage,
      hoverRef: hover,
      cellFromEvent: (event) => {
        const live = mapOf(editor.getState().asset) ?? map
        const offset = layer ? effectiveLayer(live, layer) : null
        return mapCellFromCanvas(
          { x: event.clientX, y: event.clientY },
          {
            canvas: event.currentTarget.getBoundingClientRect(),
            viewport: viewport.current,
            origin: live.origin,
            cellPx,
            tileSize,
            pad,
            layerOffset: { x: offset?.offsetX ?? 0, y: offset?.offsetY ?? 0 },
          },
        )
      },
      clampCell: ({ col, row }) => ({
        col: Math.max(map.origin.col, Math.min(map.origin.col + map.cols - 1, col)),
        row: Math.max(map.origin.row, Math.min(map.origin.row + map.rows - 1, row)),
      }),
      repaintMap: repaint,
      showToast,
      setPanning,
      onGestureEnd: paintCurrent,
      isLocked() {
        if (!tileLayer) return true
        if (!effectiveLayer(map, tileLayer).locked) return false
        showToast(COPY.layers.lockedWarning)
        return true
      },
    },
    {
      map: mapOf,
      asset: (_before, after) => after,
      grow(current, side) {
        const next = expandRegionMap(current, {
          col: current.origin.col - Number(side === 'left'),
          row: current.origin.row - Number(side === 'top'),
          cols: current.cols + Number(side === 'left' || side === 'right'),
          rows: current.rows + Number(side === 'top' || side === 'bottom'),
        })
        return next.ok ? next.map : current
      },
    },
  )
  const selectTool = useCallback((tool: MapTool) => session.getState().setTool(tool), [session])
  if (!primary)
    return <div className="p-8 text-center text-pin-muted">{COPY.tiles.missingTileset}</div>
  return (
    <div className="pin-work flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-stretch md:flex-row">
        <TilemapToolbar
          orientation={wide ? 'vertical' : 'horizontal'}
          availableTools={MAP_TOOLS}
          tool={tool}
          mode={objectLayer ? 'objects' : 'tiles'}
          autoExpand={autoExpand}
          showCollision={collision}
          snapObjects={snap}
          onSelectTool={selectTool}
          onToggleAutoExpand={() => session.getState().toggleAutoExpand()}
          onToggleCollision={() => setCollision((shown) => !shown)}
          onToggleSnapObjects={() => setSnap((snapped) => !snapped)}
        />
        <div className="pin-stage relative flex min-h-0 min-w-0 flex-1">
          <MapPaper
            stageRef={stage}
            paperRef={paper}
            width={(map.cols + 2 * pad) * cellPx}
            height={(map.rows + 2 * pad) * cellPx}
          >
            <canvas
              ref={canvas}
              className="pin-pixelated absolute top-0 left-0 block"
              style={{
                touchAction: 'none',
                imageRendering: 'pixelated',
                cursor: stageCursor({ handTool: tool === 'pan', panning }),
              }}
              role="img"
              aria-label={COPY.tiles.mapGrid}
              onPointerDown={(event) => {
                if (MAP_TOOLS.includes(tool) && (tileLayer || tool === 'pan')) gestures.down(event)
              }}
              onPointerMove={gestures.move}
              onPointerUp={gestures.up}
              onPointerCancel={gestures.cancel}
              onLostPointerCapture={gestures.cancel}
              onPointerLeave={gestures.leave}
            />
            <MapEditorObjectsOverlay
              editor={editor}
              catalog={gallery}
              tilemap={map}
              activeLayerId={objectLayer?.id ?? null}
              interactive={!!objectLayer && isMapObjectTool(tool)}
              tool={isMapObjectTool(tool) ? tool : null}
              tileSize={tileSize}
              pad={pad}
              scale={cellPx / tileSize}
              snap={snap}
              selectedObjectId={selectedObjects.at(-1) ?? null}
              selectedObjectIds={selectedObjects}
              onSelectObject={chooseObject}
              onSelectObjects={setSelectedObjects}
            />
          </MapPaper>
        </div>
        <aside className="max-h-72 w-full shrink-0 overflow-y-auto bg-pin-surface md:max-h-none md:w-64">
          <Panel title={COPY.layers.title}>
            <select
              aria-label={COPY.layers.title}
              value={layer?.id ?? ''}
              onChange={(event) => {
                gestures.cancel()
                session.getState().selectLayer(event.target.value)
                session.getState().setStamp(null)
                session.getState().selectFrame(0)
                setBrush(DEFAULT_MAP_BRUSH)
                setSelectedObjects([])
              }}
            >
              {map.layers
                .filter((item) => item.kind !== 'group')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Panel>
          {objectLayer ? (
            <MapObjectPanel
              layer={objectLayer}
              selectedObjectId={selectedObjects.at(-1) ?? null}
              onSelectObject={chooseObject}
              onUpdateObject={objects.update}
              onRemoveObject={objects.remove}
              onSetProperty={objects.setProperty}
              onRemoveProperty={objects.removeProperty}
              onAddProperty={objects.addProperty}
            />
          ) : null}
          {tileset ? (
            <>
              <TilePicker
                tileset={tileset}
                selectedTile={selectedTile}
                stamp={stamp}
                onSelectTile={(index) => {
                  session.getState().selectFrame(index)
                  session.getState().setStamp(null)
                }}
                onSetStamp={(next) => session.getState().setStamp(next)}
              />
              <MapBrushPanel
                tileset={tileset}
                tile={selectedTile}
                settings={brush}
                onChange={setBrush}
                session={session}
                show={{ animation: false, terrain: true, scatter: true }}
                saveTileset={
                  embeddedTilesetOf(map, tileset.id)
                    ? undefined
                    : (after) => {
                        const current = editor.getState()
                        current.commitLinked(current.asset, { before: [tileset], after: [after] })
                      }
                }
              />
            </>
          ) : null}
        </aside>
      </div>
      <div className="pin-band flex shrink-0 items-center justify-between gap-2 px-4 py-2">
        <MapStatusBar
          cols={map.cols}
          rows={map.rows}
          register={(fn) => {
            hover.current = fn
          }}
        />
        <SessionZoomControls session={session} />
      </div>
    </div>
  )
}
