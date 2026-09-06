/**
 * Hit-test GEOMÉTRICO do palco: qual forma está sob o toque olhando a GEOMETRIA
 * de verdade, e não só a caixa (bbox). É a régua do "mover antes do laço" da
 * ferramenta Selecionar: pressionar no miolo VAZIO de uma forma vazada (traço do
 * pincel com `fill: 'none'`, círculo "sem cor" por dentro, polilinha) tem que
 * abrir o laço, e só pressionar EM CIMA do contorno (com a folga do toque) move a
 * forma.
 *
 * Regras, varrendo do topo para baixo:
 * - escondida e trancada NÃO contam, e a trancada nunca BLOQUEIA: a varredura
 *   continua e a forma livre embaixo dela segue tocável (para o mouse a trancada
 *   não está ali; selecionar trancada é gesto do painel Camadas);
 * - forma com PREENCHIMENTO (cor ou degradê; figura e texto sempre) acerta quando
 *   o ponto cai dentro da caixa girada, alargada pela folga e por metade do
 *   contorno; o círculo usa a equação da elipse, não a caixa;
 * - forma SÓ de contorno acerta quando a distância do ponto ao contorno cabe na
 *   folga mais metade da espessura: os lados do retângulo, a elipse amostrada em
 *   32 pontos, o segmento da linha, as arestas do polígono e o `d` do traço
 *   achatado em segmentos com a mesma tolerância usada pela geometria vetorial.
 *
 * O conta-gotas continua com o `hitShapeAt` da caixa (`pickColor.ts`): pegar cor
 * é leitura, trancada conta, e a caixa generosa é o que se quer lá.
 */
import { CHORD_TOLERANCE, flattenPathD } from './flatten'
import { shapeBounds } from './geometry'
import type { Vec2, VectorShape } from './model'
import { boundsContains, inflate, localPoint, paintsSomething } from './pickColor'

/** Quantos pontos da elipse entram na polilinha que aproxima o contorno dela. */
const ELLIPSE_SAMPLES = 32

/** Tem miolo pintado? Figura e texto sempre; linha nunca; o resto pelo `fill`. */
function hasFill(shape: VectorShape): boolean {
  if (shape.type === 'image' || shape.type === 'text') return true
  if (shape.type === 'line') return false
  return shape.fill !== 'none'
}

/** Distância do ponto ao segmento `a -> b` (pé da perpendicular preso ao segmento). */
function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.min(Math.max(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq, 0), 1)
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Menor distância do ponto a uma polilinha (`closed` = o último volta ao primeiro). */
function distanceToPolyline(p: Vec2, points: readonly Vec2[], closed: boolean): number {
  const first = points[0]
  if (!first) return Number.POSITIVE_INFINITY
  if (points.length === 1) return Math.hypot(p.x - first.x, p.y - first.y)
  let best = Number.POSITIVE_INFINITY
  const segments = closed ? points.length : points.length - 1
  for (let i = 0; i < segments; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (!a || !b) continue
    best = Math.min(best, distanceToSegment(p, a, b))
  }
  return best
}

/** Os quatro cantos do retângulo (o raio dos cantos é ignorado: a folga cobre). */
function rectOutline(shape: Extract<VectorShape, { type: 'rect' }>): Vec2[] {
  return [
    { x: shape.x, y: shape.y },
    { x: shape.x + shape.w, y: shape.y },
    { x: shape.x + shape.w, y: shape.y + shape.h },
    { x: shape.x, y: shape.y + shape.h },
  ]
}

/** A elipse amostrada em `ELLIPSE_SAMPLES` pontos (polilinha fechada). */
function ellipseOutline(shape: Extract<VectorShape, { type: 'ellipse' }>): Vec2[] {
  const points: Vec2[] = []
  for (let i = 0; i < ELLIPSE_SAMPLES; i += 1) {
    const angle = (i / ELLIPSE_SAMPLES) * Math.PI * 2
    points.push({
      x: shape.cx + Math.cos(angle) * shape.rx,
      y: shape.cy + Math.sin(angle) * shape.ry,
    })
  }
  return points
}

/** O ponto (já no espaço local) cai dentro da elipse alargada por `by` em cada raio? */
function insideEllipse(
  shape: Extract<VectorShape, { type: 'ellipse' }>,
  local: Vec2,
  by: number,
): boolean {
  const rx = Math.abs(shape.rx) + by
  const ry = Math.abs(shape.ry) + by
  if (rx <= 0 || ry <= 0) return false
  const u = (local.x - shape.cx) / rx
  const v = (local.y - shape.cy) / ry
  return u * u + v * v <= 1
}

/** Menor distância do ponto (já no espaço local) ao contorno das formas de geometria fixa. */
function outlineDistance(
  shape: Extract<VectorShape, { type: 'rect' | 'ellipse' | 'line' | 'polygon' }>,
  local: Vec2,
): number {
  switch (shape.type) {
    case 'rect':
      return distanceToPolyline(local, rectOutline(shape), true)
    case 'ellipse':
      return distanceToPolyline(local, ellipseOutline(shape), true)
    case 'line':
      return distanceToSegment(local, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 })
    case 'polygon':
      return distanceToPolyline(local, shape.points, true)
  }
}

/**
 * A forma está sob o ponto? `slack` é a folga do toque, em unidades do documento;
 * a ela se soma metade do contorno, que pinta para fora da geometria. Não olha
 * `hidden`/`locked`: quem varre a lista decide isso.
 */
export function shapeHitAt(shape: VectorShape, point: Vec2, slack = 0): boolean {
  if (!paintsSomething(shape)) return false
  const bounds = shapeBounds(shape)
  const reach = Math.max(slack, 0) + (shape.stroke?.width ?? 0) / 2
  const local = localPoint(shape, bounds, point)
  // Fora da caixa alargada nem a geometria alcança: sai barato.
  if (!boundsContains(inflate(bounds, reach), local)) return false
  if (hasFill(shape)) {
    return shape.type === 'ellipse' ? insideEllipse(shape, local, reach) : true
  }
  if (shape.type === 'path') {
    const outlines = flattenPathD(shape.d, CHORD_TOLERANCE)
    // `d` fora do nosso formato (defensivo): a caixa decide, como antes.
    if (!outlines || outlines.length === 0) return true
    return outlines.some(
      (outline) => distanceToPolyline(local, outline.points, outline.closed) <= reach,
    )
  }
  if (shape.type === 'text' || shape.type === 'image') return true
  return outlineDistance(shape, local) <= reach
}

/**
 * A forma LIVRE mais ao topo sob o ponto, ou `null`. Escondida e trancada são
 * puladas SEM bloquear as de baixo. É o que a Selecionar consulta antes de abrir
 * o laço: forma aqui = MOVER.
 */
export function hitMovableShapeAt(
  shapes: readonly VectorShape[],
  point: Vec2,
  slack = 0,
): VectorShape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i]
    if (!shape || shape.hidden === true || shape.locked === true) continue
    if (shapeHitAt(shape, point, slack)) return shape
  }
  return null
}
