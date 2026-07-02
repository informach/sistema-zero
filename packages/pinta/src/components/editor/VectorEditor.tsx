/**
 * Editor VETORIAL (corte v1, referência: editor do Scratch) — shapes como
 * elementos SVG REAIS (hit-testing do browser de graça): pincel suavizado,
 * retângulo/elipse/linha/polígono/estrela/texto, fill+stroke+opacidade,
 * seleção com mover/redimensionar (8 alças)/girar, ordem e duplicar.
 *
 * Gestos: mover/redimensionar/girar pintam via `replace` e fecham com
 * `commitGesture` (1 entrada de undo por gesto); criar forma commita no up.
 */
import type { JSX, PointerEvent } from 'react'
import { useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { newId } from '../../core/id'
import type { PintaAsset } from '../../core/project'
import { PINTA_LIMITS } from '../../core/project'
import {
  type Bounds,
  boundsCenter,
  rotateShapeTo,
  scaleShape,
  shapeBounds,
  translateShape,
} from '../../vector/geometry'
import type { Vec2, VectorShape } from '../../vector/model'
import {
  DEFAULT_STYLE,
  makeEllipse,
  makeLine,
  makePath,
  makePolygon,
  makeRect,
  makeStar,
  makeText,
  type ShapeStyle,
} from '../../vector/shapes'
import { smoothStrokeToPath } from '../../vector/smoothing'
import { shapeCommonAttrs, shapeGeometryAttrs } from '../../vector/svg'
import { Button, IconButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores } from './editorContext'

type VectorTool = 'select' | 'brush' | 'rect' | 'ellipse' | 'line' | 'polygon' | 'star' | 'text'

const TOOLS: Array<{ id: VectorTool; emoji: string; label: string }> = [
  { id: 'select', emoji: '👆', label: COPY.vector.select },
  { id: 'brush', emoji: '🖌️', label: COPY.vector.brush },
  { id: 'rect', emoji: '⬜', label: COPY.tools.rect },
  { id: 'ellipse', emoji: '⚪', label: COPY.tools.ellipse },
  { id: 'line', emoji: '📏', label: COPY.tools.line },
  { id: 'polygon', emoji: '🔷', label: COPY.vector.polygon },
  { id: 'star', emoji: '⭐', label: COPY.vector.star },
  { id: 'text', emoji: '🔤', label: COPY.vector.text },
]

/** Cores livres do vetorial (os hex da paleta Arcade, sem o slot transparente). */
const SWATCHES = [
  '#ffffff',
  '#ff2121',
  '#ff93c4',
  '#ff8135',
  '#fff609',
  '#249ca3',
  '#78dc52',
  '#003fad',
  '#87f2ff',
  '#8e2ec4',
  '#a4839f',
  '#5c406c',
  '#e5cdc4',
  '#91463d',
  '#000000',
] as const

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8] as const

type Gesture =
  | { kind: 'draw'; start: Vec2; points: Vec2[] }
  | { kind: 'move'; last: Vec2; base: PintaAsset }
  | {
      kind: 'resize'
      handle: string
      anchor: Vec2
      start: Vec2
      base: PintaAsset
      baseShape: VectorShape
    }
  | { kind: 'rotate'; center: Vec2; startAngle: number; baseRotation: number; base: PintaAsset }

/** Um shape do modelo → elemento SVG de React (mesmos atributos do export). */
function ShapeElement({
  shape,
  onPointerDown,
}: {
  shape: VectorShape
  onPointerDown?: (event: PointerEvent<SVGElement>) => void
}): JSX.Element {
  const { tag, attrs, content } = shapeGeometryAttrs(shape)
  const common = shapeCommonAttrs(shape)
  const props: Record<string, unknown> = { ...attrs, ...common, onPointerDown }
  // React usa camelCase p/ estes atributos.
  if ('stroke-width' in props) {
    props.strokeWidth = props['stroke-width']
    delete props['stroke-width']
  }
  if ('stroke-linecap' in props) {
    props.strokeLinecap = props['stroke-linecap']
    delete props['stroke-linecap']
  }
  if ('stroke-linejoin' in props) {
    props.strokeLinejoin = props['stroke-linejoin']
    delete props['stroke-linejoin']
  }
  if ('font-size' in props) {
    props.fontSize = props['font-size']
    delete props['font-size']
  }
  if ('font-family' in props) {
    props.fontFamily = props['font-family']
    delete props['font-family']
  }
  const Tag = tag as 'rect'
  return <Tag {...(props as JSX.IntrinsicElements['rect'])}>{content}</Tag>
}

