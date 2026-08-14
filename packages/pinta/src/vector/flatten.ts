/**
 * A forma vira ANÉIS de pontos, com a rotação já ASSADA nas coordenadas.
 *
 * É o degrau entre o `VectorShape` (que o editor conhece) e o clipper (que só
 * sabe de números). Duas coisas moram aqui e em nenhum outro lugar: a régua de
 * quantos segmentos um arco precisa, e o pivô da rotação.
 */
import { boundsCenter, parsePathD, rotatePoint, shapeBounds } from './geometry'
import type { Vec2, VectorShape } from './model'
import type { Poly, Ring } from './polygonClip'

/**
 * Erro máximo entre a curva de verdade e a polilinha, em unidades do desenho.
 *
 * ⭐ NÃO é chute, e as duas contas batem no mesmo número: o export re-renderiza
 * o vetor em ×4 (meio pixel de tela ⇒ tolerância ≤ 0.5/4 = 0.125) e o editor
 * chega a ×16 (dois pixels de tela ⇒ ≤ 2/16 = 0.125). 0.1 dá margem.
 *
 * O que sai disso: círculo de 100px = 50 segmentos (~700 chars de `d`), de
 * 32px = 29, e o teto de 128px do quadro de personagem = 57.
 */
export const CHORD_TOLERANCE = 0.1

/** Uma cúbica nunca vira mais que isto, por mais torta que seja. */
const MAX_CUBIC_SEGMENTS = 64

export type FlattenRefusal = 'no-area' | 'unsupported-shape' | 'bad-path'

export type FlattenResult = { ok: true; poly: Poly } | { ok: false; reason: FlattenRefusal }

/**
 * Quantos segmentos um arco precisa para a SAGITA caber na tolerância.
 *
 * A sagita de um passo Δθ num raio r é no máximo r·Δθ²/8, logo
 * Δθ ≤ √(8·tol/r). Uma fórmula só serve círculo e elipse (usando o raio MAIOR,
 * que é onde a curvatura aperta).
 */
export function arcSegments(radius: number, sweep: number, tolerance: number): number {
  const r = Math.max(Math.abs(radius), tolerance)
  return Math.max(1, Math.ceil(Math.abs(sweep) / Math.sqrt((8 * tolerance) / r)))
}

/**
 * Quantos segmentos uma cúbica precisa: |B - polilinha| ≤ max|B''|/(8n²), com
 * max|B''| = 6·max(|p0-2p1+p2|, |p1-2p2+p3|).
 */
export function cubicSegments(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, tolerance: number): number {
  const ax = p0.x - 2 * p1.x + p2.x
  const ay = p0.y - 2 * p1.y + p2.y
  const bx = p1.x - 2 * p2.x + p3.x
  const by = p1.y - 2 * p2.y + p3.y
  const worst = Math.max(Math.hypot(ax, ay), Math.hypot(bx, by))
  if (worst === 0) return 1
  const n = Math.ceil(Math.sqrt((3 * worst) / (4 * tolerance)))
  return Math.min(Math.max(n, 1), MAX_CUBIC_SEGMENTS)
}

function cubicAt(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  }
}

/** Tira ponto repetido e fecha o contrato do anel (o primeiro não se repete). */
function cleanRing(points: Vec2[]): Ring | null {
  const out: Vec2[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.x - p.x) < 1e-6 && Math.abs(last.y - p.y) < 1e-6) continue
    out.push(p)
  }
  const first = out[0]
  const last = out[out.length - 1]
  if (
    first &&
    last &&
    out.length > 1 &&
    Math.abs(last.x - first.x) < 1e-6 &&
    Math.abs(last.y - first.y) < 1e-6
  ) {
    out.pop()
  }
  return out.length >= 3 ? out : null
}

function rectRing(shape: Extract<VectorShape, { type: 'rect' }>, tolerance: number): Vec2[] {
  const x = Math.min(shape.x, shape.x + shape.w)
  const y = Math.min(shape.y, shape.y + shape.h)
  const w = Math.abs(shape.w)
  const h = Math.abs(shape.h)
  const r = Math.min(Math.max(shape.rx, 0), Math.min(w, h) / 2)
  if (r <= 0) {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
  }
  // Quatro quartos de círculo nos cantos, na MESMA ordem do canto reto (o
  // sentido tem que bater, senão a área sai com o sinal trocado).
  const steps = arcSegments(r, Math.PI / 2, tolerance)
  const cantos: Array<{ cx: number; cy: number; from: number }> = [
    { cx: x + w - r, cy: y + r, from: -Math.PI / 2 },
    { cx: x + w - r, cy: y + h - r, from: 0 },
    { cx: x + r, cy: y + h - r, from: Math.PI / 2 },
    { cx: x + r, cy: y + r, from: Math.PI },
  ]
  const points: Vec2[] = []
  for (const canto of cantos) {
    for (let i = 0; i <= steps; i += 1) {
      const ang = canto.from + (Math.PI / 2) * (i / steps)
      points.push({ x: canto.cx + Math.cos(ang) * r, y: canto.cy + Math.sin(ang) * r })
    }
  }
  return points
}

