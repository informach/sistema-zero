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
import { useToolCuration } from './editorContext'
import { FocalRegionObjectsPreview } from './MapObjectsOverlay'
import { MapPaper } from './MapStage'
import { MapStatusBar } from './MapStatusBar'
import { DEFAULT_MAP_BRUSH, MapBrushPanel } from './MapTerrainPanel'
import { collectShapeBrushCells } from './mapTools/mapBrush'
import { mapFeaturesFor } from './mapTools/mapLevels'
import { mapCellFromCanvas } from './mapTools/mapViewport'
import type { PanGesture } from './mapTools/tileGestures'
import { useMapAnimation } from './mapTools/useMapAnimation'
import { useMapKeyboard } from './mapTools/useMapKeyboard'
import { useMapLevel } from './mapTools/useMapLevel'
import { useMapSheets } from './mapTools/useMapSheets'
import { stageCursor } from './stageCursor'
import { MAP_SELECT_CLASS, MapLevelSelect, type MapTool, TilemapToolbar } from './TilemapPanels'
import { TilePicker } from './TilePicker'
import { useMediaQuery } from './useMediaQuery'
import { SessionZoomControls } from './ZoomControls'

const TOOLS = ['pencil', 'eraser', 'line', 'rect', 'pan'] as const
/**
 * `revision`: a do começo da pincelada; `null` quando ela começou durante a gravação anterior e
 * entra na fila da sessão depois dela (a revisão nova é a da própria criança).
 */
