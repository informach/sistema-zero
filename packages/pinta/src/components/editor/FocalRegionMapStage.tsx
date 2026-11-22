import {
  type JSX,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../core/copy'
import { safeSetPointerCapture } from '../../core/pointer'
import type {
  LocalRegionAuthorSession,
  RegionalBrushGesture,
} from '../../state/localRegionAuthorSession'
import type { PintaSessionStore } from '../../state/sessionStore'
import type { CellPos } from '../../tiles/cellGeometry'
import { type MapViewport, TileChunkCache } from '../../tiles/chunks'
import { REGION_EDIT_LIMIT } from '../../tiles/regionCells'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { FocalRegionObjectsPreview } from './MapObjectsOverlay'
import { MapPaper } from './MapStage'
import { MapStatusBar } from './MapStatusBar'
import { DEFAULT_MAP_BRUSH, MapBrushPanel } from './MapTerrainPanel'
import { mapCellFromCanvas } from './mapTools/mapViewport'
import type { PanGesture } from './mapTools/tileGestures'
import { useMapAnimation } from './mapTools/useMapAnimation'
import { useMapSheets } from './mapTools/useMapSheets'
import { stageCursor } from './stageCursor'
import { type MapTool, TilemapToolbar } from './TilemapPanels'
import { TilePicker } from './TilePicker'
import { useMediaQuery } from './useMediaQuery'
import { SessionZoomControls } from './ZoomControls'

const TOOLS = ['pencil', 'eraser', 'line', 'rect', 'pan'] as const
type Stroke = RegionalBrushGesture & { pointerId: number; path: CellPos[]; revision: string }
const canPaintWith = (tool: MapTool): tool is Stroke['tool'] =>
  tool === 'pencil' || tool === 'eraser' || tool === 'line' || tool === 'rect'

export function FocalRegionMapStage({
  focal,
  session,
}: {
  focal: LocalRegionAuthorSession
  session: PintaSessionStore
}): JSX.Element {
  const { showToast } = useToast()
  const wide = useMediaQuery('(min-width: 768px)')
  const { document, revision, saving, error, canUndo, canRedo } = useStore(focal.store)
  const tool = useStore(session, (state) => state.tool) as MapTool
  const zoom = useStore(session, (state) => state.zoom)
  const stamp = useStore(session, (state) => state.stamp)
  const tile = useStore(session, (state) => state.frameIndex)
  const active = useStore(session, (state) => state.layerId)
  const [brush, setBrush] = useState(DEFAULT_MAP_BRUSH)
  const [collision, setCollision] = useState(false)
  const [moving, setMoving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewError, setViewError] = useState<string | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stroke = useRef<Stroke | null>(null)
  const pan = useRef<PanGesture | null>(null)
  const hover = useRef<(at: CellPos | null) => void>(() => {})
  const fetchView = useRef<AbortController | null>(null)
  const viewport = useRef<{ bounds: MapViewport; revision: string } | null>(null)
  const windowView = useRef<NonNullable<Awaited<ReturnType<typeof focal.viewport>>> | null>(null)
  const time = useRef(0)
  const cache = useMemo(() => new TileChunkCache(), [])
  const layers = document.layers.filter(
    (layer) => layer.kind !== 'objects' && layer.kind !== 'group',
  )
  const layer = layers.find((candidate) => candidate.id === active) ?? layers[0]
  const tileSize = focal.tilesets.get(document.tilesetId)!.tileSize
  const tileset = layer ? focal.tilesets.get(layer.tilesetId ?? document.tilesetId) : null
  const cellPx = Math.max(4, Math.round(zoom * tileSize))
  const tilesets = useMemo(() => [...focal.tilesets.values()], [focal.tilesets])
  const sheets = useMapSheets(tilesets, showToast)
  const drawWindow = useCallback(() => {
    const view = windowView.current
    if (
      !view ||
      !canvas.current ||
      !sheets.sheetOf(document.tilesetId) ||
      view.revision !== focal.store.getState().revision
    )
      return false
    const bounds = view.paint({
      canvas: canvas.current,
      cache,
      time: time.current,
      sheetOf: (sheet) => sheets.sheetOf(sheet.id),
    })
    if (!bounds) return false
    viewport.current = { bounds, revision: view.revision }
    setLoading(false)
    setViewError(null)
    return true
  }, [focal, cache, sheets.sheetOf, document.tilesetId])
  const animate = useCallback(
    (now: number) => {
      time.current = now
      drawWindow()
    },
    [drawWindow],
  )
  useMapAnimation(tilesets, animate)
  const loadWindow = useCallback(() => {
    if (!stage.current || revision !== focal.store.getState().revision) return
    fetchView.current?.abort()
    const request = new AbortController()
    fetchView.current = request
    viewport.current = null
    windowView.current = null
    setLoading(true)
    void focal
      .viewport({
        stage: stage.current,
        pad: 0,
        cellPx,
        showCollision: collision,
        signal: request.signal,
      })
      .then(
        (view) => {
          if (request.signal.aborted) return
          if (!view) {
            setLoading(false)
            setViewError(COPY.scene.gestureChanged)
            return
          }
          windowView.current = view
          drawWindow()
        },
        (problem: unknown) => {
          if (request.signal.aborted) return
          setLoading(false)
          setViewError(problem instanceof Error ? problem.message : String(problem))
        },
      )
  }, [focal, cellPx, collision, drawWindow, revision])
  useEffect(() => () => cache.clear(), [cache])
  useEffect(() => {
    if (!stage.current) return
    const element = stage.current
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(loadWindow)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    element.addEventListener('scroll', schedule, { passive: true })
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      fetchView.current?.abort()
      resize.disconnect()
      element.removeEventListener('scroll', schedule)
    }
  }, [loadWindow])
  // biome-ignore lint/correctness/useExhaustiveDependencies: sheets are built asynchronously on the same config
  useEffect(() => {
    drawWindow()
  }, [sheets.version, drawWindow])

  function cellAtPointer(event: PointerEvent<HTMLCanvasElement>): CellPos | null {
    const current = viewport.current
    if (!current || current.revision !== focal.store.getState().revision) return null
    return mapCellFromCanvas(
      { x: event.clientX, y: event.clientY },
      {
        canvas: event.currentTarget.getBoundingClientRect(),
        viewport: current.bounds,
        origin: document.origin,
        tileSize,
        cellPx,
        pad: 0,
        layerOffset: { x: layer?.placement.offsetX ?? 0, y: layer?.placement.offsetY ?? 0 },
      },
    )
  }
  const selectTool = useCallback(
    (tool: MapTool) => {
      stroke.current = null
      session.getState().setTool(tool)
    },
    [session],
  )
  function down(event: PointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary || stroke.current || pan.current) return
    const root = stage.current
    if (tool === 'pan' && root) {
      safeSetPointerCapture(event.currentTarget, event.pointerId)
      pan.current = {
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startScroll: { x: root.scrollLeft, y: root.scrollTop },
      }
      setMoving(true)
      return
    }
    if (!layer || !tileset || !canPaintWith(tool) || focal.store.getState().saving) return
    if (layer.placement.locked) {
      showToast(COPY.layers.lockedWarning)
      return
    }
    const at = cellAtPointer(event)
    if (!at) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    stroke.current = {
      tool,
      layerId: layer.id,
      stamp,
      selectedTile: tile,
      brush,
      path: [at],
      revision: focal.store.getState().revision,
      pointerId: event.pointerId,
    }
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    const hand = pan.current
    if (hand?.pointerId === event.pointerId && stage.current) {
      stage.current.scrollLeft = hand.startScroll.x - (event.clientX - hand.startClient.x)
      stage.current.scrollTop = hand.startScroll.y - (event.clientY - hand.startClient.y)
      return
    }
    const at = cellAtPointer(event)
    hover.current(at)
    const active = stroke.current
    if (!at || active?.pointerId !== event.pointerId) return
    const last = active.path.at(-1)
    if (last?.col === at.col && last.row === at.row) return
    if (active.path.length >= REGION_EDIT_LIMIT) {
      stroke.current = null
      showToast(COPY.scene.gestureRefused)
      return
    }
    active.path.push(at)
  }
  function stopHand(pointerId: number) {
    if (pan.current?.pointerId === pointerId) {
      pan.current = null
      setMoving(false)
    }
  }
  function up(event: PointerEvent<HTMLCanvasElement>) {
    stopHand(event.pointerId)
    const gesture = stroke.current
    if (gesture?.pointerId !== event.pointerId) return
    move(event)
    stroke.current = null
    if (gesture.revision !== focal.store.getState().revision) {
      showToast(COPY.scene.gestureChanged)
      return
    }
    void focal.apply(gesture).then(({ message }) => {
      if (message) showToast(message)
    })
  }
  function cancel(event: PointerEvent<HTMLCanvasElement>) {
    stopHand(event.pointerId)
    if (stroke.current?.pointerId === event.pointerId) stroke.current = null
  }
  return (
    <div className="pin-work flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-stretch md:flex-row">
        <TilemapToolbar
          orientation={wide ? 'vertical' : 'horizontal'}
          availableTools={TOOLS}
          tool={tool}
          mode="tiles"
          autoExpand={false}
          showCollision={collision}
          snapObjects={false}
          onSelectTool={selectTool}
          onToggleCollision={() => setCollision((value) => !value)}
        />
        <div
          className="pin-stage relative flex min-h-0 min-w-0 flex-1"
          aria-busy={loading || saving}
        >
          <MapPaper
            stageRef={stage}
            paperRef={paper}
            width={document.cols * cellPx}
            height={document.rows * cellPx}
          >
            <canvas
              ref={canvas}
              className="pin-pixelated absolute top-0 left-0 block"
              style={{
                touchAction: 'none',
                imageRendering: 'pixelated',
                cursor: stageCursor({ handTool: tool === 'pan', panning: moving }),
              }}
              role="img"
              aria-label={COPY.tiles.mapGrid}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={cancel}
              onLostPointerCapture={cancel}
              onPointerLeave={() => hover.current(null)}
            />
            <FocalRegionObjectsPreview
              map={document}
              tileSize={tileSize}
              scale={cellPx / tileSize}
              catalog={focal.catalog}
            />
          </MapPaper>
          {viewError ? (
            <p role="status" className="pin-float absolute left-3 top-3 p-2">
              {viewError}
            </p>
          ) : null}
        </div>
        <aside className="max-h-72 w-full shrink-0 overflow-y-auto bg-pin-surface md:max-h-none md:w-64">
          <Panel title={COPY.layers.title}>
            <select
              aria-label={COPY.layers.title}
              value={layer?.id ?? ''}
              onChange={(event) => {
                stroke.current = null
                session.getState().selectLayer(event.target.value)
                session.getState().selectFrame(0)
                session.getState().setStamp(null)
                setBrush(DEFAULT_MAP_BRUSH)
              }}
            >
              {layers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Panel>
          {tileset ? (
            <>
              <TilePicker
                tileset={tileset}
                selectedTile={tile}
                stamp={stamp}
                onSelectTile={(index) => {
                  session.getState().selectFrame(index)
                  session.getState().setStamp(null)
                }}
                onSetStamp={(next) => session.getState().setStamp(next)}
              />
              <MapBrushPanel
                tileset={tileset}
                tile={tile}
                settings={brush}
                onChange={setBrush}
                session={session}
                show={{ animation: false, terrain: true, scatter: true }}
              />
            </>
          ) : null}
        </aside>
      </div>
      <div className="pin-band flex shrink-0 items-center justify-between gap-2 px-4 py-2">
        <div className="flex gap-2">
          <Button
            variant="barOutline"
            disabled={!canUndo || saving}
            onClick={() => void focal.undo()}
          >
            {COPY.editor.undo}
          </Button>
          <Button
            variant="barOutline"
            disabled={!canRedo || saving}
            onClick={() => void focal.redo()}
          >
            {COPY.editor.redo}
          </Button>
          {error ? (
            <>
              <Button variant="barOutline" disabled={saving} onClick={() => void focal.retry()}>
                {COPY.gallery.retry}
              </Button>
              <p role="alert">{error}</p>
            </>
          ) : null}
        </div>
        <MapStatusBar
          cols={document.cols}
          rows={document.rows}
          register={(handler) => {
            hover.current = handler
          }}
        />
        <SessionZoomControls session={session} />
      </div>
    </div>
  )
}
