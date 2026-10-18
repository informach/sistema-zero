import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { SCENE_PAINT_COPY as copy } from '../../../core/scenePaintCopy'
import type { BrushSize, Texel } from '../../../paint/skinPaint'
import { compositeSceneImageRegion, type SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import {
  type ScenePaintFaceView,
  sceneFaceViewSize,
  sceneFaceViewTexel,
} from '../../../scene/paintFaceView'
import { Button } from '../../ui/Button'
import { Minus, Plus } from '../../ui/icons'
import { SCENE_CLOSE_UP_REGION, type ScenePaintActions } from './useScenePaint'

/** An integer-scaled pixel canvas beside the live 3D model; both share one paint transaction. */
export function ScenePaintCloseUp({
  image,
  palette,
  base,
  view,
  drawing,
  actions,
  brush,
  onClose,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  view: ScenePaintFaceView
  drawing: boolean
  actions: ScenePaintActions
  brush: BrushSize
  onClose(): void
}) {
  const { region } = view
  const { width, height } = sceneFaceViewSize(view)
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef<HTMLButtonElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const pointer = useRef<number | null>(null)
  const live = useRef(actions)
  live.current = actions
  const hintId = useId()
  const [fit, setFit] = useState(1)
  const [zoom, setZoom] = useState<number | null>(null)
  const [grid, setGrid] = useState(true)
  const [cursor, setCursor] = useState<{ column: number; row: number } | null>(null)
  const scale = zoom ?? fit
  const reversedColumn = view.transpose ? view.flipY : view.flipX
  const reversedRow = view.transpose ? view.flipX : view.flipY
  useLayoutEffect(() => {
    const element = scroll.current
    if (!element) return
    const measure = () =>
      setFit(
        Math.max(
          1,
          Math.min(
            64,
            Math.floor(
              Math.min((element.clientWidth - 24) / width, (element.clientHeight - 24) / height),
            ),
          ),
        ),
      )
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [width, height])
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const pixels = compositeSceneImageRegion(image, palette, base, region)
    const stride = region.x1 - region.x0 + 1
    const data = context.createImageData(width, height)
    for (let row = 0; row < height; row++)
      for (let column = 0; column < width; column++) {
        const [x, y] = sceneFaceViewTexel(view, column, row)
        const from = ((y - region.y0) * stride + x - region.x0) * 4
        data.data.set(pixels.subarray(from, from + 4), (row * width + column) * 4)
      }
    context.putImageData(data, 0, 0)
  }, [image, palette, base, view, region, width, height])
  function finish(commit: boolean) {
    const id = pointer.current
    pointer.current = null
    if (id === null) return
    if (input.current?.hasPointerCapture?.(id)) input.current.releasePointerCapture(id)
    live.current.end(commit)
  }
  useEffect(() => {
    if (!drawing && pointer.current !== null) {
      pointer.current = null
      live.current.end(false)
    }
  }, [drawing])
  useEffect(() => {
    const cancel = () => {
      if (pointer.current !== null) {
        pointer.current = null
        live.current.end(false)
      }
    }
    window.addEventListener('blur', cancel)
    return () => {
      window.removeEventListener('blur', cancel)
      cancel()
    }
  }, [])
  useLayoutEffect(() => {
    const section = root.current
    heading.current?.focus({ preventScroll: true })
    return () => {
      const active = document.activeElement
      if (active && active !== document.body && !section?.contains(active)) return
      section
        ?.closest('[data-molda-theme]')
        ?.querySelector<HTMLElement>('[data-paint-tool="paint.closeup"]')
        ?.focus({ preventScroll: true })
    }
  }, [])
  function cell(clientX: number, clientY: number) {
    const box = canvas.current?.getBoundingClientRect()
    if (!box?.width || !box.height) return null
    const across = (clientX - box.left) / box.width
    const down = (clientY - box.top) / box.height
    if (across < 0 || down < 0 || across >= 1 || down >= 1) return null
    return { column: Math.floor(across * width), row: Math.floor(down * height) }
  }
  const sample = (point: Texel) => ({ point, region: SCENE_CLOSE_UP_REGION, bounds: region })
  const at = (position: { column: number; row: number }) =>
    sample(sceneFaceViewTexel(view, position.column, position.row))
  return (
    <section ref={root} aria-label={copy.closeUp} className="mld-paint-detail">
      <div className="space-y-1">
        <h2 ref={heading} tabIndex={-1} className="mld-display text-lg outline-none">
          {copy.closeUp}
        </h2>
        <p id={hintId} className="text-xs text-mld-muted">
          {copy.pixelHint}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          className="px-2"
          aria-label={copy.zoomOut}
          disabled={scale <= 1 || drawing}
          onClick={() => setZoom(Math.max(1, Math.floor(scale / 2)))}
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>
        <span className="min-w-10 text-center text-xs tabular-nums" aria-live="polite">
          {scale}×
        </span>
        <Button
          className="px-2"
          aria-label={copy.zoomIn}
          disabled={scale >= 64 || drawing}
          onClick={() => setZoom(Math.min(64, scale * 2))}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
        <Button className="px-2 text-xs" disabled={drawing} onClick={() => setZoom(null)}>
          {copy.fitPixels}
        </Button>
        <label className="flex min-h-11 items-center gap-1 text-xs">
          <input
            type="checkbox"
            name="paint-closeup-grid"
            checked={grid}
            onChange={(event) => setGrid(event.target.checked)}
          />
          {copy.pixelGrid}
        </label>
      </div>
      <div
        ref={scroll}
        className="mld-checkerboard min-h-0 flex-1 overflow-auto rounded-lg border border-mld-border"
        onScroll={() => {
          // Focus can scroll the canvas before a keyboard stroke. Keep its selected pixel.
          if (document.activeElement !== input.current) setCursor(null)
        }}
      >
        <div
          className="grid min-h-full min-w-full place-items-center p-3"
          style={{ width: width * scale + 24, height: height * scale + 24 }}
        >
          <button
            ref={input}
            type="button"
            aria-label={copy.closeUpSheet}
            aria-describedby={hintId}
            className="relative block touch-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-mld-accent"
            style={{ width: width * scale, height: height * scale }}
            onFocus={() => setCursor((before) => before ?? { column: 0, row: 0 })}
            onBlur={() => {
              finish(false)
              setCursor(null)
            }}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.metaKey || event.altKey || drawing) return
              const steps: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              }
              const step = steps[event.key]
              if (step) {
                event.preventDefault()
                setCursor((before) => ({
                  column: Math.max(0, Math.min(width - 1, (before?.column ?? 0) + step[0])),
                  row: Math.max(0, Math.min(height - 1, (before?.row ?? 0) + step[1])),
                }))
              } else if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                event.preventDefault()
                if (actions.begin(at(cursor ?? { column: 0, row: 0 }))) actions.end(true)
              }
            }}
            onPointerDown={(event) => {
              if (pointer.current !== null || event.button !== 0) return
              const point = cell(event.clientX, event.clientY)
              if (!point) return
              event.preventDefault()
              event.currentTarget.focus({ preventScroll: true })
              setCursor(point)
              if (!actions.begin(at(point))) return
              pointer.current = event.pointerId
              try {
                event.currentTarget.setPointerCapture(event.pointerId)
              } catch {
                finish(false)
              }
            }}
            onPointerMove={(event) => {
              const point = cell(event.clientX, event.clientY)
              setCursor(point)
              if (pointer.current === event.pointerId) actions.move(point ? at(point) : null)
            }}
            onPointerLeave={() => setCursor(null)}
            onPointerUp={(event) => {
              if (pointer.current !== event.pointerId) return
              const point = cell(event.clientX, event.clientY)
              if (point) actions.move(at(point))
              finish(true)
            }}
            onPointerCancel={(event) => {
              if (pointer.current === event.pointerId) finish(false)
            }}
            onLostPointerCapture={(event) => {
              if (pointer.current === event.pointerId) finish(false)
            }}
          >
            <canvas
              ref={canvas}
              width={width}
              height={height}
              className="mld-pixelated block size-full"
            />
            {grid && scale >= 6 && (
              <span
                aria-hidden="true"
                className="mld-paint-pixel-grid pointer-events-none absolute inset-0"
                style={{ backgroundSize: `${scale}px ${scale}px` }}
              />
            )}
            {cursor && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute border border-mld-text outline outline-mld-surface"
                style={{
                  left:
                    (cursor.column - (brush === 3 || (brush === 2 && reversedColumn) ? 1 : 0)) *
                    scale,
                  top: (cursor.row - (brush === 3 || (brush === 2 && reversedRow) ? 1 : 0)) * scale,
                  width: brush * scale,
                  height: brush * scale,
                }}
              />
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-mld-muted">
        {width} × {height} px · {copy.pixelKeyboard}
      </p>
      <Button className="text-sm" onClick={onClose}>
        {copy.closeUpBack}
      </Button>
    </section>
  )
}
