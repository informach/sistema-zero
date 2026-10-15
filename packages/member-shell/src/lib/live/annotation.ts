/**
 * Desenho sobre a tela da sala ao vivo: o MODELO, sem DOM.
 *
 * A professora desenha sobre a demonstração (ou num quadro branco) e o desenho entra na própria
 * imagem transmitida. Aqui ficam as formas guardadas como VETOR (para redesenhar a cada quadro e
 * desfazer), a régua de desfazer, a borracha, a conversão da prévia para o quadro do compositor,
 * a luz mágica que some sozinha e os atalhos de teclado. Quem desenha de fato é
 * `screen-annotation.ts`.
 */

export type AnnotationTool =
  | 'pen'
  | 'highlighter'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'eraser'
  | 'laser'
export type AnnotationSurface = 'screen' | 'board'
export type AnnotationBoardTheme = 'light' | 'dark'
export type AnnotationWidth = 'thin' | 'medium' | 'thick'

export interface AnnotationPoint {
  x: number
  y: number
}
export interface AnnotationRect {
  left: number
  top: number
  width: number
  height: number
}
export interface AnnotationSize {
  width: number
  height: number
}

interface ShapeBase {
  id: string
  color: string
}
export interface AnnotationStroke extends ShapeBase {
  kind: 'pen' | 'highlighter'
  width: number
  points: readonly AnnotationPoint[]
}
export interface AnnotationDragShape extends ShapeBase {
  kind: 'arrow' | 'rect' | 'ellipse'
  width: number
  from: AnnotationPoint
  to: AnnotationPoint
}
export interface AnnotationText extends ShapeBase {
  kind: 'text'
  size: number
  /** Canto de cima à esquerda do texto. */
  at: AnnotationPoint
  text: string
  /** Largura medida no compositor (a borracha usa a caixa do texto). */
  textWidth: number
}
export type AnnotationShape = AnnotationStroke | AnnotationDragShape | AnnotationText

/** Poucas cores fortes, que aparecem sobre qualquer tela. */
export const ANNOTATION_COLORS = [
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#facc15', label: 'Amarelo' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#ffffff', label: 'Branco' },
  { value: '#111827', label: 'Preto' },
] as const

/** Espessuras em pixels do COMPOSITOR (a tela tem até 1920 de largura). */
export const ANNOTATION_WIDTHS: Record<
  AnnotationWidth,
  { label: string; stroke: number; text: number }
> = {
  thin: { label: 'Fina', stroke: 4, text: 28 },
  medium: { label: 'Média', stroke: 8, text: 40 },
  thick: { label: 'Grossa', stroke: 14, text: 56 },
}
/** O marca-texto é largo e translúcido. */
export const HIGHLIGHTER_SCALE = 3.5
export const HIGHLIGHTER_ALPHA = 0.35

export const BOARD_BACKGROUND: Record<AnnotationBoardTheme, string> = {
  light: '#ffffff',
  dark: '#1e293b',
}

export function strokeWidthFor(tool: AnnotationTool, width: AnnotationWidth): number {
  const base = ANNOTATION_WIDTHS[width].stroke
  return tool === 'highlighter' ? base * HIGHLIGHTER_SCALE : base
}

// --- Camada: formas + desfazer ---------------------------------------------------------------

/**
 * Uma superfície (a tela ou o quadro) com as formas e as versões anteriores. Imutável: desfazer é
 * voltar para a versão anterior, seja ela uma forma nova, uma passada de borracha ou o "limpar
 * tudo" (os três desfazem do mesmo jeito).
 */
export interface AnnotationLayer {
  readonly shapes: readonly AnnotationShape[]
  readonly history: readonly (readonly AnnotationShape[])[]
}
export const EMPTY_LAYER: AnnotationLayer = { shapes: [], history: [] }
/** Quantos passos o desfazer alcança. */
export const HISTORY_LIMIT = 100

function remember(
  history: AnnotationLayer['history'],
  shapes: readonly AnnotationShape[],
): AnnotationLayer['history'] {
  const next = [...history, shapes]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

export function addShape(layer: AnnotationLayer, shape: AnnotationShape): AnnotationLayer {
  return { shapes: [...layer.shapes, shape], history: remember(layer.history, layer.shapes) }
}

export function undoLayer(layer: AnnotationLayer): AnnotationLayer {
  const previous = layer.history.at(-1)
  if (!previous) return layer
  return { shapes: previous, history: layer.history.slice(0, -1) }
}

export function clearLayer(layer: AnnotationLayer): AnnotationLayer {
  if (!layer.shapes.length) return layer
  return { shapes: [], history: remember(layer.history, layer.shapes) }
}

/** Uma passada de borracha inteira (apertar, arrastar, soltar) é UM passo do desfazer. */
export function commitErase(
  layer: AnnotationLayer,
  before: readonly AnnotationShape[],
): AnnotationLayer {
  if (layer.shapes === before) return layer
  return { shapes: layer.shapes, history: remember(layer.history, before) }
}

/** As formas que sobram depois de a borracha tocar `point`. Nada tocado devolve a MESMA lista. */
export function eraseAt(
  shapes: readonly AnnotationShape[],
  point: AnnotationPoint,
  radius: number,
): readonly AnnotationShape[] {
  const kept = shapes.filter((shape) => distanceToShape(shape, point) > radius + reach(shape))
  return kept.length === shapes.length ? shapes : kept
}

/** O raio da borracha, em pixels do compositor. */
export const ERASER_RADIUS = 14

// --- Geometria -------------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const distance = (a: AnnotationPoint, b: AnnotationPoint) => Math.hypot(a.x - b.x, a.y - b.y)

export function distanceToSegment(
  point: AnnotationPoint,
  a: AnnotationPoint,
  b: AnnotationPoint,
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  if (!length2) return distance(point, a)
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / length2, 0, 1)
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy })
}