export type FocalStroke = RegionalBrushGesture & {
  pointerId: number
  path: CellPos[]
  revision: string | null
}
type Stroke = FocalStroke
/** A prévia da pincelada no palco: as casas que ela vai pintar, no azul do Pinta. */
const PREVIEW_FILL = 'rgba(37, 99, 235, 0.38)'
/** O que a prévia mostra: o caminho do lápis e da borracha, a linha ou o retângulo inteiros. */
export function previewCells(
  stroke: Pick<Stroke, 'tool' | 'path'>,
  map: { origin: CellPos; cols: number; rows: number },
): readonly CellPos[] {
  const anchor = stroke.path[0]
  const target = stroke.path.at(-1)
  if (!anchor || !target || stroke.tool === 'pencil' || stroke.tool === 'eraser') return stroke.path
  // A prévia obedece à mesma admissão da pincelada antes de alocar suas casas.
  const shape = collectShapeBrushCells(map, stroke.tool, anchor, target)
  return shape.ok ? shape.positions : []
}
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
  // Os três níveis e a curadoria da aula valem aqui como no mapa comum.
  const [level, setLevel] = useMapLevel()
  const allowTools = useToolCuration()
  const features = mapFeaturesFor(level)
  const [brush, setBrush] = useState(DEFAULT_MAP_BRUSH)
  const [collision, setCollision] = useState(false)
  const [moving, setMoving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewError, setViewError] = useState<string | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stroke = useRef<Stroke | null>(null)
  /** As pinceladas já soltas que esperam a vez na fila da sessão: a prévia delas continua. */
  const queued = useRef<Stroke[]>([])
  const pan = useRef<PanGesture | null>(null)
  const hover = useRef<(at: CellPos | null) => void>(() => {})
  const noSelection = useRef(() => {})
  const noObjects = useRef(() => false)
  const cancelGesture = useRef<() => boolean>(() => false)
  const fetchView = useRef<AbortController | null>(null)
  // A geometria da janela pintada por último. Fica enquanto a próxima carrega: o palco segue
  // desenhado e os toques continuam valendo (a casa depende só da geometria, não do conteúdo).
  const viewport = useRef<{ bounds: MapViewport; cellPx: number } | null>(null)
  /** A última janela pintada, sem prévia: volta por baixo da prévia enquanto a janela nova não
   * chega, para a linha e o retângulo não deixarem rastro. */
  const lastWindow = useRef<HTMLCanvasElement | null>(null)
  const windowView = useRef<NonNullable<Awaited<ReturnType<typeof focal.viewport>>> | null>(null)
  /** O tamanho de casa com que a janela atual foi lida. */
  const windowCellPx = useRef(0)
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
  const offsetX = layer?.placement.offsetX ?? 0
  const offsetY = layer?.placement.offsetY ?? 0
  /** Pinta a prévia das pinceladas (a em andamento e as da fila) por cima da janela. */
  const paintPreview = useCallback(() => {
    const shown = stroke.current ? [...queued.current, stroke.current] : queued.current
    const current = viewport.current
    const context = shown.length ? canvas.current?.getContext('2d') : null
    if (!current || !context) return
    const { bounds, cellPx: px } = current
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.fillStyle = PREVIEW_FILL
    for (const item of shown)
      for (const at of previewCells(item, document))
        context.fillRect(
          (at.col - document.origin.col + offsetX / tileSize) * px - bounds.x,
          (at.row - document.origin.row + offsetY / tileSize) * px - bounds.y,
          px,
          px,
        )
    context.restore()
  }, [document, offsetX, offsetY, tileSize])
  const rememberWindow = useCallback((source: HTMLCanvasElement) => {
    const copy = lastWindow.current ?? globalThis.document?.createElement('canvas')
    if (!copy) return
    if (copy.width !== source.width) copy.width = source.width
    if (copy.height !== source.height) copy.height = source.height
    const context = copy.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, copy.width, copy.height)
    context.drawImage(source, 0, 0)
    lastWindow.current = copy
  }, [])
  /** Repõe a última janela pintada (sem prévia) e pinta a prévia por cima. */
  const repaintPreviewOverLastWindow = useCallback(() => {
    const target = canvas.current
    const copy = lastWindow.current
    const context = target?.getContext('2d')
    if (target && copy && context && copy.width === target.width && copy.height === target.height) {
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, target.width, target.height)
      context.drawImage(copy, 0, 0)
      context.restore()
    }
    paintPreview()
  }, [paintPreview])
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
    viewport.current = { bounds, cellPx: windowCellPx.current }
    rememberWindow(canvas.current)
    paintPreview()
    setLoading(false)
    setViewError(null)
    return true
  }, [focal, cache, sheets.sheetOf, document.tilesetId, paintPreview, rememberWindow])
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
            setViewError(COPY.scene.focal.windowError)
            return
          }
          windowView.current = view
          windowCellPx.current = cellPx
          drawWindow()
        },
        () => {
          // A mensagem do IndexedDB vem crua e em inglês: a criança lê a frase do Pinta.
          if (request.signal.aborted) return
          setLoading(false)
          setViewError(COPY.scene.focal.windowError)
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
    if (!current) return null
    return mapCellFromCanvas(
      { x: event.clientX, y: event.clientY },
      {
        canvas: event.currentTarget.getBoundingClientRect(),
        viewport: current.bounds,
        origin: document.origin,
        tileSize,
        cellPx: current.cellPx,
        pad: 0,
        layerOffset: { x: offsetX, y: offsetY },
      },
    )
  }
  /** Tira a prévia do palco: repinta a janela, ou busca outra quando a pintada já é antiga. */
  function clearPreview() {
    if (!drawWindow()) loadWindow()
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
    if (!layer || !tileset || !canPaintWith(tool)) return
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
      revision: focal.store.getState().saving ? null : focal.store.getState().revision,
      pointerId: event.pointerId,
    }
    paintPreview()
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
      clearPreview()
      showToast(COPY.scene.gestureRefused)
      return
    }
    active.path.push(at)
    // A janela repinta com a prévia por cima (a linha e o retângulo mudam de forma). Enquanto a
    // janela nova não chega, a prévia vai por cima da última janela pintada, sem deixar rastro.
    if (!drawWindow()) repaintPreviewOverLastWindow()
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
    if (gesture.revision !== null && gesture.revision !== focal.store.getState().revision) {
      clearPreview()
      showToast(COPY.scene.gestureChanged)
      return
    }
    // A prévia fica no palco até a janela nova (com a pincelada gravada) chegar.
    queued.current = [...queued.current, gesture]
    void focal.apply(gesture).then(({ changed, message }) => {
      queued.current = queued.current.filter((item) => item !== gesture)
      if (!changed) clearPreview()
      if (message) showToast(message)
    })
  }
  function cancel(event: PointerEvent<HTMLCanvasElement>) {
    stopHand(event.pointerId)
    if (stroke.current?.pointerId !== event.pointerId) return
    stroke.current = null
    clearPreview()
  }
  // Esc solta a pincelada ou o arrasto da mão sem gravar nada.
  cancelGesture.current = () => {
    const hand = pan.current
    if (hand) stopHand(hand.pointerId)
    if (!stroke.current) return hand !== null
    stroke.current = null
    clearPreview()
    return true
  }
  useMapKeyboard({
    session,
    mode: 'tiles',
    level,
    allowTools,
    availableTools: TOOLS,
    hasSelection: () => false,
    deleteSelectionRef: noSelection,
    deleteObjectRef: noObjects,
    cancelGestureRef: cancelGesture,
  })
  return (
    <div className="pin-work flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-stretch md:flex-row">
        <TilemapToolbar
          orientation={wide ? 'vertical' : 'horizontal'}
          level={level}
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
            <div
              role="status"
              className="pin-float absolute left-3 top-3 flex flex-wrap items-center gap-2 p-2"
            >
              <p>{viewError}</p>
              <Button variant="barOutline" onClick={loadWindow}>
                {COPY.gallery.retry}
              </Button>
            </div>
          ) : null}
        </div>
        <aside className="max-h-72 w-full shrink-0 overflow-y-auto bg-pin-surface md:max-h-none md:w-64">
          <Panel title={COPY.scene.criarDoMeuJeito}>
            <MapLevelSelect level={level} onChange={setLevel} />
          </Panel>
          <Panel title={COPY.layers.title}>
            <select
              aria-label={COPY.layers.title}
              className={MAP_SELECT_CLASS}
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
                show={{ animation: false, terrain: features.terrain, scatter: features.scatter }}
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
