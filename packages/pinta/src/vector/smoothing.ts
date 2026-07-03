/**
 * O pincel SUAVIZADO do desenho livre (referência: editor do Scratch):
 * polyline crua do arrasto → simplificação Ramer-Douglas-Peucker → spline
 * Catmull-Rom convertida em cubic béziers → `d` (M/C absolutos, o formato que
 * a geometria sabe mover/escalar). Tudo puro.
 */
import { MAX_PATH_CHARS, type Vec2 } from './model'

/** Distância ponto→segmento (RDP). */
function pointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq
  t = Math.min(Math.max(t, 0), 1)
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Ramer-Douglas-Peucker iterativo (pilha explícita). */
export function simplifyRDP(points: Vec2[], epsilon = 1.5): Vec2[] {
  if (points.length <= 2) return points
  const keep = new Array<boolean>(points.length).fill(false)
  const first = 0
  const last = points.length - 1
  keep[first] = true
  keep[last] = true
  const stack: Array<[number, number]> = [[first, last]]
  while (stack.length > 0) {
    const range = stack.pop()
    if (!range) break
    const [start, end] = range
    const a = points[start]
    const b = points[end]
    if (!a || !b) continue
    let maxDistance = 0
    let index = -1
    for (let i = start + 1; i < end; i += 1) {
      const p = points[i]
      if (!p) continue
      const distance = pointToSegment(p, a, b)
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (index !== -1 && maxDistance > epsilon) {
      keep[index] = true
      stack.push([start, index], [index, end])
    }
  }
  return points.filter((_, i) => keep[i])
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Catmull-Rom (uniforme) → cubic béziers. Cada segmento P1→P2 usa os vizinhos
 * P0/P3 como tangentes; extremos duplicam a ponta.
 */
export function catmullRomToPath(points: Vec2[]): string {
  if (points.length === 0) return ''
  const first = points[0]
  if (!first) return ''
  if (points.length === 1) {
    // Um toque: um traço mínimo (pontinho visível com stroke round).
    return `M ${round2(first.x)} ${round2(first.y)} L ${round2(first.x + 0.01)} ${round2(first.y)}`
  }
  let d = `M ${round2(first.x)} ${round2(first.y)}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    if (!p0 || !p1 || !p2 || !p3) continue
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C ${round2(c1.x)} ${round2(c1.y)} ${round2(c2.x)} ${round2(c2.y)} ${round2(p2.x)} ${round2(p2.y)}`
  }
  return d
}

/** O pipeline completo do pincel: pontos crus do arrasto → `d` suavizado. */
export function smoothStrokeToPath(points: Vec2[], epsilon = 1.5): string {
  return catmullRomToPath(simplifyRDP(points, epsilon))
}

/**
 * Teto de pontos crus que entram no RDP. O RDP é O(n²) no pior caso
 * (zigue-zague denso onde nada é descartável) — sem o teto, o soltar do
 * pincel trava por SEGUNDOS num rabisco longo em aparelho lento. 1500 pontos
 * são dezenas de segundos de arrasto; a Catmull-Rom passa por cima da
 * decimação sem perda visível.
 */
const MAX_RAW_POINTS = 1500

/** Decimação por passo fixo (O(n)), sempre preservando a última ponta. */
function decimate(points: Vec2[], maxPoints: number): Vec2[] {
  if (points.length <= maxPoints) return points
  const stride = Math.ceil(points.length / maxPoints)
  return points.filter((_, i) => i % stride === 0 || i === points.length - 1)
}

/**
 * Como `smoothStrokeToPath`, mas GARANTE `d.length <= maxChars` simplificando
 * mais agressivamente quando preciso. Sem isso um rabisco longo estoura o
 * `MAX_PATH_CHARS` do sanitize e o traço é salvo mas DESCARTADO no próximo
 * load — perda silenciosa de desenho.
 */
export function smoothStrokeToPathCapped(
  points: Vec2[],
  epsilon = 1.5,
  maxChars = MAX_PATH_CHARS,
): string {
  let eps = epsilon
  // Re-simplifica sempre o conjunto JÁ simplificado (encolhe monotonicamente):
  // o loop só roda em traço patológico e não re-paga o RDP cheio por dobrada.
  let simplified = simplifyRDP(decimate(points, MAX_RAW_POINTS), eps)
  let d = catmullRomToPath(simplified)
  while (d.length > maxChars && eps < 2048) {
    eps *= 2
    simplified = simplifyRDP(simplified, eps)
    d = catmullRomToPath(simplified)
  }
  if (d.length > maxChars) {
    // Último recurso (traço patológico): decima por passo fixo.
    d = catmullRomToPath(simplifyRDP(decimate(simplified, 250), eps))
  }
  return d
}
