/**
 * PALCO do editor vetorial: o `<svg>` com os shapes REAIS (hit-testing do
 * browser de graça), a máquina de gestos (desenhar/mover/redimensionar/girar/
 * reshape/pan) e o diálogo do texto.
 *
 * Gestos: mover/redimensionar/girar pintam via `replace` e fecham com
 * `commitGesture` (1 entrada de undo por gesto); criar forma commita no up.
 * Todo gesto guarda o `pointerId` (multi-touch não corrompe).
 *
 * O palco tem dimensão DEFINIDA (width/height = documento × zoom, como o
 * canvas do pixel) — sem isso o wrapper shrink-to-fit colapsa o SVG a zero e
 * "a área de desenho não aparece".
 */
import type { JSX, PointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { safeSetPointerCapture } from '../../../core/pointer'
import { PINTA_LIMITS, type PintaAsset } from '../../../core/project'
import {
  type Bounds,
  boundsCenter,
  boundsIntersect,
  boundsUnion,
  rotatePoint,
  rotateShapeTo,
  scaleShape,
  setShapeNode,
  shapeBounds,
  shapeNodes,
  translateShape,
} from '../../../vector/geometry'
import { gridSpacingFor, snapPoint, snapValue } from '../../../vector/grid'
import type { Vec2, VectorShape } from '../../../vector/model'
import {
  makeEllipse,
  makeLine,
  makePath,
  makePolygon,
  makeRect,
  makeStar,
  makeText,
} from '../../../vector/shapes'
import { smoothStrokeToPathCapped } from '../../../vector/smoothing'
import { GradientDefs, ShapeElement } from '../../../vector/VectorFrameSvg'
import { Button, ToolButton } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Copy, FlipHorizontal2, FlipVertical2, Group, Trash2, Ungroup } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { useEditorStores, useSession } from '../editorContext'
import { useWheelZoom } from '../useWheelZoom'
import { useVectorEditor } from './VectorEditorScope'
import { constrainPoint, expandToGroups } from './vectorTools'

