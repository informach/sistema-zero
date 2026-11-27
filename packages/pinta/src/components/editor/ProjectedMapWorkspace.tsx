import {
  createPintaProjectionGeometry,
  makePintaHexCell,
  PINTA_HEX_EMPTY_CELL,
} from '@sistemazero/core/creations'
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useStore } from 'zustand'
import type { PintaWorkshopAsset } from '../../core/assetMemory'
import { embeddedTilesetOf } from '../../core/mapResourceVersions'
import { effectiveLayer, isTilesetKind, tilemapTilesetIds } from '../../core/project'
import { isProjectedTileLayer, type WorkshopProjectedMap } from '../../core/projectedDocument'
import { drawScene } from '../../export/sceneDrawing'
import type { PintaEditorStore } from '../../state/editorStore'
import { createAutomapBook } from '../../tiles/automapping/book'
import { CELL_FLIP_H, EMPTY_CELL, makeCell } from '../../tiles/cell'
import type { CellRect } from '../../tiles/cellGeometry'
import { editProjectedMapCells } from '../../tiles/projectedMap'
import {
  copyProjectedSelection,
  type ProjectedSelection,
  pasteProjectedSelection,
} from '../../tiles/projectedSelection'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { ProjectedAutomappingPanel } from './MapAutomappingPanel'
import { useProjectedScene } from './useProjectedScene'

type Tool = 'paint' | 'erase' | 'pan' | 'select'
type Gesture = {
  base: WorkshopProjectedMap
  current: WorkshopProjectedMap
  pointer: number
  x: number
  y: number
  pan: { x: number; y: number }
  start?: { col: number; row: number }
}

