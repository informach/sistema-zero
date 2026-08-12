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
import { isInteractiveControlTarget } from '../../../core/dom'
import { safeSetPointerCapture } from '../../../core/pointer'
import { PINTA_LIMITS, type PintaAsset } from '../../../core/project'
import {
  type Bounds,
  boundsCenter,
  boundsIntersect,
  boundsUnion,
  rotateShapeTo,
  scaleShape,
  shapeBounds,
  translateShape,
} from '../../../vector/geometry'
import { gridSpacingFor, snapPoint, snapValue } from '../../../vector/grid'
import { type Vec2, type VectorShape, visibleShapes } from '../../../vector/model'
import {
  type EditablePath,
  isSmoothNode,
  moveNodes,
  nearestOnPath,
  setHandle,
} from '../../../vector/pathNodes'
import {
  makeEllipse,
  makeLine,
  makePath,
  makePolygon,
  makePolygonFromPoints,
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
import { useMediaQuery } from '../useMediaQuery'
import { useWheelZoom } from '../useWheelZoom'
import { useVectorEditor } from './VectorEditorScope'
import { VectorNodeActions } from './VectorNodeActions'
import {
  mergeNodeSelection,
  type NodeFrame,
  nodeFrameOf,
  nodesInBox,
  toLocalPoint,
} from './vectorNodeGestures'
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
  // Arrastar NOS: guarda o caminho da BASE e os indices escolhidos, e cada move
  // aplica o delta TOTAL sobre essa base (mesma regra do mover forma).
  | {
      kind: 'nodeMove'
      pointerId: number
      shapeId: string
      indices: number[]
      basePath: EditablePath
      frame: NodeFrame
      start: Vec2
      base: PintaAsset
    }
  // Laco de nos: o irmao do marquee de formas, dentro do modo de pontos.
  | { kind: 'nodeMarquee'; pointerId: number; start: Vec2; additive: boolean }
  // Arrastar uma ALCA. `mirror` congela no down se o no era suave: e o que faz
  // a outra alca acompanhar (ou nao, num no de canto) durante o arrasto inteiro.
  | {
      kind: 'handleMove'
      pointerId: number
      nodeIndex: number
      which: 'in' | 'out'
      mirror: boolean
      basePath: EditablePath
      frame: NodeFrame
      base: PintaAsset
    }
  | { kind: 'pan'; pointerId: number; startClient: Vec2; startScroll: Vec2 }

/**
 * Distância mínima, em px de TELA, entre o nó e a alça para a alça aparecer.
 * Abaixo disso os dois círculos se sobrepõem e um rouba o toque do outro.
 */
const MIN_HANDLE_GAP = 24

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
    nodeTarget,
    nodePath,
    selectedNodes,
    setSelectedNodes,
    applyNodeEdit,
    insertNodeOnSegment,
    polygonSides,
    starTips,
    rectRadius,
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
  // Mesmo corte do EditorScreen: no desktop a faixa da seleção substitui a
  // barra flutuante.
  const wide = useMediaQuery('(min-width: 768px)')
  const [preview, setPreview] = useState<VectorShape | null>(null)
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  // Diálogo do texto: criar num ponto OU reeditar um shape existente.
  const [textDialog, setTextDialog] = useState<
    { mode: 'new'; at: Vec2 } | { mode: 'edit'; shapeId: string } | null
  >(null)
  const [textValue, setTextValue] = useState('')
  // Pontos pendentes da CANETA + o cursor da linha elástica.
  const [penPoints, setPenPoints] = useState<Vec2[]>([])
  const [penCursor, setPenCursor] = useState<Vec2 | null>(null)
  // Barra de espaço segurada = Mão temporária (qualquer ferramenta).
  const [spaceHeld, setSpaceHeld] = useState(false)
  const gestureRef = useRef<Gesture | null>(null)

  // Trocar de quadro/tile é trocar de documento: prévia e gesto não migram.
  // (A seleção é resetada pelo VectorEditorScope, dono dela.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro/tile ativo), não leituras
  useEffect(() => {
    setPreview(null)
    setMarquee(null)
    setPenPoints([])
    setPenCursor(null)
    gestureRef.current = null
  }, [animationId, frameIndex])

  // Trocar de ferramenta descarta os pontos pendentes da Caneta.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a dep é o GATILHO (trocou de ferramenta), não leitura
  useEffect(() => {
    setPenPoints([])
    setPenCursor(null)
  }, [tool])

  // Enter fecha a forma da Caneta; Esc descarta os pontos. Registrado só com
  // pontos pendentes; ignora campos de texto E botões (Enter ativa botão).
  // biome-ignore lint/correctness/useExhaustiveDependencies: finishPen lê o estado vivo; re-registra por tool/pontos
  useEffect(() => {
    if (tool !== 'pen' || penPoints.length === 0) return
    function onKey(event: globalThis.KeyboardEvent): void {
      if (isInteractiveControlTarget(event.target)) return
      if (event.key === 'Enter') {
        event.preventDefault()
        finishPen(penPoints)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setPenPoints([])
        setPenCursor(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tool, penPoints])

  // Segurar ESPAÇO vira a Mão na hora (padrão dos programas de desenho).
  // Botões ficam de fora (espaço é o clique deles); soltar no meio de um
  // arrasto deixa o gesto de pan terminar sozinho.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key !== ' ') return
      if (isInteractiveControlTarget(event.target)) return
      event.preventDefault()
      setSpaceHeld(true)
    }
    function onKeyUp(event: globalThis.KeyboardEvent): void {
      if (event.key === ' ') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

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
        return makeRect(start, current, style, rectRadius)
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

  /** Inicia o gesto de pan (Mão OU espaço segurado). */
  function startPan(event: PointerEvent<SVGSVGElement>): void {
    const stage = stageRef.current
    if (!stage) return
    gestureRef.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startScroll: { x: stage.scrollLeft, y: stage.scrollTop },
    }
  }

  /** Fecha a forma da Caneta (Enter, duplo clique ou clique perto do início). */
  function finishPen(points: Vec2[]): void {
    setPenPoints([])
    setPenCursor(null)
    // Duplo clique deixa um ponto duplicado no fim: pontos coladinhos caem.
    const cleaned = points.filter((p, i) => {
      const prev = points[i - 1]
      return !prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= 0.5
    })
    if (cleaned.length < 3) return
    const shape = makePolygonFromPoints(cleaned, style)
    commitShapes([...currentShapes(), shape])
    setSelectedIds([shape.id])
  }

  function handleCanvasPointerDown(event: PointerEvent<SVGSVGElement>): void {
    if (!event.isPrimary || gestureRef.current) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    const at = svgPoint(event)
    if (spaceHeld) {
      startPan(event)
      return
    }
    if (tool === 'text') {
      setTextDialog({ mode: 'new', at })
      setTextValue('')
      return
    }
    if (tool === 'pen') {
      // O teto de formas é checado no PRIMEIRO ponto (mesma régua do desenho).
      if (penPoints.length === 0 && currentShapes().length >= PINTA_LIMITS.maxShapes) {
        showToast(COPY.vector.shapeLimit)
        return
      }
      const point = maybeSnap(at)
      const first = penPoints[0]
      // Clicar perto do 1º ponto (com 3+) fecha a forma.
      if (
        first &&
        penPoints.length >= 3 &&
        Math.hypot(point.x - first.x, point.y - first.y) <= 10 / zoom
      ) {
        finishPen(penPoints)
        return
      }
      // Teto de pontos do polígono (sanitize aceita até 64).
      if (penPoints.length >= 64) return
      setPenPoints([...penPoints, point])
      setPenCursor(point)
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
      // Antes isto só limpava a seleção. Agora o arrasto no fundo é o LAÇO DE
      // NÓS; o toque parado continua limpando (resolvido no solto).
      startNodeMarquee(event, at)
      return
    }
    if (tool === 'pan') {
      startPan(event)
      return
    }
    if (tool === 'picker') {
      // Conta-gotas: adota o estilo da forma mais AO TOPO sob o toque (bbox — o
      // clique de forma borbulha até aqui porque não é a ferramenta de seleção).
      // `adoptStyle` muda SÓ o estilo vigente (não re-estiliza a seleção).
      const hit = [...visibleShapes(currentShapes())]
        .reverse()
        .find((s) => bboxContains(shapeBounds(s), at))
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
    // Espaço segurado: deixa o evento SUBIR até o palco (vira pan).
    if (spaceHeld) return
    if ((tool !== 'select' && tool !== 'reshape') || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    // Reshape: só seleciona (single) — quem arrasta o corpo NÃO move; os nós é
    // que reshapeiam.
    if (tool === 'reshape') {
      // Forma diferente da que esta em edicao: so troca o alvo.
      if (!nodeTarget || nodeTarget.id !== shape.id || !nodePath) {
        setSelectedIds([shape.id])
        return
      }
      // Na forma em edicao, tocar EM CIMA do traco acrescenta um ponto. A folga
      // acompanha a espessura: traco grosso e mais facil de acertar, e o browser
      // ja confirmou que o toque pegou a forma.
      const frame = nodeFrameOf(nodeTarget)
      const local = toLocalPoint(frame, svgPoint(event))
      const slack = 10 / zoom + (nodeTarget.stroke?.width ?? 0) / 2
      const hit = nearestOnPath(nodePath, local, slack)
      if (hit) {
        insertNodeOnSegment(hit.segmentIndex, hit.t)
        return
      }
      // Tocou no miolo de uma forma preenchida: vale como laco de nos.
      startNodeMarquee(event, svgPoint(event))
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
    if (spaceHeld || selected.length === 0 || !event.isPrimary || gestureRef.current) return
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
    if (spaceHeld || !single || !event.isPrimary || gestureRef.current) return
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

  /** Laco de nos: compartilhado pelo fundo e pelo miolo da forma em edicao. */
  function startNodeMarquee(event: PointerEvent<SVGElement>, at: Vec2): void {
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    gestureRef.current = {
      kind: 'nodeMarquee',
      pointerId: event.pointerId,
      start: at,
      additive: event.shiftKey,
    }
    setMarquee({ x: at.x, y: at.y, width: 0, height: 0 })
  }

  function handleBezierDown(
    nodeIndex: number,
    which: 'in' | 'out',
    event: PointerEvent<SVGElement>,
  ): void {
    if (spaceHeld || !nodeTarget || !nodePath || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    const node = nodePath.nodes[nodeIndex]
    gestureRef.current = {
      kind: 'handleMove',
      pointerId: event.pointerId,
      nodeIndex,
      which,
      mirror: node ? isSmoothNode(node) : false,
      basePath: nodePath,
      frame: nodeFrameOf(nodeTarget),
      base: editor.getState().asset,
    }
  }

  function handleNodeDown(nodeIndex: number, event: PointerEvent<SVGElement>): void {
    if (spaceHeld || !nodeTarget || !nodePath || !event.isPrimary || gestureRef.current) return
    event.stopPropagation()
    if (svgRef.current) safeSetPointerCapture(svgRef.current, event.pointerId)
    // Tocar num no FORA da escolha passa a escolha para ele; tocar num que ja
    // esta escolhido arrasta o conjunto inteiro (padrao de editor de formas).
    const already = selectedNodes.includes(nodeIndex)
    const indices = event.shiftKey
      ? mergeNodeSelection(selectedNodes, [nodeIndex], true)
      : already
        ? selectedNodes
        : [nodeIndex]
    setSelectedNodes(indices)
    gestureRef.current = {
      kind: 'nodeMove',
      pointerId: event.pointerId,
      shapeId: nodeTarget.id,
      indices,
      basePath: nodePath,
      frame: nodeFrameOf(nodeTarget),
      start: svgPoint(event),
      base: editor.getState().asset,
    }
  }

  /** Duplo clique num TEXTO (com a Selecionar) reabre o diálogo para editar. */
  function handleShapeDoubleClick(shape: VectorShape): void {
    if (tool !== 'select' || shape.type !== 'text') return
    setTextDialog({ mode: 'edit', shapeId: shape.id })
    setTextValue(shape.text)
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>): void {
    // Linha elástica da Caneta (sem gesto ativo).
    if (tool === 'pen' && penPoints.length > 0 && !gestureRef.current) {
      setPenCursor(svgPoint(event))
    }
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
    if (gesture.kind === 'nodeMarquee') {
      setMarquee({
        x: Math.min(gesture.start.x, at.x),
        y: Math.min(gesture.start.y, at.y),
        width: Math.abs(at.x - gesture.start.x),
        height: Math.abs(at.y - gesture.start.y),
      })
      return
    }
    if (gesture.kind === 'handleMove') {
      // A alca vai PARA o ponteiro (nao por delta): e o jeito que a mao espera.
      applyNodeEdit(
        setHandle(
          gesture.basePath,
          gesture.nodeIndex,
          gesture.which,
          toLocalPoint(gesture.frame, at),
          gesture.mirror,
        ),
        false,
      )
      return
    }
    if (gesture.kind === 'nodeMove') {
      // O delta é medido no espaço LOCAL dos nós: numa forma girada, arrastar
      // para a direita tem que empurrar o ponto para a direita na TELA.
      const from = toLocalPoint(gesture.frame, gesture.start)
      const to = toLocalPoint(gesture.frame, at)
      applyNodeEdit(
        moveNodes(gesture.basePath, gesture.indices, { x: to.x - from.x, y: to.y - from.y }),
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
      // O laço só pega formas VISÍVEIS (apagar algo invisível assustaria).
      const hit = visibleShapes(shapes)
        .filter((s) => boundsIntersect(shapeBounds(s), box))
        .map((s) => s.id)
      const expanded = expandToGroups(shapes, hit)
      setSelectedIds((current) =>
        gesture.additive ? [...new Set([...current, ...expanded])] : expanded,
      )
      return
    }
    if (gesture.kind === 'nodeMarquee') {
      const box = marquee
      setMarquee(null)
      // Toque sem arrasto: clique simples, larga os nós (Shift preserva).
      if (!box || (box.width < 2 && box.height < 2)) {
        if (!gesture.additive) setSelectedNodes([])
        return
      }
      if (!nodeTarget || !nodePath) return
      const hit = nodesInBox(nodePath, nodeFrameOf(nodeTarget), box)
      setSelectedNodes((current) => mergeNodeSelection(current, hit, gesture.additive))
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
  const reshapeNodes = tool === 'reshape' && nodePath ? nodePath.nodes.map((n) => n.p) : []
  const stageWidth = Math.max(Math.round(doc.width * zoom), 1)
  const stageHeight = Math.max(Math.round(doc.height * zoom), 1)

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      {/* Barra FLUTUANTE da seleção (espelho da do pixel): absoluta sobre o
          palco, fora do fluxo — aparecer/sumir não move o desenho. É a via do
          TOUCH e SÓ DELE: no desktop as mesmas ações (mais alinhar e ordem)
          moram na faixa colada na barra de cima, e ter as duas na mesma tela
          confunde. Por isso as duas compartilham `aria-label` e rótulos. */}
      {tool === 'reshape' && nodeTarget && nodePath && !wide ? (
        <div
          role="toolbar"
          aria-label={COPY.vector.nodeBar}
          className="pin-panel absolute top-2 left-1/2 z-10 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto p-1 shadow-lg"
        >
          <VectorNodeActions />
        </div>
      ) : null}
      {tool !== 'reshape' && selected.length > 0 && !wide ? (
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
            style={{ touchAction: 'none', cursor: spaceHeld ? 'grab' : undefined }}
            role="img"
            aria-label={COPY.a11y.drawArea}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            onDoubleClick={
              tool === 'pen' && penPoints.length > 0 ? () => finishPen(penPoints) : undefined
            }
          >
            {/* Degradês de TODOS os shapes visíveis (doc + onion + prévia) — o
                olhinho do painel Camadas tira a forma do palco inteiro. */}
            <GradientDefs
              shapes={[
                ...visibleShapes(doc.shapes),
                ...visibleShapes(onionShapes ?? []),
                ...(preview ? [preview] : []),
              ]}
            />
            {/* Onion skin: o quadro ANTERIOR, apagadinho e sem eventos. */}
            {onionShapes ? (
              <g opacity={0.3} pointerEvents="none">
                {visibleShapes(onionShapes).map((shape) => (
                  <ShapeElement key={`onion-${shape.id}`} shape={shape} />
                ))}
              </g>
            ) : null}
            {visibleShapes(doc.shapes).map((shape) => (
              <ShapeElement
                key={shape.id}
                shape={shape}
                onPointerDown={(event) => handleShapePointerDown(shape, event)}
                onDoubleClick={() => handleShapeDoubleClick(shape)}
              />
            ))}
            {preview ? <ShapeElement shape={preview} /> : null}

            {/* Prévia da CANETA: contorno elástico até o cursor + os pontos já
                marcados (o 1º maior = o alvo de fechar). O estilo de verdade
                entra no commit. */}
            {tool === 'pen' && penPoints.length > 0 ? (
              <g pointerEvents="none">
                <polyline
                  points={[...penPoints, ...(penCursor ? [penCursor] : [])]
                    .map((p) => `${p.x},${p.y}`)
                    .join(' ')}
                  fill={penPoints.length >= 3 ? '#00a0c8' : 'none'}
                  fillOpacity={0.12}
                  stroke="#00a0c8"
                  strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                  strokeWidth={1.5 / zoom}
                />
                {penPoints.map((p, i) => (
                  <circle
                    // biome-ignore lint/suspicious/noArrayIndexKey: o índice É a identidade do ponto
                    key={`pen-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={(i === 0 ? 6 : 4) / zoom}
                    fill="#ffffff"
                    stroke="#00a0c8"
                    strokeWidth={1.5 / zoom}
                  />
                ))}
              </g>
            ) : null}

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
                  <g
                    // biome-ignore lint/suspicious/noArrayIndexKey: o índice É a identidade do nó
                    key={`node-${i}`}
                    style={{ cursor: 'move' }}
                    onPointerDown={(event) => handleNodeDown(i, event)}
                  >
                    <circle
                      data-node-hit={i}
                      cx={node.x}
                      cy={node.y}
                      r={22 / zoom}
                      fill="transparent"
                    />
                    <circle
                      data-node={i}
                      cx={node.x}
                      cy={node.y}
                      r={7 / zoom}
                      // Escolhido = cheio; solto = vazado. É o único jeito de ver
                      // quantos pontos o Delete vai levar.
                      fill={selectedNodes.includes(i) ? '#00a0c8' : '#ffffff'}
                      stroke="#00a0c8"
                      strokeWidth={1.5 / zoom}
                      pointerEvents="none"
                    />
                  </g>
                ))}
                {/* ⚠️ Alças DEPOIS das âncoras (ficam por cima e são pegáveis),
                    mas só as que estão longe o bastante do nó para não brigarem
                    com ele pelo toque. Num traço de pincel a Catmull-Rom deixa a
                    alça a uns 4 px do nó: desenhada por cima ela roubaria o
                    arrasto do PONTO, e escondida atrás ela era impossível de
                    pegar. Aproximar o zoom afasta as duas e a alça reaparece. */}
                {nodePath?.nodes.map((node, i) =>
                  selectedNodes.includes(i) ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: o índice É a identidade do nó (mesma regra das âncoras)
                    <g key={`alcas-${i}`}>
                      {(['in', 'out'] as const).map((which) => {
                        const handle = node[which]
                        if (!handle) return null
                        const far =
                          Math.hypot(handle.x - node.p.x, handle.y - node.p.y) * zoom >=
                          MIN_HANDLE_GAP
                        if (!far) return null
                        return (
                          <g
                            key={which}
                            style={{ cursor: 'move' }}
                            onPointerDown={(event) => handleBezierDown(i, which, event)}
                          >
                            <line
                              x1={node.p.x}
                              y1={node.p.y}
                              x2={handle.x}
                              y2={handle.y}
                              stroke="#00a0c8"
                              strokeWidth={1 / zoom}
                              pointerEvents="none"
                            />
                            <circle
                              data-handle-hit={which}
                              cx={handle.x}
                              cy={handle.y}
                              r={22 / zoom}
                              fill="transparent"
                            />
                            <circle
                              data-handle={which}
                              cx={handle.x}
                              cy={handle.y}
                              r={5 / zoom}
                              fill="#ffffff"
                              stroke="#00a0c8"
                              strokeWidth={1.5 / zoom}
                              pointerEvents="none"
                            />
                          </g>
                        )
                      })}
                    </g>
                  ) : null,
                )}
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

      {/* Texto: criar num ponto OU reeditar (duplo clique no palco). Vazio
          mantém o botão desabilitado — sem apagar texto sem querer. */}
      <Dialog
        open={textDialog !== null}
        onClose={() => setTextDialog(null)}
        title={textDialog?.mode === 'edit' ? COPY.vector.editText : COPY.vector.textPrompt}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const dialog = textDialog
            const text = textValue.trim().slice(0, 200)
            if (!dialog || !text) return
            if (dialog.mode === 'edit') {
              commitShapes(
                currentShapes().map((s) =>
                  s.id === dialog.shapeId && s.type === 'text' ? { ...s, text } : s,
                ),
              )
              setTextDialog(null)
              return
            }
            const shapes = currentShapes()
            if (shapes.length >= PINTA_LIMITS.maxShapes) {
              showToast(COPY.vector.shapeLimit)
              setTextDialog(null)
              return
            }
            const shape = makeText(dialog.at, text, style)
            commitShapes([...shapes, shape])
            setSelectedIds([shape.id])
            setTool('select')
            setTextDialog(null)
          }}
        >
          <input
            autoFocus
            name="vector-text"
            autoComplete="off"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder={COPY.vector.textPlaceholder}
            aria-label={textDialog?.mode === 'edit' ? COPY.vector.editText : COPY.vector.textPrompt}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTextDialog(null)}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={!textValue.trim()}>
              {textDialog?.mode === 'edit' ? COPY.vector.saveText : COPY.vector.add}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
