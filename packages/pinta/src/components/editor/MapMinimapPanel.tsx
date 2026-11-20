import { type JSX, type RefObject, useEffect, useId, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  type AnyTilesetAsset,
  isTileLayer,
  PINTA_MAP_FORMAT_LIMITS,
  type TilemapAsset,
} from '../../core/project'
import { paintMinimap } from '../../tiles/minimap'
import { Panel } from '../ui/Panel'
import { cachedMinimapColors, type MinimapViewRect, minimapViewRect } from './mapTools/minimapView'

/** Quanto esperar depois da última mudança do mapa para pintar o minimapa de novo. */
export const MINIMAP_REPAINT_DELAY_MS = 200

export function MapMinimapPanel({
  map,
  tilesets,
  onJump,
  stageRef,
  cellPx = 0,
  pad = 0,
  repaintDelayMs = MINIMAP_REPAINT_DELAY_MS,
}: {
  map: TilemapAsset
  tilesets: readonly AnyTilesetAsset[]
  onJump: (col: number, row: number) => void
  /** A área que rola do palco: com ela o minimapa mostra a parte que aparece na tela. */
  stageRef?: RefObject<HTMLElement | null>
  cellPx?: number
  pad?: number
  repaintDelayMs?: number
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null),
    count = map.cols * map.rows * map.layers.filter(isTileLayer).length
  const [view, setView] = useState<MinimapViewRect | null>(null)
  const helpId = useId()
  function currentView(): MinimapViewRect | null {
    const stage = stageRef?.current
    return stage ? minimapViewRect(stage, cellPx, pad, map.cols, map.rows) : null
  }
  function viewCenter(): { col: number; row: number; view: MinimapViewRect | null } {
    const current = currentView()
    return {
      col: ((current?.left ?? 0) + (current?.width ?? 1) / 2) * map.cols,
      row: ((current?.top ?? 0) + (current?.height ?? 1) / 2) * map.rows,
      view: current,
    }
  }
  const jump = (col: number, row: number): void =>
    onJump(Math.max(0, Math.min(map.cols - 1, col)), Math.max(0, Math.min(map.rows - 1, row)))
  // O mapa muda a cada movimento do lápis. O minimapa espera o traço sossegar: pinta na
  // primeira vez e depois só quando passa um instante sem mudança nenhuma.
  const painted = useRef(false)
  useEffect(() => {
    const paint = (): void => {
      painted.current = true
      if (ref.current)
        paintMinimap(ref.current, map.cols, map.rows, cachedMinimapColors(map, tilesets))
    }
    if (!painted.current) {
      paint()
      return
    }
    const timer = setTimeout(paint, repaintDelayMs)
    return () => clearTimeout(timer)
  }, [map, tilesets, repaintDelayMs])

  useEffect(() => {
    const stage = stageRef?.current
    if (!stage) return
    const update = (): void => {
      const next = minimapViewRect(stage, cellPx, pad, map.cols, map.rows)
      setView((old) =>
        old?.left === next?.left &&
        old?.top === next?.top &&
        old?.width === next?.width &&
        old?.height === next?.height
          ? old
          : next,
      )
    }
    update()
    stage.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(stage)
    return () => {
      stage.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [stageRef, cellPx, pad, map.cols, map.rows])

  return (
    <Panel title={COPY.scene.oMapaInteiro}>
      <button
        type="button"
        aria-label={COPY.scene.navegarPeloMinimapa}
        title={COPY.scene.minimapKeyboardHelp}
        aria-describedby={helpId}
        className="pin-checkerboard relative block min-h-11 w-full overflow-hidden rounded-xl border-2 border-pin-border"
        onKeyDown={(e) => {
          if (e.altKey || e.metaKey || e.ctrlKey) return
          const center = viewCenter()
          const stepX = Math.max(1, ((center.view?.width ?? 1) * map.cols) / 2)
          const stepY = Math.max(1, ((center.view?.height ?? 1) * map.rows) / 2)
          let col = center.col,
            row = center.row
          switch (e.key) {
            case 'ArrowLeft':
              col -= stepX
              break
            case 'ArrowRight':
              col += stepX
              break
            case 'ArrowUp':
              row -= stepY
              break
            case 'ArrowDown':
              row += stepY
              break
            case 'PageUp':
              row -= stepY * 2
              break
            case 'PageDown':
              row += stepY * 2
              break
            case 'Home':
              col = row = 0
              break
            case 'End':
              col = map.cols - 1
              row = map.rows - 1
              break
            default:
              return
          }
          e.preventDefault()
          e.stopPropagation()
          jump(col, row)
        }}
        onClick={(e) => {
          if (e.detail === 0 && e.clientX === 0 && e.clientY === 0) {
            const center = viewCenter()
            jump(center.col, center.row)
            return
          }
          const r = e.currentTarget.getBoundingClientRect()
          if (r.width <= 0 || r.height <= 0) return
          onJump(
            ((e.clientX - r.left) / r.width) * map.cols,
            ((e.clientY - r.top) / r.height) * map.rows,
          )
        }}
      >
        <canvas ref={ref} className="pin-pixelated block max-h-36 w-full" />
        {view ? (
          <span
            data-pin-minimap-view=""
            title={COPY.scene.areaVisivelNoMinimapa}
            className="pointer-events-none absolute border-2 border-pin-accent bg-pin-accent/15"
            style={{
              left: `${view.left * 100}%`,
              top: `${view.top * 100}%`,
              width: `${view.width * 100}%`,
              height: `${view.height * 100}%`,
            }}
          />
        ) : null}
      </button>
      <span id={helpId} className="sr-only">
        {COPY.scene.minimapKeyboardHelp}
      </span>
      <p className="mt-2 text-xs text-pin-muted">
        {COPY.scene.dimensions(map.cols, map.rows, map.layers.length)}
        <br />
        {COPY.scene.budget(count, PINTA_MAP_FORMAT_LIMITS.maxCells)}
      </p>
    </Panel>
  )
}