const HANDLES: Array<{ id: string; fx: number; fy: number }> = [
  { id: 'nw', fx: 0, fy: 0 },
  { id: 'n', fx: 0.5, fy: 0 },
  { id: 'ne', fx: 1, fy: 0 },
  { id: 'e', fx: 1, fy: 0.5 },
  { id: 'se', fx: 1, fy: 1 },
  { id: 's', fx: 0.5, fy: 1 },
  { id: 'sw', fx: 0, fy: 1 },
  { id: 'w', fx: 0, fy: 0.5 },
]

export function VectorEditor(): JSX.Element | null {
  const { editor } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const [tool, setTool] = useState<VectorTool>('brush')
  const [style, setStyle] = useState<ShapeStyle>(DEFAULT_STYLE)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [preview, setPreview] = useState<VectorShape | null>(null)
  const [textAt, setTextAt] = useState<Vec2 | null>(null)
  const [textValue, setTextValue] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<Gesture | null>(null)

  if (asset.kind !== 'vector') return null
  const vector = asset
  const selected = vector.shapes.filter((s) => selectedIds.includes(s.id))
  const single = selected.length === 1 ? selected[0] : null

  function svgPoint(event: PointerEvent<Element>): Vec2 {
    const svg = svgRef.current
    const rect = svg?.getBoundingClientRect()
    if (!svg || !rect) return { x: 0, y: 0 }
    return {
      x: ((event.clientX - rect.left) / rect.width) * vector.width,
      y: ((event.clientY - rect.top) / rect.height) * vector.height,
    }
  }

  function commitShapes(next: VectorShape[], recordUndo = true): void {
    const state = editor.getState()
    if (state.asset.kind !== 'vector') return
    const updated = { ...state.asset, shapes: next }
    if (recordUndo) state.commit(updated)
    else state.replace(updated)
  }

  function drawPreview(start: Vec2, current: Vec2, points: Vec2[]): VectorShape | null {
    switch (tool) {
      case 'brush':
        return makePath(smoothStrokeToPath(points, 1.2), style)
      case 'rect':
        return makeRect(start, current, style)
      case 'ellipse':
        return makeEllipse(start, current, style)
      case 'line':
        return makeLine(start, current, style)
      case 'polygon':
        return makePolygon(start, current, 6, style)
      case 'star':
        return makeStar(start, current, 5, style)
      default:
        return null
    }
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>): void {
    if (!event.isPrimary) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const at = svgPoint(event)
    if (tool === 'text') {
      setTextAt(at)
      setTextValue('')
      return
    }
    if (tool === 'select') {
      // Clique no fundo: limpa a seleção.
      setSelectedIds([])
      return
    }
    if (vector.shapes.length >= PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    gestureRef.current = { kind: 'draw', start: at, points: [at] }
    setPreview(drawPreview(at, at, [at]))
  }

  function handleShapePointerDown(shape: VectorShape, event: PointerEvent<SVGElement>): void {
    if (tool !== 'select' || !event.isPrimary) return
    event.stopPropagation()
    svgRef.current?.setPointerCapture?.(event.pointerId)
    const at = svgPoint(event)
    const ids = event.shiftKey
      ? selectedIds.includes(shape.id)
        ? selectedIds
        : [...selectedIds, shape.id]
      : selectedIds.includes(shape.id)
        ? selectedIds
        : [shape.id]
    setSelectedIds(ids)
    gestureRef.current = { kind: 'move', last: at, base: editor.getState().asset }
  }

  function handleResizeDown(
    handle: { id: string; fx: number; fy: number },
    bounds: Bounds,
    event: PointerEvent<SVGElement>,
  ): void {
    if (!single || !event.isPrimary) return
    event.stopPropagation()
    svgRef.current?.setPointerCapture?.(event.pointerId)
    const anchor = {
      x: bounds.x + (1 - handle.fx) * bounds.width,
      y: bounds.y + (1 - handle.fy) * bounds.height,
    }
    gestureRef.current = {
      kind: 'resize',
      handle: handle.id,
      anchor,
      start: svgPoint(event),
      base: editor.getState().asset,
      baseShape: single,
    }
  }

  function handleRotateDown(bounds: Bounds, event: PointerEvent<SVGElement>): void {
    if (!single || !event.isPrimary) return
    event.stopPropagation()
    svgRef.current?.setPointerCapture?.(event.pointerId)
    const center = boundsCenter(bounds)
    const at = svgPoint(event)
    gestureRef.current = {
      kind: 'rotate',
      center,
      startAngle: Math.atan2(at.y - center.y, at.x - center.x),
      baseRotation: single.rotation,
      base: editor.getState().asset,
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current
    if (!gesture) return
    const at = svgPoint(event)

    if (gesture.kind === 'draw') {
      gesture.points.push(at)
      setPreview(drawPreview(gesture.start, at, gesture.points))
      return
    }
    if (gesture.kind === 'move') {
      const dx = at.x - gesture.last.x
      const dy = at.y - gesture.last.y
      gesture.last = at
      const state = editor.getState()
      if (state.asset.kind !== 'vector') return
      commitShapes(
        state.asset.shapes.map((s) => (selectedIds.includes(s.id) ? translateShape(s, dx, dy) : s)),
        false,
      )
      return
    }
    if (gesture.kind === 'resize') {
      const { anchor, start, baseShape, handle } = gesture
      const isCorner = handle.length === 2
      const horizontal = handle === 'e' || handle === 'w'
      const denomX = start.x - anchor.x
      const denomY = start.y - anchor.y
      const fx = isCorner || horizontal ? (denomX === 0 ? 1 : (at.x - anchor.x) / denomX) : 1
      const fy = isCorner || !horizontal ? (denomY === 0 ? 1 : (at.y - anchor.y) / denomY) : 1
      const resized = scaleShape(baseShape, anchor, fx, fy)
      const state = editor.getState()
      if (state.asset.kind !== 'vector') return
      commitShapes(
        state.asset.shapes.map((s) => (s.id === baseShape.id ? resized : s)),
        false,
      )
      return
    }
    if (gesture.kind === 'rotate') {
      const angle = Math.atan2(at.y - gesture.center.y, at.x - gesture.center.x)
      const degrees = gesture.baseRotation + ((angle - gesture.startAngle) * 180) / Math.PI
      const state = editor.getState()
      if (state.asset.kind !== 'vector' || !single) return
      commitShapes(
        state.asset.shapes.map((s) => (s.id === single.id ? rotateShapeTo(s, degrees) : s)),
        false,
      )
    }
  }

  function endGesture(): void {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture) return
    if (gesture.kind === 'draw') {
      const shape = preview
      setPreview(null)
      if (!shape) return
      const bounds = shapeBounds(shape)
      // Toque sem arrasto em ferramenta de forma: nada a criar (pincel pode).
      if (shape.type !== 'path' && bounds.width < 2 && bounds.height < 2) return
      commitShapes([...vector.shapes, shape])
      setSelectedIds([shape.id])
      setTool('select')
      return
    }
    // move/resize/rotate: fecha o gesto com 1 entrada de undo.
    editor.getState().commitGesture(gesture.base)
  }

  function updateSelected(update: (shape: VectorShape) => VectorShape): void {
    if (selected.length === 0) return
    const state = editor.getState()
    if (state.asset.kind !== 'vector') return
    commitShapes(state.asset.shapes.map((s) => (selectedIds.includes(s.id) ? update(s) : s)))
  }

  function applyStyle(partial: Partial<ShapeStyle>): void {
    setStyle((current) => ({ ...current, ...partial }))
    if (selected.length > 0) {
      updateSelected((shape) => ({
        ...shape,
        ...(partial.fill !== undefined && shape.type !== 'line' ? { fill: partial.fill } : {}),
        ...(partial.stroke !== undefined ? { stroke: partial.stroke } : {}),
        ...(partial.opacity !== undefined ? { opacity: partial.opacity } : {}),
      }))
    }
  }

  function moveOrder(delta: 1 | -1): void {
    if (!single) return
    const index = vector.shapes.findIndex((s) => s.id === single.id)
    const target = index + delta
    if (index === -1 || target < 0 || target >= vector.shapes.length) return
    const shapes = [...vector.shapes]
    const [moved] = shapes.splice(index, 1)
    if (!moved) return
    shapes.splice(target, 0, moved)
    commitShapes(shapes)
  }

  function duplicateSelected(): void {
    if (selected.length === 0) return
    if (vector.shapes.length + selected.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    const copies = selected.map((s) => ({ ...translateShape(s, 12, 12), id: newId() }))
    commitShapes([...vector.shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }

  function removeSelected(): void {
    if (selected.length === 0) return
    commitShapes(vector.shapes.filter((s) => !selectedIds.includes(s.id)))
    setSelectedIds([])
  }

  const singleBounds = single ? shapeBounds(single) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
      <div className="flex min-h-0 flex-1 items-stretch gap-3">
        {/* Ferramentas */}
        <div className="flex flex-col items-center gap-1 overflow-y-auto rounded-3xl border-2 border-pin-border bg-pin-surface p-2">
          {TOOLS.map((entry) => (
            <IconButton
              key={entry.id}
              active={tool === entry.id}
              aria-label={entry.label}
              aria-pressed={tool === entry.id}
              title={entry.label}
              onClick={() => setTool(entry.id)}
            >
              <span aria-hidden="true">{entry.emoji}</span>
            </IconButton>
          ))}
        </div>

        {/* O palco SVG */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2">
          <div className="pin-checkerboard max-h-full max-w-full rounded-lg border-2 border-pin-border shadow-inner">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${vector.width} ${vector.height}`}
              className="block max-h-[70vh] max-w-full bg-white/60"
              style={{ aspectRatio: `${vector.width} / ${vector.height}`, touchAction: 'none' }}
              role="img"
              aria-label="Área de desenho livre"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
            >
              {vector.shapes.map((shape) => (
                <ShapeElement
                  key={shape.id}
                  shape={shape}
                  onPointerDown={(event) => handleShapePointerDown(shape, event)}
                />
              ))}
              {preview ? <ShapeElement shape={preview} /> : null}

              {/* Moldura + alças da seleção única */}
              {single && singleBounds ? (
                <g
                  transform={
                    single.rotation !== 0
                      ? `rotate(${single.rotation} ${boundsCenter(singleBounds).x} ${boundsCenter(singleBounds).y})`
                      : undefined
                  }
                >
                  <rect
                    x={singleBounds.x}
                    y={singleBounds.y}
                    width={singleBounds.width}
                    height={singleBounds.height}
                    fill="none"
                    stroke="#00a0c8"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    pointerEvents="none"
                  />
                  {HANDLES.map((handle) => (
                    <rect
                      key={handle.id}
                      x={singleBounds.x + handle.fx * singleBounds.width - 4}
                      y={singleBounds.y + handle.fy * singleBounds.height - 4}
                      width={8}
                      height={8}
                      fill="#ffffff"
                      stroke="#00a0c8"
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(event) => handleResizeDown(handle, singleBounds, event)}
                    />
                  ))}
                  {/* Alça de girar (acima do topo-centro) */}
                  <circle
                    cx={singleBounds.x + singleBounds.width / 2}
                    cy={singleBounds.y - 16}
                    r={6}
                    fill="#ffffff"
                    stroke="#00a0c8"
                    strokeWidth={1.5}
                    style={{ cursor: 'grab' }}
                    aria-label={COPY.vector.rotate}
                    onPointerDown={(event) => handleRotateDown(singleBounds, event)}
                  />
                </g>
              ) : null}
              {/* Moldura fina nas seleções múltiplas */}
              {selected.length > 1
                ? selected.map((shape) => {
                    const b = shapeBounds(shape)
                    return (
                      <rect
                        key={`sel-${shape.id}`}
                        x={b.x}
                        y={b.y}
                        width={b.width}
                        height={b.height}
                        fill="none"
                        stroke="#00a0c8"
                        strokeDasharray="4 3"
                        strokeWidth={1}
                        pointerEvents="none"
                      />
                    )
                  })
                : null}
            </svg>
          </div>
        </div>

        {/* Propriedades */}
        <div className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto">
          <section className="rounded-3xl border-2 border-pin-border bg-pin-surface p-3">
            <span className="mb-1 block text-sm font-bold text-pin-muted">{COPY.vector.fill}</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                aria-label={`${COPY.vector.fill}: ${COPY.vector.none}`}
                aria-pressed={style.fill === 'none'}
                title={COPY.vector.none}
                onClick={() => applyStyle({ fill: 'none' })}
                className={`pin-checkerboard h-8 w-8 rounded-lg border-2 ${style.fill === 'none' ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
              />
              {SWATCHES.map((hex) => (
                <button
                  key={`fill-${hex}`}
                  type="button"
                  aria-label={`${COPY.vector.fill}: ${hex}`}
                  aria-pressed={style.fill === hex}
                  title={hex}
                  onClick={() => applyStyle({ fill: hex })}
                  className={`h-8 w-8 rounded-lg border-2 ${style.fill === hex ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <span className="mt-3 mb-1 block text-sm font-bold text-pin-muted">
              {COPY.vector.stroke}
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                aria-label={`${COPY.vector.stroke}: ${COPY.vector.none}`}
                aria-pressed={style.stroke === null}
                title={COPY.vector.none}
                onClick={() => applyStyle({ stroke: null })}
                className={`pin-checkerboard h-8 w-8 rounded-lg border-2 ${style.stroke === null ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
              />
              {SWATCHES.map((hex) => (
                <button
                  key={`stroke-${hex}`}
                  type="button"
                  aria-label={`${COPY.vector.stroke}: ${hex}`}
                  aria-pressed={style.stroke?.color === hex}
                  title={hex}
                  onClick={() =>
                    applyStyle({ stroke: { color: hex, width: style.stroke?.width ?? 2 } })
                  }
                  className={`h-8 w-8 rounded-lg border-2 ${style.stroke?.color === hex ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <label className="mt-3 block text-sm font-bold text-pin-muted">
              {COPY.vector.strokeWidth}
              <input
                type="range"
                min={0}
                max={STROKE_WIDTHS.length - 1}
                step={1}
                value={Math.max(
                  STROKE_WIDTHS.findIndex((w) => w >= (style.stroke?.width ?? 2)),
                  0,
                )}
                disabled={style.stroke === null}
                onChange={(event) => {
                  const width = STROKE_WIDTHS[Number(event.target.value)] ?? 2
                  applyStyle({
                    stroke: { color: style.stroke?.color ?? '#000000', width },
                  })
                }}
                className="mt-1 w-full accent-pin-accent"
              />
            </label>

            <label className="mt-2 block text-sm font-bold text-pin-muted">
              {COPY.vector.opacity}
              <input
                type="range"
                min={25}
                max={100}
                step={5}
                value={Math.round(style.opacity * 100)}
                onChange={(event) => applyStyle({ opacity: Number(event.target.value) / 100 })}
                className="mt-1 w-full accent-pin-accent"
              />
            </label>
          </section>

          {selected.length > 0 ? (
            <section className="flex flex-col gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-3">
              <div className="flex justify-center gap-1">
                <IconButton
                  aria-label={COPY.vector.forward}
                  title={COPY.vector.forward}
                  disabled={!single}
                  onClick={() => moveOrder(1)}
                >
                  <span aria-hidden="true">⏫</span>
                </IconButton>
                <IconButton
                  aria-label={COPY.vector.backward}
                  title={COPY.vector.backward}
                  disabled={!single}
                  onClick={() => moveOrder(-1)}
                >
                  <span aria-hidden="true">⏬</span>
                </IconButton>
                <IconButton
                  aria-label={COPY.vector.duplicate}
                  title={COPY.vector.duplicate}
                  onClick={duplicateSelected}
                >
                  <span aria-hidden="true">🧬</span>
                </IconButton>
                <IconButton
                  aria-label={COPY.vector.remove}
                  title={COPY.vector.remove}
                  onClick={removeSelected}
                >
                  <span aria-hidden="true">🗑️</span>
                </IconButton>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {/* Texto novo */}
      <Dialog open={textAt !== null} onClose={() => setTextAt(null)} title={COPY.vector.textPrompt}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!textAt || !textValue.trim()) return
            if (vector.shapes.length >= PINTA_LIMITS.maxShapes) {
              showToast(COPY.vector.shapeLimit)
              setTextAt(null)
              return
            }
            const shape = makeText(textAt, textValue.trim().slice(0, 200), style)
            commitShapes([...vector.shapes, shape])
            setSelectedIds([shape.id])
            setTool('select')
            setTextAt(null)
          }}
        >
          <input
            autoFocus
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder={COPY.vector.textPlaceholder}
            aria-label={COPY.vector.textPrompt}
            className="min-h-11 rounded-2xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTextAt(null)}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={!textValue.trim()}>
              {COPY.vector.add}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