function ellipseRing(shape: Extract<VectorShape, { type: 'ellipse' }>, tolerance: number): Vec2[] {
  const rx = Math.abs(shape.rx)
  const ry = Math.abs(shape.ry)
  const steps = arcSegments(Math.max(rx, ry), Math.PI * 2, tolerance)
  const points: Vec2[] = []
  // Começa no topo e cresce, que é a convenção do `makePolygon`: assim o anel
  // gira no mesmo sentido de uma estrela desenhada ao lado.
  for (let i = 0; i < steps; i += 1) {
    const ang = -Math.PI / 2 + (Math.PI * 2 * i) / steps
    points.push({ x: shape.cx + Math.cos(ang) * rx, y: shape.cy + Math.sin(ang) * ry })
  }
  return points
}

/**
 * Anéis de um `d` do nosso dialeto. Vários `M` são NORMAIS aqui: é assim que um
 * resultado de mistura (com furo) volta a ser operando.
 *
 * Caminho ABERTO é fechado implicitamente, que é exatamente o que o SVG faz ao
 * PINTAR um path aberto: a área considerada é a mesma que a criança vê.
 */
function pathRings(d: string, tolerance: number): Vec2[][] | null {
  const parsed = parsePathD(d)
  if (!parsed) return null
  const rings: Vec2[][] = []
  let current: Vec2[] | null = null
  let cursor: Vec2 = { x: 0, y: 0 }

  for (const command of parsed.commands) {
    const op = command.op.toUpperCase()
    const c = command.coords
    if (op === 'M') {
      if (c.length < 2) return null
      if (current && current.length > 0) rings.push(current)
      cursor = { x: c[0] ?? 0, y: c[1] ?? 0 }
      current = [cursor]
      // Um `M` com pares extras vale como `L` implícito (o SVG manda assim).
      for (let i = 2; i + 1 < c.length; i += 2) {
        cursor = { x: c[i] ?? 0, y: c[i + 1] ?? 0 }
        current.push(cursor)
      }
    } else if (op === 'L') {
      if (!current) return null
      for (let i = 0; i + 1 < c.length; i += 2) {
        cursor = { x: c[i] ?? 0, y: c[i + 1] ?? 0 }
        current.push(cursor)
      }
    } else if (op === 'C') {
      if (!current) return null
      for (let i = 0; i + 5 < c.length; i += 6) {
        const p1 = { x: c[i] ?? 0, y: c[i + 1] ?? 0 }
        const p2 = { x: c[i + 2] ?? 0, y: c[i + 3] ?? 0 }
        const p3 = { x: c[i + 4] ?? 0, y: c[i + 5] ?? 0 }
        const steps = cubicSegments(cursor, p1, p2, p3, tolerance)
        for (let s = 1; s <= steps; s += 1) current.push(cubicAt(cursor, p1, p2, p3, s / steps))
        cursor = p3
      }
    } else if (op === 'Z') {
      if (current && current.length > 0) {
        rings.push(current)
        const first = current[0]
        if (first) cursor = first
      }
      current = null
    }
  }
  if (current && current.length > 0) rings.push(current)
  return rings
}

/**
 * A forma achatada em anéis, prontos para o clipper.
 *
 * ⚠️ A ROTAÇÃO é assada aqui, e o pivô é `boundsCenter(shapeBounds(shape))` —
 * a MESMA conta que o `svg.ts` usa para emitir o `rotate()`. Chamar as mesmas
 * funções é o que garante que a mistura bata com o que a criança vê, inclusive
 * no caso torto em que o `shapeBounds` de um traço inclui pontos de controle.
 * Bug por bug com o render é o comportamento CERTO aqui.
 */
export function shapeToPoly(shape: VectorShape, tolerance = CHORD_TOLERANCE): FlattenResult {
  let bruto: Vec2[][]
  switch (shape.type) {
    case 'rect':
      bruto = [rectRing(shape, tolerance)]
      break
    case 'ellipse':
      bruto = [ellipseRing(shape, tolerance)]
      break
    case 'polygon':
      bruto = [shape.points.map((p) => ({ x: p.x, y: p.y }))]
      break
    case 'path': {
      const rings = pathRings(shape.d, tolerance)
      if (!rings) return { ok: false, reason: 'bad-path' }
      bruto = rings
      break
    }
    case 'line':
      // Uma linha não tem miolo: não há o que recortar nem o que juntar.
      return { ok: false, reason: 'no-area' }
    default:
      // Texto e figura. Texto pediria o contorno das letras (decodificar WOFF2
      // e ler os glifos), e figura é imagem: nenhuma das duas tem contorno aqui.
      return { ok: false, reason: 'unsupported-shape' }
  }

  const pivot = shape.rotation === 0 ? null : boundsCenter(shapeBounds(shape))
  const poly: Poly = []
  for (const ring of bruto) {
    const girado = pivot ? ring.map((p) => rotatePoint(p, pivot, shape.rotation)) : ring
    const limpo = cleanRing(girado)
    if (limpo) poly.push(limpo)
  }
  return poly.length > 0 ? { ok: true, poly } : { ok: false, reason: 'no-area' }
}

/** Quantos pontos a forma vai custar (o orçamento do teto de caracteres). */
export function polyPointCount(poly: Poly): number {
  return poly.reduce((sum, ring) => sum + ring.length, 0)
}