/** Projection-specific geometry inside the common editor lifecycle, history and autosave. */
export function ProjectedMapWorkspace({
  editor,
  catalog,
  readOnly = false,
}: {
  editor: PintaEditorStore<WorkshopProjectedMap>
  catalog: readonly PintaWorkshopAsset[]
  readOnly?: boolean
}) {
  const map = useStore(editor, (state) => state.asset)
  const { showToast } = useToast()
  const layers = map.layers.filter(isProjectedTileLayer)
  const [layerId, setLayerId] = useState(layers[0]?.id ?? '')
  const layer = layers.find((item) => item.id === layerId) ?? layers[0]
  const [tile, setTile] = useState(0)
  const [tool, setTool] = useState<Tool>(readOnly ? 'pan' : 'paint')
  const [flip, setFlip] = useState(false)
  const [rotation, setRotation] = useState<0 | 60 | 120 | 180 | 240 | 300>(0)
  const [zoom, setZoom] = useState(2)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 640, height: 480 })
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null)
  const [selection, setSelection] = useState<CellRect | null>(null)
  const [clipboard, setClipboard] = useState<ProjectedSelection | null>(null)
  const [shown, setShown] = useState<WorkshopProjectedMap | null>(null)
  const [strokeMap, setStrokeMap] = useState<WorkshopProjectedMap | null>(null)
  const ruleStroke = useRef<
    ((base: WorkshopProjectedMap, painted: WorkshopProjectedMap, layer: string) => void) | undefined
  >(undefined)
  const showPreview = useCallback(
    (base: WorkshopProjectedMap, next: WorkshopProjectedMap | null) => {
      if (editor.getState().asset === base) setShown(next)
    },
    [editor],
  )
  const registerStroke = useCallback((next: typeof ruleStroke.current) => {
    ruleStroke.current = next
  }, [])
  const ruleSheets = useMemo(
    () =>
      tilemapTilesetIds(map).flatMap((id) => {
        const sheet = embeddedTilesetOf(map, id) ?? catalog.find((asset) => asset.id === id)
        return sheet && isTilesetKind(sheet) ? [sheet] : []
      }),
    [map, catalog],
  )
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const finishGesture = useRef<(pointer: number) => void>(() => {})
  const geometry = useMemo(() => createPintaProjectionGeometry(map.projection), [map.projection])
  const bounds = useMemo(
    () => ({ ...map.origin, cols: map.cols, rows: map.rows }),
    [map.origin, map.cols, map.rows],
  )
  const world = geometry.worldBounds(bounds)
  const center = { x: world.x + world.width / 2, y: world.y + world.height / 2 }
  // The origin of the camera stays fixed when an expandable map grows on its left/top.
  const [anchor] = useState(center)
  const camera = useMemo(
    () => ({
      x: anchor.x + pan.x - size.width / zoom / 2,
      y: anchor.y + pan.y - size.height / zoom / 2,
    }),
    [anchor.x, anchor.y, pan.x, pan.y, size.width, size.height, zoom],
  )
  const { value: rendered, error } = useProjectedScene(strokeMap ?? shown ?? map, catalog)
  const sheetId = layer?.tilesetId ?? map.tilesetId
  const sheet = rendered?.scene.tilesets.find((item) => item.id === sheetId)
  const hex = map.projection.kind === 'hexagonal'
  const locked = readOnly || !layer || effectiveLayer(map, layer).locked
  useEffect(() => {
    setShown(null)
    if (gesture.current && gesture.current.base !== map && gesture.current.current !== map) {
      gesture.current = null
      setStrokeMap(null)
    }
  }, [map])

  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    const resize = () =>
      setSize({
        width: Math.max(1, element.clientWidth),
        height: Math.max(1, element.clientHeight),
      })
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext('2d')
    if (!element || !ctx) return
    const ratio = window.devicePixelRatio || 1
    element.width = Math.ceil(size.width * ratio)
    element.height = Math.ceil(size.height * ratio)
    ctx.setTransform(
      ratio * zoom,
      0,
      0,
      ratio * zoom,
      -camera.x * ratio * zoom,
      -camera.y * ratio * zoom,
    )
    ctx.imageSmoothingEnabled = false
    function outline(col: number, row: number) {
      for (const [index, point] of geometry.polygon(col, row).entries()) {
        if (index) ctx!.lineTo(point.x, point.y)
        else ctx!.moveTo(point.x, point.y)
      }
      ctx!.closePath()
    }
    const viewport = { ...camera, width: size.width / zoom, height: size.height / zoom }
    ctx.clearRect(viewport.x, viewport.y, viewport.width, viewport.height)
    if (rendered) {
      drawScene(ctx, rendered.scene, rendered.images, 'back', 0, { x: 0, y: 0 }, viewport)
      drawScene(ctx, rendered.scene, rendered.images, 'front', 0, { x: 0, y: 0 }, viewport)
    }
    // Never enumerate the full world just to draw a grid.
    const visible = geometry.visibleCells(bounds, viewport)
    if (visible && visible.cols * visible.rows <= 4096) {
      ctx.lineWidth = 1 / zoom
      ctx.strokeStyle = 'rgba(90, 100, 120, .18)'
      ctx.beginPath()
      for (let row = visible.row; row < visible.row + visible.rows; row++) {
        for (let col = visible.col; col < visible.col + visible.cols; col++) {
          outline(col, row)
        }
      }
      ctx.stroke()
    }
    if (hover) {
      ctx.strokeStyle = '#7855c8'
      ctx.lineWidth = 2 / zoom
      ctx.beginPath()
      outline(hover.col, hover.row)
      ctx.stroke()
    }
    if (selection && selection.cols * selection.rows <= 4096) {
      ctx.fillStyle = 'rgba(120, 85, 200, .2)'
      ctx.beginPath()
      for (let row = selection.row; row < selection.row + selection.rows; row++)
        for (let col = selection.col; col < selection.col + selection.cols; col++) {
          outline(col, row)
        }
      ctx.fill()
    }
  }, [rendered, geometry, bounds, hover, selection, size, zoom, camera])

  function brushValue() {
    return tool === 'erase'
      ? hex
        ? PINTA_HEX_EMPTY_CELL
        : EMPTY_CELL
      : hex
        ? makePintaHexCell(tile, { flipX: flip, rotation })!
        : makeCell(tile, flip ? CELL_FLIP_H : 0)
  }
  function paint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const cell = geometry.pick(
      (event.clientX - rect.left) / zoom + camera.x,
      (event.clientY - rect.top) / zoom + camera.y,
      map.growth === 'fixed' ? bounds : undefined,
    )
    setHover(cell)
    const active = gesture.current
    if (!active || active.pointer !== event.pointerId) return
    if (tool === 'pan') {
      setPan({
        x: active.pan.x - (event.clientX - active.x) / zoom,
        y: active.pan.y - (event.clientY - active.y) / zoom,
      })
      return
    }
    if (tool === 'select') {
      if (!cell) return
      active.start ??= cell
      const cols = Math.abs(cell.col - active.start.col) + 1,
        rows = Math.abs(cell.row - active.start.row) + 1
      if (cols * rows <= 65536)
        setSelection({
          col: Math.min(cell.col, active.start.col),
          row: Math.min(cell.row, active.start.row),
          cols,
          rows,
        })
      return
    }
    if (!cell || !layer || locked || !sheet || tile >= sheet.count) return
    const offset = effectiveLayer(map, layer)
    // Picking follows the layer's own world offset as well as the projection footprint.
    const local = geometry.pick(
      (event.clientX - rect.left) / zoom + camera.x - offset.offsetX,
      (event.clientY - rect.top) / zoom + camera.y - offset.offsetY,
      map.growth === 'fixed' ? bounds : undefined,
    )
    if (!local) return
    const result = editProjectedMapCells(active.current, layer.id, [
      { ...local, cell: brushValue() },
    ])
    if (!result.ok) {
      showToast('Esta pincelada passou do limite do cenário. O desenho foi mantido.')
      return
    }
    if (result.map === active.current) return
    if (editor.getState().asset !== (ruleStroke.current ? active.base : active.current)) {
      gesture.current = null
      setStrokeMap(null)
      return
    }
    if (ruleStroke.current) {
      active.current = result.map
      setStrokeMap(result.map)
    } else {
      const written = editor.getState().replaceIfCurrent(active.current, result.map)
      if (written) active.current = written
      else {
        gesture.current = null
        setStrokeMap(null)
      }
    }
  }
  function finish(pointer: number) {
    const active = gesture.current
    if (!active || active.pointer !== pointer) return
    gesture.current = null
    setStrokeMap(null)
    if (active.current === active.base) return
    if (ruleStroke.current && layer) {
      if (editor.getState().asset === active.base)
        ruleStroke.current(active.base, active.current, layer.id)
    } else if (editor.getState().asset === active.current)
      editor.getState().commitGesture(active.base)
  }
  finishGesture.current = finish
  useEffect(() => {
    const settle = () => {
      const active = gesture.current
      if (active) {
        finishGesture.current(active.pointer)
        void editor.getState().flush()
      }
    }
    const hidden = () => {
      if (document.visibilityState === 'hidden') settle()
    }
    // Commit before the shared editor's pagehide flush, including an interrupted touch gesture.
    window.addEventListener('pagehide', settle, true)
    document.addEventListener('visibilitychange', hidden, true)
    return () => {
      window.removeEventListener('pagehide', settle, true)
      document.removeEventListener('visibilitychange', hidden, true)
      settle()
    }
  }, [editor])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col md:flex-row"
      data-projected-map-editor={map.projection.kind}
    >
      <div className="pin-col flex shrink-0 gap-2 overflow-auto p-3 md:w-44 md:flex-col">
        {(
          [
            ['paint', 'Pincel'],
            ['erase', 'Borracha'],
            ['select', 'Selecionar'],
            ['pan', 'Mover a vista'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant="barOutline"
            aria-pressed={tool === id}
            disabled={readOnly && (id === 'paint' || id === 'erase')}
            onClick={() => setTool(id)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="barOutline"
          aria-pressed={flip}
          disabled={readOnly}
          onClick={() => setFlip(!flip)}
        >
          Espelhar peça
        </Button>
        {hex ? (
          <Button
            variant="barOutline"
            disabled={readOnly}
            onClick={() => setRotation(((rotation + 60) % 360) as typeof rotation)}
          >
            Girar: {rotation}°
          </Button>
        ) : null}
        <Button
          variant="barOutline"
          disabled={!selection || !layer}
          onClick={() => {
            const clip = selection && layer && copyProjectedSelection(map, layer.id, selection)
            if (clip) setClipboard(clip)
            else showToast('Selecione uma área de até 65.536 casas dentro do cenário.')
          }}
        >
          Copiar seleção
        </Button>
        <Button
          variant="barOutline"
          disabled={!clipboard || !layer || locked}
          onClick={() => {
            if (!clipboard || !layer) return
            const result = pasteProjectedSelection(
              map,
              layer.id,
              clipboard,
              hover ?? selection ?? map.origin,
            )
            if (result.ok) editor.getState().commit(result.map)
            else
              showToast(
                'Não foi possível colar nesta camada. Confira a folha de peças e a área escolhida.',
              )
          }}
        >
          Colar seleção
        </Button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {readOnly ? (
          <p role="status" className="p-3 text-sm text-pin-text">
            Este mapa está disponível para leitura nesta versão do Pinta. Você pode explorar e
            baixar o original.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="p-3 text-pin-text">
            {error}
          </p>
        ) : null}
        <div ref={stage} className="pin-stage relative min-h-52 flex-1 overflow-hidden">
          <canvas
            ref={canvas}
            tabIndex={0}
            aria-label="Desenhar no cenário"
            aria-description="Use as setas para escolher uma casa e Enter para pintar. Escape limpa a seleção."
            onKeyDown={(event) => {
              const current = hover ?? {
                col: map.origin.col + Math.floor(map.cols / 2),
                row: map.origin.row + Math.floor(map.rows / 2),
              }
              const direction = (
                {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                } as Record<string, readonly number[]>
              )[event.key]
              if (direction) {
                event.preventDefault()
                if (tool === 'pan') {
                  setPan((value) => ({
                    x: value.x + direction[0]! * geometry.cellWidth,
                    y: value.y + direction[1]! * geometry.cellHeight,
                  }))
                  return
                }
                const start = geometry.center(current.col, current.row)
                const next = geometry
                  .neighbors(current.col, current.row)
                  .map((cell) => {
                    const point = geometry.center(cell.col, cell.row),
                      dx = point.x - start.x,
                      dy = point.y - start.y
                    return {
                      cell,
                      score: (dx * direction[0]! + dy * direction[1]!) / Math.hypot(dx, dy),
                    }
                  })
                  .sort((a, b) => b.score - a.score)[0]?.cell
                if (next) {
                  setHover(next)
                  const point = geometry.center(next.col, next.row)
                  if (
                    point.x < camera.x ||
                    point.y < camera.y ||
                    point.x > camera.x + size.width / zoom ||
                    point.y > camera.y + size.height / zoom
                  )
                    setPan({ x: point.x - anchor.x, y: point.y - anchor.y })
                }
              } else if (event.key === 'Escape') {
                setSelection(null)
                setHover(null)
              } else if (
                (event.key === 'Enter' || event.key === ' ') &&
                layer &&
                sheet &&
                !locked &&
                tile < sheet.count &&
                !gesture.current
              ) {
                event.preventDefault()
                if (tool === 'select') {
                  setSelection({ ...current, cols: 1, rows: 1 })
                  return
                }
                if (tool === 'pan') return
                const result = editProjectedMapCells(map, layer.id, [
                  { ...current, cell: brushValue() },
                ])
                if (result.ok) {
                  if (result.map === map) return
                  if (ruleStroke.current) ruleStroke.current(map, result.map, layer.id)
                  else editor.getState().commit(result.map)
                } else
                  showToast('Esta casa está fora do limite do cenário. Seu desenho continua igual.')
              }
            }}
            className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={(event) => {
              if (event.button !== 0 || gesture.current) return
              event.currentTarget.setPointerCapture(event.pointerId)
              const base = editor.getState().asset
              gesture.current = {
                base,
                current: base,
                pointer: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                pan,
              }
              paint(event)
            }}
            onPointerMove={paint}
            onPointerUp={(event) => finish(event.pointerId)}
            onPointerCancel={(event) => finish(event.pointerId)}
            onLostPointerCapture={(event) => finish(event.pointerId)}
          />
        </div>
        <div className="pin-band flex shrink-0 items-center justify-between gap-2 p-2">
          <span className="text-sm text-pin-text" role="status">
            {hover
              ? `Coluna ${hover.col}, linha ${hover.row}`
              : 'Escolha uma peça e pinte no cenário.'}
          </span>
          <label className="flex items-center gap-2 text-sm">
            Zoom
            <select
              aria-label="Zoom"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            >
              {[0.25, 0.5, 1, 2, 4, 8].map((value) => (
                <option key={value} value={value}>
                  {value * 100}%
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="pin-col pin-col--end flex max-h-64 shrink-0 flex-col gap-3 overflow-auto p-3 md:max-h-none md:w-68">
        <label className="flex flex-col gap-2 text-sm font-bold">
          Camada
          <select
            aria-label="Camada"
            value={layer?.id ?? ''}
            onChange={(event) => {
              setLayerId(event.target.value)
              setTile(0)
            }}
          >
            {layers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {effectiveLayer(map, item).locked ? ' (travada)' : ''}
              </option>
            ))}
          </select>
        </label>
        {locked && !readOnly ? <p className="text-sm">Esta camada está travada.</p> : null}
        <fieldset className="grid grid-cols-4 gap-2" aria-label="Peças">
          {sheet ? (
            Array.from({ length: sheet.count }, (_, index) => (
              <button
                type="button"
                // biome-ignore lint/suspicious/noArrayIndexKey: the canonical slot index is the persistent identity of a tile, including identical artwork.
                key={index}
                aria-label={`Peça ${index + 1}`}
                aria-pressed={tile === index}
                className="min-h-11 rounded-lg border-2 border-pin-border bg-pin-surface p-1 aria-pressed:border-pin-accent"
                onClick={() => {
                  setTile(index)
                  setTool('paint')
                }}
              >
                <span
                  className="mx-auto block size-8"
                  style={{
                    backgroundImage: `url(${sheet.image})`,
                    backgroundSize: `${sheet.columns * 32}px auto`,
                    backgroundPosition: `${-(index % sheet.columns) * 32}px ${-Math.floor(index / sheet.columns) * 32}px`,
                    imageRendering: 'pixelated',
                  }}
                />
              </button>
            ))
          ) : (
            <p className="col-span-4 text-sm">Abrindo as peças…</p>
          )}
        </fieldset>
        {readOnly ? null : map.automapping ? (
          <ProjectedAutomappingPanel
            map={map}
            selection={selection}
            sheets={ruleSheets}
            editor={editor}
            showPreview={showPreview}
            registerStroke={registerStroke}
          />
        ) : (
          <Button
            variant="barOutline"
            onClick={() =>
              editor.getState().commit({
                ...map,
                automapping: createAutomapBook(),
              })
            }
          >
            Criar autorregras
          </Button>
        )}
      </div>
    </div>
  )
}