function distanceToPolyline(point: AnnotationPoint, points: readonly AnnotationPoint[]): number {
  const first = points[0]
  if (!first) return Number.POSITIVE_INFINITY
  if (points.length === 1) return distance(point, first)
  let best = Number.POSITIVE_INFINITY
  for (let index = 1; index < points.length; index++)
    best = Math.min(best, distanceToSegment(point, points[index - 1]!, points[index]!))
  return best
}

export function rectOutline(from: AnnotationPoint, to: AnnotationPoint): AnnotationPoint[] {
  return [
    { x: from.x, y: from.y },
    { x: to.x, y: from.y },
    { x: to.x, y: to.y },
    { x: from.x, y: to.y },
    { x: from.x, y: from.y },
  ]
}

/** A elipse inscrita no retângulo do arrasto, como polígono fechado (para a borracha). */
export function ellipseOutline(
  from: AnnotationPoint,
  to: AnnotationPoint,
  segments = 48,
): AnnotationPoint[] {
  const cx = (from.x + to.x) / 2
  const cy = (from.y + to.y) / 2
  const rx = Math.abs(to.x - from.x) / 2
  const ry = Math.abs(to.y - from.y) / 2
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
  })
}

/** As duas pontas e a ponta da cabeça da seta: [esquerda, ponta, direita]. */
export function arrowHead(
  from: AnnotationPoint,
  to: AnnotationPoint,
  width: number,
): [AnnotationPoint, AnnotationPoint, AnnotationPoint] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const length = Math.max(18, width * 4)
  const spread = Math.PI / 7
  return [
    {
      x: to.x - length * Math.cos(angle - spread),
      y: to.y - length * Math.sin(angle - spread),
    },
    { x: to.x, y: to.y },
    {
      x: to.x - length * Math.cos(angle + spread),
      y: to.y - length * Math.sin(angle + spread),
    },
  ]
}

export function textBox(shape: AnnotationText): AnnotationRect {
  return {
    left: shape.at.x,
    top: shape.at.y,
    width: shape.textWidth || shape.text.length * shape.size * 0.6,
    height: shape.size * 1.25,
  }
}

/** Metade da espessura: tocar a borda do traço já vale. */
function reach(shape: AnnotationShape): number {
  return shape.kind === 'text' ? 0 : shape.width / 2
}

export function distanceToShape(shape: AnnotationShape, point: AnnotationPoint): number {
  switch (shape.kind) {
    case 'pen':
    case 'highlighter':
      return distanceToPolyline(point, shape.points)
    case 'rect':
      return distanceToPolyline(point, rectOutline(shape.from, shape.to))
    case 'ellipse':
      return distanceToPolyline(point, ellipseOutline(shape.from, shape.to))
    case 'arrow': {
      const [left, tip, right] = arrowHead(shape.from, shape.to, shape.width)
      return Math.min(
        distanceToSegment(point, shape.from, shape.to),
        distanceToSegment(point, left, tip),
        distanceToSegment(point, right, tip),
      )
    }
    case 'text': {
      const box = textBox(shape)
      const dx = Math.max(box.left - point.x, 0, point.x - (box.left + box.width))
      const dy = Math.max(box.top - point.y, 0, point.y - (box.top + box.height))
      return Math.hypot(dx, dy)
    }
  }
}

/** Arrasto curto demais (um clique sem querer) não vira forma. */
export const MIN_DRAG = 4

export function isMeaningfulShape(shape: AnnotationShape): boolean {
  switch (shape.kind) {
    case 'pen':
    case 'highlighter':
      return shape.points.length > 0
    case 'arrow':
      return distance(shape.from, shape.to) >= MIN_DRAG * 2
    case 'rect':
    case 'ellipse':
      return (
        Math.abs(shape.to.x - shape.from.x) >= MIN_DRAG &&
        Math.abs(shape.to.y - shape.from.y) >= MIN_DRAG
      )
    case 'text':
      return shape.text.trim().length > 0
  }
}

/** Traço guarda um ponto só quando a caneta andou; o teto evita um traço sem fim. */
export const MIN_POINT_DISTANCE = 1.5
export const MAX_STROKE_POINTS = 4000

