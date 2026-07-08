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
  rotatePoint,
  rotateShapeTo,
  scaleShape,
  setShapeNode,
  shapeBounds,
  shapeNodes,
  translateShape,
} from '../../vector/geometry'
import {
  isVectorGradient,
  type Vec2,
  type VectorGradient,
  type VectorShape,
} from '../../vector/model'
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
import { GradientDefs, ShapeElement } from '../../vector/VectorFrameSvg'
import { Button, ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import {
  BringToFront,
  Brush,
  ChevronsDown,
  ChevronsUp,
  Circle,
  CircleDot,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Hand,
  Hexagon,
  type LucideIcon,
  Maximize,
  MousePointer2,
  MoveHorizontal,
  MoveVertical,
  PenTool,
  Pipette,
  SendToBack,
  Slash,
  Square,
  Star,
  Trash2,
  Type,
  Ungroup,
} from '../ui/icons'
import { useToast } from '../ui/Toast'
import { ColorButton } from './ColorPicker'
import { useEditor, useEditorStores, useSession } from './editorContext'

type VectorTool =
  | 'select'
  | 'reshape'
  | 'pan'
  | 'brush'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'star'
  | 'text'
  | 'picker'

const TOOLS: Array<{ id: VectorTool; icon: LucideIcon; label: string }> = [
  { id: 'select', icon: MousePointer2, label: COPY.vector.select },
  { id: 'reshape', icon: PenTool, label: COPY.vector.reshape },
  { id: 'pan', icon: Hand, label: COPY.vector.pan },
  { id: 'brush', icon: Brush, label: COPY.vector.brush },
  { id: 'rect', icon: Square, label: COPY.tools.rect },
  { id: 'ellipse', icon: Circle, label: COPY.tools.ellipse },
  { id: 'line', icon: Slash, label: COPY.tools.line },
  { id: 'polygon', icon: Hexagon, label: COPY.vector.polygon },
  { id: 'star', icon: Star, label: COPY.vector.star },
  { id: 'text', icon: Type, label: COPY.vector.text },
  { id: 'picker', icon: Pipette, label: COPY.tools.picker },
]

/** No máximo de cores personalizadas guardadas na sessão (aparecem como swatches). */
const MAX_CUSTOM_COLORS = 6

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

const SWATCH_SET: ReadonlySet<string> = new Set(SWATCHES)

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

/** Expande ids para incluir TODOS os shapes dos mesmos grupos (seleção junta). */
function expandToGroups(shapes: VectorShape[], ids: string[]): string[] {
  const groups = new Set<string>()
  for (const s of shapes) if (ids.includes(s.id) && s.groupId) groups.add(s.groupId)
  if (groups.size === 0) return ids
  const result = new Set(ids)
  for (const s of shapes) if (s.groupId && groups.has(s.groupId)) result.add(s.id)
  return [...result]
}

/** Trava o ponto de arrasto: Shift = quadrado/círculo (formas) ou 45° (linha). */
function constrainPoint(tool: VectorTool, start: Vec2, current: Vec2): Vec2 {
  const dx = current.x - start.x
  const dy = current.y - start.y
  if (tool === 'line') {
    const step = Math.PI / 4
    const snapped = Math.round(Math.atan2(dy, dx) / step) * step
    const len = Math.hypot(dx, dy)
    return { x: start.x + Math.cos(snapped) * len, y: start.y + Math.sin(snapped) * len }
  }
  const size = Math.max(Math.abs(dx), Math.abs(dy))
  return { x: start.x + (dx < 0 ? -size : size), y: start.y + (dy < 0 ? -size : size) }
}

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
  // Cores personalizadas recentes (conta-gotas + seletor livre) — viram swatches.
  const [customColors, setCustomColors] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [preview, setPreview] = useState<VectorShape | null>(null)
  const [textAt, setTextAt] = useState<Vec2 | null>(null)
  const [textValue, setTextValue] = useState('')
  // Lados do polígono / pontas da estrela (configuráveis quando a ferramenta ativa).
  const [polygonSides, setPolygonSides] = useState(6)
  const [starTips, setStarTips] = useState(5)
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  // Área de transferência (copiar/colar) — shapes clonados, vive na sessão.
  const clipboardRef = useRef<VectorShape[]>([])

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

  // Copiar/colar/selecionar-tudo (Ctrl/Cmd+C/V/A) — sempre ativo, ignora campos
  // de texto. Não colide com o desfazer/refazer do EditorScreen (Z/Y).
  // biome-ignore lint/correctness/useExhaustiveDependencies: lê estado vivo via stores/refs; só a seleção re-registra (p/ o copiar)
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'a') {
        event.preventDefault()
        selectAll()
      } else if (key === 'c') {
        event.preventDefault()
        copySelected()
      } else if (key === 'v') {
        event.preventDefault()
        pasteClipboard()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds])

  const ref: ActiveFrameRef = { animationId, frameIndex }
  const doc = activeShapesOf(asset, ref)
  if (!doc) return null

  // Paleta do JOGO (Pensa) entra na frente das cores fixas, sem duplicar. Só
  // no vetor (cor livre) — o bitmap é indexado em 16 cores e não muda. As cores
  // personalizadas recentes (conta-gotas/seletor) vêm na frente de tudo.
  const projectSwatches = (asset.projectRef?.palette ?? []).filter((hex) => !SWATCH_SET.has(hex))
  const baseSwatches = [...projectSwatches, ...SWATCHES]
  const extraCustom = customColors.filter((hex) => !baseSwatches.includes(hex))
  const swatches = [...extraCustom, ...baseSwatches]

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
    if (tool === 'select' || tool === 'reshape') {
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
      const hit = [...currentShapes()].reverse().find((s) => bboxContains(shapeBounds(s), at))
      if (hit) {
        setStyle((cur) => ({
          ...cur,
          fill: hit.fill,
          stroke: hit.stroke ? { ...hit.stroke } : null,
          opacity: hit.opacity,
        }))
        if (typeof hit.fill === 'string' && hit.fill !== 'none') rememberColor(hit.fill)
        if (hit.stroke) rememberColor(hit.stroke.color)
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

    if (gesture.kind === 'draw') {
      // Decimação: ponto quase em cima do anterior não acrescenta nada e
      // encareceria a re-suavização do traço a cada move.
      const last = gesture.points[gesture.points.length - 1]
      if (last && Math.hypot(at.x - last.x, at.y - last.y) < BRUSH_MIN_POINT_DISTANCE) return
      gesture.points.push(at)
      // Shift trava a proporção (quadrado/círculo/45°) — não vale pro pincel.
      const end = event.shiftKey && tool !== 'brush' ? constrainPoint(tool, gesture.start, at) : at
      setPreview(drawPreview(gesture.start, end, gesture.points))
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

  /** Guarda uma cor livre no topo das recentes (dedup, teto). */
  function rememberColor(hex: string): void {
    setCustomColors((cur) => [hex, ...cur.filter((c) => c !== hex)].slice(0, MAX_CUSTOM_COLORS))
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

  /** Ordem-Z: um passo (±1) ou direto pro topo/fundo (front/back). */
  /** Degradê "de trabalho": o atual, ou um novo a partir da cor sólida vigente. */
  function currentGradient(): VectorGradient {
    if (isVectorGradient(style.fill)) return style.fill
    const from =
      typeof style.fill === 'string' && style.fill.startsWith('#') ? style.fill : '#78dc52'
    return { type: 'linear', from, to: '#ffffff', angle: 90 }
  }

  function applyGradient(partial: Partial<VectorGradient>): void {
    applyStyle({ fill: { ...currentGradient(), ...partial } })
  }

  function moveOrder(to: 1 | -1 | 'front' | 'back'): void {
    if (!single) return
    const shapes = [...currentShapes()]
    const index = shapes.findIndex((s) => s.id === single.id)
    if (index === -1) return
    const last = shapes.length - 1
    const target = to === 'front' ? last : to === 'back' ? 0 : index + to
    if (target < 0 || target > last || target === index) return
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

  /** Agrupa a seleção (2+): passam a se mover/selecionar juntos. */
  function groupSelected(): void {
    if (selected.length < 2) return
    const gid = newId()
    commitShapes(
      currentShapes().map((s) => (selectedIds.includes(s.id) ? { ...s, groupId: gid } : s)),
    )
  }

  /** Desagrupa a seleção (tira o vínculo de grupo). */
  function ungroupSelected(): void {
    if (!selected.some((s) => s.groupId)) return
    commitShapes(
      currentShapes().map((s) =>
        selectedIds.includes(s.id) && s.groupId ? { ...s, groupId: undefined } : s,
      ),
    )
  }

  function copySelected(): void {
    if (selected.length === 0) return
    clipboardRef.current = selected.map((s) => structuredClone(s))
  }

  /** Cola o clipboard (ids/grupos NOVOS, deslocado +12,+12), selecionando as cópias. */
  function pasteClipboard(): void {
    const clip = clipboardRef.current
    if (clip.length === 0) return
    const shapes = currentShapes()
    if (shapes.length + clip.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    const groupMap = new Map<string, string>()
    const copies = clip.map((s) => {
      const moved = translateShape({ ...structuredClone(s), id: newId() }, 12, 12)
      if (!s.groupId) return moved
      const gid = groupMap.get(s.groupId) ?? newId()
      groupMap.set(s.groupId, gid)
      return { ...moved, groupId: gid }
    })
    commitShapes([...shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }

  function selectAll(): void {
    setSelectedIds(currentShapes().map((s) => s.id))
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
  const reshapeNodes = tool === 'reshape' && single ? shapeNodes(single) : []
  const activeGradient = isVectorGradient(style.fill) ? style.fill : null
  const stageWidth = Math.max(Math.round(doc.width * zoom), 1)
  const stageHeight = Math.max(Math.round(doc.height * zoom), 1)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-h-0 flex-1 items-stretch gap-2">
        {/* Ferramentas em GRADE de 2 colunas (tudo visível, sem scroll); o
            "Ajustar" mora aqui e o zoom fica no rodapé da tela. */}
        <div
          role="toolbar"
          aria-label="Ferramentas"
          aria-orientation="vertical"
          className="pin-panel grid shrink-0 grid-cols-2 content-start justify-items-center gap-1 overflow-y-auto p-2"
        >
          {TOOLS.map((entry) => (
            <ToolButton
              key={entry.id}
              icon={entry.icon}
              label={entry.label}
              active={tool === entry.id}
              onClick={() => setTool(entry.id)}
            />
          ))}
          <hr className="col-span-2 my-1 w-8 border-pin-border" />
          <ToolButton icon={Maximize} label={COPY.editor.zoomFit} onClick={zoomToFit} />
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
        <div className="flex min-h-0 w-56 shrink-0 flex-col gap-2 overflow-y-auto">
          <section className="pin-panel p-3">
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
              {swatches.map((hex) => (
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
              {/* Seletor de cor livre (a roda de cores própria do Pinta). */}
              <ColorButton
                label={`${COPY.vector.fill}: ${COPY.vector.customColor}`}
                value={
                  typeof style.fill === 'string' && style.fill.startsWith('#')
                    ? style.fill
                    : '#000000'
                }
                recentColors={customColors}
                onChange={(hex) => {
                  rememberColor(hex)
                  applyStyle({ fill: hex })
                }}
              />
            </div>

            {/* Degradê: direção/tipo + as duas cores (de → para). */}
            <span className="mt-3 mb-1 block text-sm font-bold text-pin-muted">
              {COPY.vector.gradient}
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <ToolButton
                icon={MoveHorizontal}
                label={COPY.vector.gradientH}
                active={activeGradient?.type === 'linear' && activeGradient.angle === 0}
                onClick={() => applyGradient({ type: 'linear', angle: 0 })}
              />
              <ToolButton
                icon={MoveVertical}
                label={COPY.vector.gradientV}
                active={activeGradient?.type === 'linear' && activeGradient.angle === 90}
                onClick={() => applyGradient({ type: 'linear', angle: 90 })}
              />
              <ToolButton
                icon={CircleDot}
                label={COPY.vector.gradientRadial}
                active={activeGradient?.type === 'radial'}
                onClick={() => applyGradient({ type: 'radial' })}
              />
              <ColorButton
                label={COPY.vector.gradientFrom}
                value={activeGradient?.from ?? currentGradient().from}
                recentColors={customColors}
                onChange={(hex) => {
                  rememberColor(hex)
                  applyGradient({ from: hex })
                }}
              />
              <ColorButton
                label={COPY.vector.gradientTo}
                value={activeGradient?.to ?? currentGradient().to}
                recentColors={customColors}
                onChange={(hex) => {
                  rememberColor(hex)
                  applyGradient({ to: hex })
                }}
              />
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
              {swatches.map((hex) => (
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
              {/* Seletor de cor livre do contorno. */}
              <ColorButton
                label={`${COPY.vector.stroke}: ${COPY.vector.customColor}`}
                value={style.stroke?.color ?? '#000000'}
                recentColors={customColors}
                onChange={(hex) => {
                  rememberColor(hex)
                  applyStyle({ stroke: { color: hex, width: style.stroke?.width ?? 2 } })
                }}
              />
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

          {tool === 'polygon' || tool === 'star' ? (
            <section className="pin-panel p-3">
              <label className="block text-sm font-bold text-pin-muted">
                {tool === 'polygon'
                  ? `${COPY.vector.sides}: ${polygonSides}`
                  : `${COPY.vector.tips}: ${starTips}`}
                <input
                  type="range"
                  min={3}
                  max={12}
                  step={1}
                  value={tool === 'polygon' ? polygonSides : starTips}
                  onChange={(event) =>
                    tool === 'polygon'
                      ? setPolygonSides(Number(event.target.value))
                      : setStarTips(Number(event.target.value))
                  }
                  className="mt-1 w-full accent-pin-accent"
                />
              </label>
            </section>
          ) : null}

          {selected.length > 0 ? (
            <section className="pin-panel flex flex-col gap-2 p-3">
              <div className="flex flex-wrap justify-center gap-1">
                <ToolButton
                  icon={FlipHorizontal2}
                  label={COPY.tools.flipH}
                  onClick={() => flipSelected('h')}
                />
                <ToolButton
                  icon={FlipVertical2}
                  label={COPY.tools.flipV}
                  onClick={() => flipSelected('v')}
                />
                <ToolButton
                  icon={BringToFront}
                  label={COPY.vector.toFront}
                  disabled={!single}
                  onClick={() => moveOrder('front')}
                />
                <ToolButton
                  icon={ChevronsUp}
                  label={COPY.vector.forward}
                  disabled={!single}
                  onClick={() => moveOrder(1)}
                />
                <ToolButton
                  icon={ChevronsDown}
                  label={COPY.vector.backward}
                  disabled={!single}
                  onClick={() => moveOrder(-1)}
                />
                <ToolButton
                  icon={SendToBack}
                  label={COPY.vector.toBack}
                  disabled={!single}
                  onClick={() => moveOrder('back')}
                />
                {selected.length >= 2 ? (
                  <ToolButton icon={Group} label={COPY.vector.group} onClick={groupSelected} />
                ) : null}
                {selected.some((s) => s.groupId) ? (
                  <ToolButton
                    icon={Ungroup}
                    label={COPY.vector.ungroup}
                    onClick={ungroupSelected}
                  />
                ) : null}
                <ToolButton icon={Copy} label={COPY.vector.duplicate} onClick={duplicateSelected} />
                <ToolButton icon={Trash2} label={COPY.vector.remove} onClick={removeSelected} />
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