// Todo gesto guarda o pointerId: pointer capture é POR ponteiro, então um
// segundo dedo/palma no palco dispararia move/up do gesto do primeiro dedo.
type Gesture =
  | { kind: 'draw'; pointerId: number; start: Vec2; points: Vec2[] }
  // Laço de seleção (arrasto no fundo com a ferramenta Selecionar).
  | { kind: 'marquee'; pointerId: number; start: Vec2; additive: boolean }
  // Mover guarda o PONTO inicial + os shapes da BASE: cada move aplica o delta
  // TOTAL (com snap opcional) sobre a base — sem deriva acumulada e com os
  // offsets internos da seleção preservados.
  | { kind: 'move'; pointerId: number; start: Vec2; base: PintaAsset; baseShapes: VectorShape[] }
  // Redimensionar vale para 1 OU várias formas: todas escalam em torno da
  // MESMA âncora (o canto oposto da caixa da seleção).
  | {
      kind: 'resize'
      pointerId: number
      handle: string
      anchor: Vec2
      start: Vec2
      base: PintaAsset
      baseShapes: VectorShape[]
    }
  | {
      kind: 'rotate'
      pointerId: number
      center: Vec2
      startAngle: number
      baseRotation: number
      base: PintaAsset
    }
  | {
      kind: 'reshape'
      pointerId: number
      shapeId: string
      nodeIndex: number
      center: Vec2
      rotation: number
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

/** Ponto dentro do retângulo (hit-test grosso do conta-gotas). */
function bboxContains(b: Bounds, p: Vec2): boolean {
  return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height
}

export function VectorStage(): JSX.Element {
  const { editor } = useEditorStores()
  const { showToast } = useToast()
  const {
    doc,
    onionShapes,
    tool,
    setTool,
    style,
    selectedIds,
    setSelectedIds,
    selected,
    single,
    polygonSides,
    starTips,
    svgRef,
    stageRef,
    currentShapes,
    commitShapes,
    rememberColor,
    adoptStyle,
    duplicateSelected,
    removeSelected,
    flipSelected,
    groupSelected,
    ungroupSelected,
  } = useVectorEditor()
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const zoom = useSession((state) => state.zoom)
  const showGrid = useSession((state) => state.showGrid)
  const [preview, setPreview] = useState<VectorShape | null>(null)
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const [textAt, setTextAt] = useState<Vec2 | null>(null)
  const [textValue, setTextValue] = useState('')
  const gestureRef = useRef<Gesture | null>(null)

  // Trocar de quadro/tile é trocar de documento: prévia e gesto não migram.
  // (A seleção é resetada pelo VectorEditorScope, dono dela.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro/tile ativo), não leituras
  useEffect(() => {
    setPreview(null)
    setMarquee(null)
    gestureRef.current = null
  }, [animationId, frameIndex])

  useWheelZoom(stageRef, svgRef)

  const gridSpacing = gridSpacingFor(doc.width, doc.height)

  /** Encaixa na grade quando ela está LIGADA (desenho de formas, mover, redimensionar). */
  function maybeSnap(point: Vec2): Vec2 {
    return showGrid ? snapPoint(point, gridSpacing) : point
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
        return makePolygon(start, current, polygonSides, style)
      case 'star':
        return makeStar(start, current, starTips, style)
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
      // Arrasto no fundo = LAÇO de seleção; um toque parado limpa (no solto).
      gestureRef.current = {
        kind: 'marquee',
        pointerId: event.pointerId,
        start: at,
        additive: event.shiftKey,
      }
      setMarquee({ x: at.x, y: at.y, width: 0, height: 0 })
      return
    }
    if (tool === 'reshape') {
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
    if (tool === 'picker') {
      // Conta-gotas: adota o estilo da forma mais AO TOPO sob o toque (bbox — o
      // clique de forma borbulha até aqui porque não é a ferramenta de seleção).
      // `adoptStyle` muda SÓ o estilo vigente (não re-estiliza a seleção).
      const hit = [...currentShapes()].reverse().find((s) => bboxContains(shapeBounds(s), at))
      if (hit) {
        adoptStyle({
          fill: hit.fill,
          stroke: hit.stroke ? { ...hit.stroke } : null,
          opacity: hit.opacity,
        })
        if (typeof hit.fill === 'string' && hit.fill !== 'none') rememberColor(hit.fill)
        if (hit.stroke) rememberColor(hit.stroke.color)
      }
      return
    }
    if (currentShapes().length >= PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    // Formas encaixam o PONTO INICIAL na grade; o pincel fica livre.
    const start = tool === 'brush' ? at : maybeSnap(at)
    gestureRef.current = { kind: 'draw', pointerId: event.pointerId, start, points: [at] }
    setPreview(drawPreview(start, start, [at]))
  }

  function handleShapePointerDown(shape: VectorShape, event: PointerEvent<SVGElement>): void {
    if ((tool !== 'select' && tool !== 'reshape') || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    // Reshape: só seleciona (single) — quem arrasta o corpo NÃO move; os nós é
    // que reshapeiam.
    if (tool === 'reshape') {
      setSelectedIds([shape.id])
      return
    }
    const at = svgPoint(event)
    // Clicar num shape agrupado seleciona o grupo inteiro (move junto).
    const clicked = expandToGroups(currentShapes(), [shape.id])
    const ids = event.shiftKey
      ? [...new Set([...selectedIds, ...clicked])]
      : selectedIds.includes(shape.id)
        ? selectedIds
        : clicked
    setSelectedIds(ids)
    gestureRef.current = {
      kind: 'move',
      pointerId: event.pointerId,
      start: at,
      base: editor.getState().asset,
      baseShapes: currentShapes(),
    }
  }

  function handleResizeDown(
    handle: { id: string; fx: number; fy: number },
    bounds: Bounds,
    event: PointerEvent<SVGElement>,
  ): void {
    if (selected.length === 0 || !event.isPrimary || gestureRef.current) return
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
      // 1 forma OU várias: todas escalam em torno da mesma âncora.
      baseShapes: selected,
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

  function handleReshapeDown(nodeIndex: number, event: PointerEvent<SVGElement>): void {
    if (!single || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    gestureRef.current = {
      kind: 'reshape',
      pointerId: event.pointerId,
      shapeId: single.id,
      nodeIndex,
      center: boundsCenter(shapeBounds(single)),
      rotation: single.rotation,
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

    if (gesture.kind === 'marquee') {
      setMarquee({
        x: Math.min(gesture.start.x, at.x),
        y: Math.min(gesture.start.y, at.y),
        width: Math.abs(at.x - gesture.start.x),
        height: Math.abs(at.y - gesture.start.y),
      })
      return
    }

    if (gesture.kind === 'draw') {
      // Decimação: ponto quase em cima do anterior não acrescenta nada e
      // encareceria a re-suavização do traço a cada move.
      const last = gesture.points[gesture.points.length - 1]
      if (last && Math.hypot(at.x - last.x, at.y - last.y) < BRUSH_MIN_POINT_DISTANCE) return
      gesture.points.push(at)
      // Grade PRIMEIRO, Shift depois: o quadrado travado fica com lado em
      // múltiplos da grade. Nada disso vale pro pincel (traço livre).
      const target = tool === 'brush' ? at : maybeSnap(at)
      const end =
        event.shiftKey && tool !== 'brush' ? constrainPoint(tool, gesture.start, target) : target
      setPreview(drawPreview(gesture.start, end, gesture.points))
      return
    }
    if (gesture.kind === 'move') {
      // Delta TOTAL desde o início, sobre a BASE (sem deriva); com a grade
      // ligada o delta anda em passos do espaçamento — a seleção mantém os
      // offsets internos e "pula" de cruzamento em cruzamento.
      let dx = at.x - gesture.start.x
      let dy = at.y - gesture.start.y
      if (showGrid) {
        dx = snapValue(dx, gridSpacing)
        dy = snapValue(dy, gridSpacing)
      }
      commitShapes(
        gesture.baseShapes.map((s) => (selectedIds.includes(s.id) ? translateShape(s, dx, dy) : s)),
        false,
      )
      return
    }
    if (gesture.kind === 'resize') {
      const { anchor, start, baseShapes, handle } = gesture
      const point = maybeSnap(at)
      const isCorner = handle.length === 2
      const horizontal = handle === 'e' || handle === 'w'
      const denomX = start.x - anchor.x
      const denomY = start.y - anchor.y
      const fx = isCorner || horizontal ? (denomX === 0 ? 1 : (point.x - anchor.x) / denomX) : 1
      const fy = isCorner || !horizontal ? (denomY === 0 ? 1 : (point.y - anchor.y) / denomY) : 1
      const resized = new Map(baseShapes.map((s) => [s.id, scaleShape(s, anchor, fx, fy)]))
      commitShapes(
        currentShapes().map((s) => resized.get(s.id) ?? s),
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
    if (gesture.kind === 'reshape') {
      // O ponteiro (coords do doc) volta ao espaço LOCAL do shape (sem rotação).
      const local = rotatePoint(at, gesture.center, -gesture.rotation)
      commitShapes(
        currentShapes().map((s) =>
          s.id === gesture.shapeId ? setShapeNode(s, gesture.nodeIndex, local) : s,
        ),
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
    if (gesture.kind === 'marquee') {
      const box = marquee
      setMarquee(null)
      // Toque sem arrasto: clique simples no fundo — limpa (Shift preserva).
      if (!box || (box.width < 2 && box.height < 2)) {
        if (!gesture.additive) setSelectedIds([])
        return
      }
      const shapes = currentShapes()
      const hit = shapes.filter((s) => boundsIntersect(shapeBounds(s), box)).map((s) => s.id)
      const expanded = expandToGroups(shapes, hit)
      setSelectedIds((current) =>
        gesture.additive ? [...new Set([...current, ...expanded])] : expanded,
      )
      return
    }
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

  const singleBounds = single ? shapeBounds(single) : null
  const reshapeNodes = tool === 'reshape' && single ? shapeNodes(single) : []
  const stageWidth = Math.max(Math.round(doc.width * zoom), 1)
  const stageHeight = Math.max(Math.round(doc.height * zoom), 1)

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      {/* Barra FLUTUANTE da seleção (espelho da do pixel): absoluta sobre o
          palco, fora do fluxo — aparecer/sumir não move o desenho. É a via do
          TOUCH; os rótulos são distintos dos do painel de aparência (a11y). */}
      {selected.length > 0 ? (
        <div
          role="toolbar"
          aria-label={COPY.vector.selectionBar}
          className="pin-panel absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 p-1 shadow-lg"
        >
          <ToolButton icon={Copy} label={COPY.vector.selDuplicate} onClick={duplicateSelected} />
          <ToolButton
            icon={FlipHorizontal2}
            label={COPY.vector.selFlipH}
            onClick={() => flipSelected('h')}
          />
          <ToolButton
            icon={FlipVertical2}
            label={COPY.vector.selFlipV}
            onClick={() => flipSelected('v')}
          />
          {selected.length >= 2 ? (
            <ToolButton icon={Group} label={COPY.vector.selGroup} onClick={groupSelected} />
          ) : null}
          {selected.some((s) => s.groupId) ? (
            <ToolButton icon={Ungroup} label={COPY.vector.selUngroup} onClick={ungroupSelected} />
          ) : null}
          <ToolButton icon={Trash2} label={COPY.vector.selRemove} onClick={removeSelected} />
        </div>
      ) : null}
      {/* O palco SVG: dimensão DEFINIDA (doc × zoom), centraliza quando menor
          que a área e rola quando maior. */}
      {/* `safe center` no lugar do `m-auto`: margem automática ENGOLE o que
          passa do topo/da esquerda (rolagem não vai a negativo) e o palco
          aproximado ficava com metade inalcançável. */}
      <div
        ref={stageRef}
        className="flex min-h-0 min-w-0 flex-1 overflow-auto p-2 [align-items:safe_center] [justify-content:safe_center]"
      >
        {/* Papel BRANCO fixo (sem xadrez): cor absoluta em qualquer tema; canto
            RETO para a borda não "comer" o desenho da criança. */}
        <div className="border-2 border-pin-border bg-white shadow-inner">
          <svg
            ref={svgRef}
            width={stageWidth}
            height={stageHeight}
            viewBox={`0 0 ${doc.width} ${doc.height}`}
            className="block bg-white/60"
            style={{ touchAction: 'none' }}
            role="img"
            aria-label={COPY.a11y.drawArea}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
          >
            {/* Degradês de TODOS os shapes visíveis (doc + onion + prévia). */}
            <GradientDefs
              shapes={[...doc.shapes, ...(onionShapes ?? []), ...(preview ? [preview] : [])]}
            />
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

            {/* Grade de APOIO (só no editor, nunca no export): um <pattern> e um
                <rect> — O(1) nós de DOM em qualquer documento; o traço divide
                pelo zoom para ficar fininho em qualquer aproximação. */}
            {showGrid ? (
              // Decorativa por herança: o <svg> pai é role="img" com rótulo.
              <g pointerEvents="none">
                <defs>
                  <pattern
                    id="pin-editor-grid"
                    width={gridSpacing}
                    height={gridSpacing}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}`}
                      fill="none"
                      stroke="#64748b"
                      strokeOpacity={0.35}
                      strokeWidth={1 / zoom}
                    />
                  </pattern>
                </defs>
                <rect width={doc.width} height={doc.height} fill="url(#pin-editor-grid)" />
              </g>
            ) : null}

            {/* Moldura + alças da seleção única. As medidas dividem pelo zoom
                para manter um tamanho CONSTANTE na tela (alça pequena demais
                em zoom baixo era impossível de tocar). */}
            {tool !== 'reshape' && single && singleBounds ? (
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
            {/* Modo reshape: nós arrastáveis (sem alças de bbox). */}
            {tool === 'reshape' && single && singleBounds ? (
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
                  strokeWidth={1 / zoom}
                  pointerEvents="none"
                />
                {reshapeNodes.map((node, i) => (
                  <circle
                    // biome-ignore lint/suspicious/noArrayIndexKey: o índice É a identidade do nó
                    key={`node-${i}`}
                    cx={node.x}
                    cy={node.y}
                    r={7 / zoom}
                    fill="#ffffff"
                    stroke="#00a0c8"
                    strokeWidth={1.5 / zoom}
                    style={{ cursor: 'move' }}
                    onPointerDown={(event) => handleReshapeDown(i, event)}
                  />
                ))}
              </g>
            ) : null}
            {/* Seleção múltipla: moldura fina POR forma + a caixa da UNIÃO com
                as 8 alças (todas escalam juntas; girar segue só no individual). */}
            {selected.length > 1 ? (
              <>
                {selected.map((shape) => {
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
                })}
                {(() => {
                  const union = boundsUnion(selected.map(shapeBounds))
                  return (
                    <g>
                      <rect
                        x={union.x}
                        y={union.y}
                        width={union.width}
                        height={union.height}
                        fill="none"
                        stroke="#00a0c8"
                        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                        strokeWidth={1.5 / zoom}
                        pointerEvents="none"
                      />
                      {HANDLES.map((handle) => (
                        <rect
                          key={`multi-${handle.id}`}
                          x={union.x + handle.fx * union.width - 7 / zoom}
                          y={union.y + handle.fy * union.height - 7 / zoom}
                          width={14 / zoom}
                          height={14 / zoom}
                          fill="#ffffff"
                          stroke="#00a0c8"
                          strokeWidth={1.5 / zoom}
                          style={{ cursor: 'pointer' }}
                          onPointerDown={(event) => handleResizeDown(handle, union, event)}
                        />
                      ))}
                    </g>
                  )
                })()}
              </>
            ) : null}
            {/* Laço de seleção em andamento */}
            {marquee ? (
              <rect
                x={marquee.x}
                y={marquee.y}
                width={marquee.width}
                height={marquee.height}
                fill="#00a0c8"
                fillOpacity={0.08}
                stroke="#00a0c8"
                strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                strokeWidth={1 / zoom}
                pointerEvents="none"
              />
            ) : null}
          </svg>
        </div>
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
            name="vector-text"
            autoComplete="off"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder={COPY.vector.textPlaceholder}
            aria-label={COPY.vector.textPrompt}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
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