export function shouldAppendPoint(
  points: readonly AnnotationPoint[],
  point: AnnotationPoint,
): boolean {
  if (points.length >= MAX_STROKE_POINTS) return false
  const last = points.at(-1)
  return !last || distance(last, point) >= MIN_POINT_DISTANCE
}

/**
 * Pontos entre `from` e `to` a cada `step` (sem `from`, com `to`): a borracha arrastada depressa
 * não pula a forma que ficou entre dois eventos do mouse.
 */
export function pointsAlong(
  from: AnnotationPoint,
  to: AnnotationPoint,
  step: number,
): AnnotationPoint[] {
  const steps = Math.max(1, Math.ceil(distance(from, to) / Math.max(1, step)))
  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
  })
}

// --- Prévia ⇄ compositor ---------------------------------------------------------------------

/** Onde a imagem aparece dentro da caixa da prévia (`object-fit: contain`, com faixas). */
export function containedBox(box: AnnotationRect, size: AnnotationSize): AnnotationRect {
  if (!size.width || !size.height || !box.width || !box.height)
    return { left: box.left, top: box.top, width: 0, height: 0 }
  const scale = Math.min(box.width / size.width, box.height / size.height)
  const width = size.width * scale
  const height = size.height * scale
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  }
}

/**
 * Do ponto do mouse (coordenadas da página) para o pixel do compositor. Fora da imagem (nas
 * faixas) o ponto fica preso à borda e `inside` diz que começou fora.
 */
export function toCanvasPoint(
  client: AnnotationPoint,
  box: AnnotationRect,
  size: AnnotationSize,
): AnnotationPoint & { inside: boolean } {
  const content = containedBox(box, size)
  if (!content.width || !content.height) return { x: 0, y: 0, inside: false }
  const x = ((client.x - content.left) / content.width) * size.width
  const y = ((client.y - content.top) / content.height) * size.height
  return {
    x: clamp(x, 0, size.width),
    y: clamp(y, 0, size.height),
    inside: x >= 0 && y >= 0 && x <= size.width && y <= size.height,
  }
}

/** O caminho de volta: do pixel do compositor para a posição dentro da caixa da prévia. */
export function toBoxPoint(
  point: AnnotationPoint,
  box: AnnotationRect,
  size: AnnotationSize,
): AnnotationPoint {
  const content = containedBox(box, size)
  if (!size.width || !size.height) return { x: 0, y: 0 }
  return {
    x: content.left - box.left + (point.x / size.width) * content.width,
    y: content.top - box.top + (point.y / size.height) * content.height,
  }
}

/** Quanto um pixel do compositor mede na prévia (para o campo de texto ter o tamanho certo). */
export function previewScale(box: AnnotationRect, size: AnnotationSize): number {
  const content = containedBox(box, size)
  return size.width ? content.width / size.width : 1
}

// --- Luz mágica ------------------------------------------------------------------------------

/** O rastro da luz mágica some sozinho neste tempo. */
export const LASER_TTL_MS = 1000

export interface LaserPoint extends AnnotationPoint {
  at: number
  /** Pontos do mesmo rastro se ligam; levantar o dedo ou sair da prévia começa outro. */
  trail: number
  color: string
}

/** Só o que ainda brilha. Nada expirado devolve a MESMA lista. */
export function liveLaser(
  points: readonly LaserPoint[],
  now: number,
  ttl = LASER_TTL_MS,
): readonly LaserPoint[] {
  const first = points.findIndex((point) => now - point.at < ttl)
  if (first === 0) return points
  return first === -1 ? [] : points.slice(first)
}

/** 1 quando acabou de passar, 0 quando sumiu. */
export function laserFade(point: LaserPoint, now: number, ttl = LASER_TTL_MS): number {
  return clamp(1 - (now - point.at) / ttl, 0, 1)
}

// --- Atalhos ---------------------------------------------------------------------------------

export const TOOL_SHORTCUTS: Record<AnnotationTool, string> = {
  pen: 'P',
  highlighter: 'M',
  arrow: 'A',
  rect: 'R',
  ellipse: 'C',
  text: 'T',
  eraser: 'E',
  laser: 'L',
}
/** Alterna entre a tela e o quadro branco. */
export const SURFACE_SHORTCUT = 'Q'

export type AnnotationCommand =
  | { type: 'tool'; tool: AnnotationTool }
  | { type: 'undo' }
  | { type: 'exit' }
  | { type: 'surface' }

export function annotationShortcut(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}): AnnotationCommand | null {
  const key = event.key.toLowerCase()
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key === 'z')
    return { type: 'undo' }
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  if (key === 'escape') return { type: 'exit' }
  if (key === SURFACE_SHORTCUT.toLowerCase()) return { type: 'surface' }
  const tool = (Object.keys(TOOL_SHORTCUTS) as AnnotationTool[]).find(
    (item) => TOOL_SHORTCUTS[item].toLowerCase() === key,
  )
  return tool ? { type: 'tool', tool } : null
}
