/**
 * Editor VETORIAL (referência: editor do Scratch) — shapes como elementos SVG
 * REAIS (hit-testing do browser de graça): pincel suavizado, retângulo/elipse/
 * linha/polígono/estrela/texto, fill+stroke+opacidade, seleção com mover/
 * redimensionar (8 alças)/girar, ordem e duplicar.
 *
 * Serve os TRÊS kinds vetoriais editando o "documento de shapes ativo"
 * (`activeShapesOf`/`withActiveShapes`): o cenário inteiro, o quadro da
 * animação selecionada (vector-sprite) ou o tile selecionado (vector-tileset).
 *
 * Gestos: mover/redimensionar/girar pintam via `replace` e fecham com
 * `commitGesture` (1 entrada de undo por gesto); criar forma commita no up.
 *
 * O palco tem dimensão DEFINIDA (width/height = documento × zoom, como o
 * canvas do pixel) — sem isso o wrapper shrink-to-fit colapsa o SVG a zero e
 * "a área de desenho não aparece".
 */
import type { JSX, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  type ActiveFrameRef,
  activeShapesOf,
  previousShapesOf,
  withActiveShapes,
} from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { newId } from '../../core/id'
import { safeSetPointerCapture } from '../../core/pointer'
import { PINTA_LIMITS, type PintaAsset } from '../../core/project'
import {
  type Bounds,
  boundsCenter,
  flipShape,
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
import { smoothStrokeToPathCapped } from '../../vector/smoothing'
import { ShapeElement } from '../../vector/VectorFrameSvg'
import { Button, IconButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { ZoomControls } from './ZoomControls'

type VectorTool =
  | 'select'
  | 'pan'
  | 'brush'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'star'
  | 'text'

const TOOLS: Array<{ id: VectorTool; emoji: string; label: string }> = [
  { id: 'select', emoji: '👆', label: COPY.vector.select },
  { id: 'pan', emoji: '🖐️', label: COPY.vector.pan },
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

// Todo gesto guarda o pointerId: pointer capture é POR ponteiro, então um
// segundo dedo/palma no palco dispararia move/up do gesto do primeiro dedo.
type Gesture =
  | { kind: 'draw'; pointerId: number; start: Vec2; points: Vec2[] }
  | { kind: 'move'; pointerId: number; last: Vec2; base: PintaAsset }
  | {
      kind: 'resize'
      pointerId: number
      handle: string
      anchor: Vec2
      start: Vec2
      base: PintaAsset
      baseShape: VectorShape
    }
  | {
      kind: 'rotate'
      pointerId: number
      center: Vec2
      startAngle: number
      baseRotation: number
      base: PintaAsset
    }
  | { kind: 'pan'; pointerId: number; startClient: Vec2; startScroll: Vec2 }

/** Pontos do pincel mais próximos que isso (em unidades do documento) são descartados. */
const BRUSH_MIN_POINT_DISTANCE = 0.35

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
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const zoom = useSession((state) => state.zoom)
  const onion = useSession((state) => state.onion)
  const [tool, setTool] = useState<VectorTool>('brush')
  const [style, setStyle] = useState<ShapeStyle>(DEFAULT_STYLE)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [preview, setPreview] = useState<VectorShape | null>(null)
  const [textAt, setTextAt] = useState<Vec2 | null>(null)
  const [textValue, setTextValue] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture | null>(null)

  // Trocar de quadro/tile é trocar de documento: seleção e prévia não migram.
  // (Hook antes do return condicional — a ordem dos hooks não pode variar.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro/tile ativo), não leituras
  useEffect(() => {
    setSelectedIds([])
    setPreview(null)
    gestureRef.current = null
  }, [animationId, frameIndex])

  // Atalhos de teclado da seleção (Delete apaga; setas movem, Shift = 10) —
  // no window, sem exigir foco no palco; campos de texto são ignorados.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o handler lê o estado vivo via stores; só a seleção re-registra
  useEffect(() => {
    if (selectedIds.length === 0) return
    function onKeyDown(event: globalThis.KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const step = event.shiftKey ? 10 : 1
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          removeSelected()
          return
        case 'ArrowLeft':
          event.preventDefault()
          nudgeSelected(-step, 0)
          return
        case 'ArrowRight':
          event.preventDefault()
          nudgeSelected(step, 0)
          return
        case 'ArrowUp':
          event.preventDefault()
          nudgeSelected(0, -step)
          return
        case 'ArrowDown':
          event.preventDefault()
          nudgeSelected(0, step)
          return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIds])

  const ref: ActiveFrameRef = { animationId, frameIndex }
  const doc = activeShapesOf(asset, ref)
  if (!doc) return null

  const onionShapes = onion ? previousShapesOf(asset, ref) : null
  const selected = doc.shapes.filter((s) => selectedIds.includes(s.id))
  const single = selected.length === 1 ? selected[0] : null

  function currentRef(): ActiveFrameRef {
    const s = session.getState()
    return { animationId: s.animationId, frameIndex: s.frameIndex }
  }

  /** Shapes ATUAIS do documento ativo (sempre do estado vivo, não do render). */
  function currentShapes(): VectorShape[] {
    const state = editor.getState()
    return activeShapesOf(state.asset, currentRef())?.shapes ?? []
  }

  function svgPoint(event: PointerEvent<Element>): Vec2 {
    const svg = svgRef.current
    const rect = svg?.getBoundingClientRect()
    // Guarda anti-NaN: com o palco sem medida (happy-dom, layout ainda não
    // feito) devolve a origem em vez de dividir por zero.
    if (!svg || !rect || !doc || rect.width < 1 || rect.height < 1) return { x: 0, y: 0 }
    return {
      x: ((event.clientX - rect.left) / rect.width) * doc.width,
      y: ((event.clientY - rect.top) / rect.height) * doc.height,
    }
  }

  function commitShapes(next: VectorShape[], recordUndo = true): void {
    const state = editor.getState()
    const updated = withActiveShapes(state.asset, currentRef(), next)
    if (updated === state.asset) return
    if (recordUndo) state.commit(updated)
    else state.replace(updated)
  }

  function drawPreview(start: Vec2, current: Vec2, points: Vec2[]): VectorShape | null {
    switch (tool) {
      case 'brush':
        // Capped: garante que o `d` criado SEMPRE passa no sanitize do load.
        return makePath(smoothStrokeToPathCapped(points, 1.2), style)
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
    if (!event.isPrimary || gestureRef.current) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
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
    if (tool === 'pan') {
      const stage = stageRef.current
      if (!stage) return
      gestureRef.current = {
        kind: 'pan',
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        startScroll: { x: stage.scrollLeft, y: stage.scrollTop },
      }
      return
    }
    if (currentShapes().length >= PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    gestureRef.current = { kind: 'draw', pointerId: event.pointerId, start: at, points: [at] }
    setPreview(drawPreview(at, at, [at]))
  }

  function handleShapePointerDown(shape: VectorShape, event: PointerEvent<SVGElement>): void {
    if (tool !== 'select' || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    const at = svgPoint(event)
    const ids = event.shiftKey
      ? selectedIds.includes(shape.id)
        ? selectedIds
        : [...selectedIds, shape.id]
      : selectedIds.includes(shape.id)
        ? selectedIds
        : [shape.id]
    setSelectedIds(ids)
    gestureRef.current = {
      kind: 'move',
      pointerId: event.pointerId,
      last: at,
      base: editor.getState().asset,
    }
  }

  function handleResizeDown(
    handle: { id: string; fx: number; fy: number },
    bounds: Bounds,
    event: PointerEvent<SVGElement>,
  ): void {
    if (!single || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    const anchor = {
      x: bounds.x + (1 - handle.fx) * bounds.width,
      y: bounds.y + (1 - handle.fy) * bounds.height,
    }
    gestureRef.current = {
      kind: 'resize',
      pointerId: event.pointerId,
      handle: handle.id,
      anchor,
      start: svgPoint(event),
      base: editor.getState().asset,
      baseShape: single,
    }
  }

  function handleRotateDown(bounds: Bounds, event: PointerEvent<SVGElement>): void {
    if (!single || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    const center = boundsCenter(bounds)
    const at = svgPoint(event)
    gestureRef.current = {
      kind: 'rotate',
      pointerId: event.pointerId,
      center,
      startAngle: Math.atan2(at.y - center.y, at.x - center.x),
      baseRotation: single.rotation,
      base: editor.getState().asset,
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return

    if (gesture.kind === 'pan') {
      const stage = stageRef.current
      if (!stage) return
      stage.scrollLeft = gesture.startScroll.x - (event.clientX - gesture.startClient.x)
      stage.scrollTop = gesture.startScroll.y - (event.clientY - gesture.startClient.y)
      return
    }

    const at = svgPoint(event)

    if (gesture.kind === 'draw') {
      // Decimação: ponto quase em cima do anterior não acrescenta nada e
      // encareceria a re-suavização do traço a cada move.
      const last = gesture.points[gesture.points.length - 1]
      if (last && Math.hypot(at.x - last.x, at.y - last.y) < BRUSH_MIN_POINT_DISTANCE) return
      gesture.points.push(at)
      setPreview(drawPreview(gesture.start, at, gesture.points))
      return
    }
    if (gesture.kind === 'move') {
      const dx = at.x - gesture.last.x
      const dy = at.y - gesture.last.y
      gesture.last = at
      commitShapes(
        currentShapes().map((s) => (selectedIds.includes(s.id) ? translateShape(s, dx, dy) : s)),
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
      commitShapes(
        currentShapes().map((s) => (s.id === baseShape.id ? resized : s)),
        false,
      )
      return
    }
    if (gesture.kind === 'rotate') {
      const angle = Math.atan2(at.y - gesture.center.y, at.x - gesture.center.x)
      const degrees = gesture.baseRotation + ((angle - gesture.startAngle) * 180) / Math.PI
      if (!single) return
      commitShapes(
        currentShapes().map((s) => (s.id === single.id ? rotateShapeTo(s, degrees) : s)),
        false,
      )
    }
  }

  function endGesture(event?: PointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current
    if (!gesture) return
    if (event && event.pointerId !== gesture.pointerId) return
    gestureRef.current = null
    if (gesture.kind === 'pan') return
    if (gesture.kind === 'draw') {
      const shape = preview
      setPreview(null)
      if (!shape) return
      const bounds = shapeBounds(shape)
      // Toque sem arrasto em ferramenta de forma: nada a criar (pincel pode).
      if (shape.type !== 'path' && bounds.width < 2 && bounds.height < 2) return
      commitShapes([...currentShapes(), shape])
      // A ferramenta fica ATIVA (padrão Scratch): desenhar 3 estrelas seguidas
      // não exige reescolher; a forma criada fica selecionada para ajustes.
      setSelectedIds([shape.id])
      return
    }
    // move/resize/rotate: fecha o gesto com 1 entrada de undo.
    editor.getState().commitGesture(gesture.base)
  }

  function updateSelected(update: (shape: VectorShape) => VectorShape): void {
    if (selected.length === 0) return
    commitShapes(currentShapes().map((s) => (selectedIds.includes(s.id) ? update(s) : s)))
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
    const shapes = [...currentShapes()]
    const index = shapes.findIndex((s) => s.id === single.id)
    const target = index + delta
    if (index === -1 || target < 0 || target >= shapes.length) return
    const [moved] = shapes.splice(index, 1)
    if (!moved) return
    shapes.splice(target, 0, moved)
    commitShapes(shapes)
  }

  function duplicateSelected(): void {
    if (selected.length === 0) return
    const shapes = currentShapes()
    if (shapes.length + selected.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    const copies = selected.map((s) => ({ ...translateShape(s, 12, 12), id: newId() }))
    commitShapes([...shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }

  function removeSelected(): void {
    if (selected.length === 0) return
    commitShapes(currentShapes().filter((s) => !selectedIds.includes(s.id)))
    setSelectedIds([])
  }

  /** Espelha cada shape selecionado em torno do PRÓPRIO centro. */
  function flipSelected(axis: 'h' | 'v'): void {
    if (selected.length === 0) return
    commitShapes(
      currentShapes().map((s) =>
        selectedIds.includes(s.id) ? flipShape(s, axis, boundsCenter(shapeBounds(s))) : s,
      ),
    )
  }

  /** Move a seleção com as setas (Shift = passos de 10). */
  function nudgeSelected(dx: number, dy: number): void {
    if (selectedIds.length === 0) return
    commitShapes(
      currentShapes().map((s) => (selectedIds.includes(s.id) ? translateShape(s, dx, dy) : s)),
    )
  }

  /** Zoom que encaixa o documento inteiro no palco visível. */
  function zoomToFit(): void {
    const stage = stageRef.current
    if (!stage || !doc) return
    const availWidth = stage.clientWidth - 24
    const availHeight = stage.clientHeight - 24
    if (availWidth < 1 || availHeight < 1) return
    session.getState().setZoom(Math.min(availWidth / doc.width, availHeight / doc.height))
  }

  const singleBounds = single ? shapeBounds(single) : null
  const stageWidth = Math.max(Math.round(doc.width * zoom), 1)
  const stageHeight = Math.max(Math.round(doc.height * zoom), 1)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
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

        {/* O palco SVG: dimensão DEFINIDA (doc × zoom), centraliza quando menor
            que a área e rola quando maior. */}
        <div ref={stageRef} className="flex min-h-0 min-w-0 flex-1 overflow-auto p-2">
          <div className="pin-checkerboard m-auto rounded-lg border-2 border-pin-border shadow-inner">
            <svg
              ref={svgRef}
              width={stageWidth}
              height={stageHeight}
              viewBox={`0 0 ${doc.width} ${doc.height}`}
              className="block bg-white/60"
              style={{ touchAction: 'none' }}
              role="img"
              aria-label="Área de desenho"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
            >
              {/* Onion skin: o quadro ANTERIOR, apagadinho e sem eventos. */}
              {onionShapes ? (
                <g opacity={0.3} pointerEvents="none">
                  {onionShapes.map((shape) => (
                    <ShapeElement key={`onion-${shape.id}`} shape={shape} />
                  ))}
                </g>
              ) : null}
              {doc.shapes.map((shape) => (
                <ShapeElement
                  key={shape.id}
                  shape={shape}
                  onPointerDown={(event) => handleShapePointerDown(shape, event)}
                />
              ))}
              {preview ? <ShapeElement shape={preview} /> : null}

              {/* Moldura + alças da seleção única. As medidas dividem pelo zoom
                  para manter um tamanho CONSTANTE na tela (alça pequena demais
                  em zoom baixo era impossível de tocar). */}
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
                    strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                    strokeWidth={1.5 / zoom}
                    pointerEvents="none"
                  />
                  {HANDLES.map((handle) => (
                    <rect
                      key={handle.id}
                      x={singleBounds.x + handle.fx * singleBounds.width - 7 / zoom}
                      y={singleBounds.y + handle.fy * singleBounds.height - 7 / zoom}
                      width={14 / zoom}
                      height={14 / zoom}
                      fill="#ffffff"
                      stroke="#00a0c8"
                      strokeWidth={1.5 / zoom}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(event) => handleResizeDown(handle, singleBounds, event)}
                    />
                  ))}
                  {/* Alça de girar (acima do topo-centro) */}
                  <circle
                    cx={singleBounds.x + singleBounds.width / 2}
                    cy={singleBounds.y - 22 / zoom}
                    r={8 / zoom}
                    fill="#ffffff"
                    stroke="#00a0c8"
                    strokeWidth={1.5 / zoom}
                    style={{ cursor: 'grab' }}
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
                        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                        strokeWidth={1 / zoom}
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
                className={`pin-checkerboard h-10 w-10 rounded-lg border-2 ${style.fill === 'none' ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
              />
              {SWATCHES.map((hex) => (
                <button
                  key={`fill-${hex}`}
                  type="button"
                  aria-label={`${COPY.vector.fill}: ${COPY.colorNames[hex] ?? hex}`}
                  aria-pressed={style.fill === hex}
                  title={COPY.colorNames[hex] ?? hex}
                  onClick={() => applyStyle({ fill: hex })}
                  className={`h-10 w-10 rounded-lg border-2 ${style.fill === hex ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
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
                className={`pin-checkerboard h-10 w-10 rounded-lg border-2 ${style.stroke === null ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
              />
              {SWATCHES.map((hex) => (
                <button
                  key={`stroke-${hex}`}
                  type="button"
                  aria-label={`${COPY.vector.stroke}: ${COPY.colorNames[hex] ?? hex}`}
                  aria-pressed={style.stroke?.color === hex}
                  title={COPY.colorNames[hex] ?? hex}
                  onClick={() =>
                    applyStyle({ stroke: { color: hex, width: style.stroke?.width ?? 2 } })
                  }
                  className={`h-10 w-10 rounded-lg border-2 ${style.stroke?.color === hex ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
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
              <div className="flex flex-wrap justify-center gap-1">
                <IconButton
                  aria-label={COPY.tools.flipH}
                  title={COPY.tools.flipH}
                  onClick={() => flipSelected('h')}
                >
                  <span aria-hidden="true">↔️</span>
                </IconButton>
                <IconButton
                  aria-label={COPY.tools.flipV}
                  title={COPY.tools.flipV}
                  onClick={() => flipSelected('v')}
                >
                  <span aria-hidden="true">↕️</span>
                </IconButton>
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

      {/* Zoom do palco */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <ZoomControls />
        <Button variant="ghost" onClick={zoomToFit}>
          {COPY.editor.zoomFit}
        </Button>
      </div>

      {/* Texto novo */}
      <Dialog open={textAt !== null} onClose={() => setTextAt(null)} title={COPY.vector.textPrompt}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!textAt || !textValue.trim()) return
            const shapes = currentShapes()
            if (shapes.length >= PINTA_LIMITS.maxShapes) {
              showToast(COPY.vector.shapeLimit)
              setTextAt(null)
              return
            }
            const shape = makeText(textAt, textValue.trim().slice(0, 200), style)
            commitShapes([...shapes, shape])
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
