/**
 * Geometria PURA da fita do Mapa da Carreira (`/cursos`).
 *
 * Coordenadas num espaço de viewBox NORMALIZADO: `x ∈ [0,100]` (mapeado p/ a largura
 * do container) e `y ∈ [0, count*ROW]` (mapeado p/ a altura). O componente posiciona
 * os medalhões no MESMO espaço (`left: x%`, `top: y/height%`) e o `<svg>` usa
 * `preserveAspectRatio="none"`, então a fita e os nós casam em QUALQUER largura. A fita
 * é traçada com `vector-effect: non-scaling-stroke` (espessura constante em px, sem
 * distorção horizontal). Sem React/DOM aqui — módulo testável.
 */

export interface CareerPoint {
  x: number
  y: number
}

/**
 * Colunas do serpenteado (offset horizontal por nó). Consecutivos SEMPRE diferem →
 * a curva vira um "S" suave e REGULAR: a distância entre nós é a mesma p/ TODOS os
 * pares (inclusive o último, a Lenda — antes ele voltava ao centro e ficava perto
 * demais do penúltimo).
 */
export const CAREER_OFFSETS = [-1, 1, -1, 1, -1, 1, -1, 1] as const

/** % da largura por unidade de offset (metade da amplitude do zigue-zague). */
export const CAREER_STEP = 16
/** Unidades de viewBox por linha (só escala relativa; a altura real vem do `--career-row`). */
export const CAREER_ROW = 100

export interface CareerGradientStop {
  /** Fração 0..1 ao longo do trecho percorrido. */
  offset: number
  /** Índice do nível (→ cor `--level-<slug>` via `LEVEL_ORDER[index]`). */
  index: number
}

export interface CareerGeometry {
  points: CareerPoint[]
  viewWidth: number
  viewHeight: number
  /** `d` da fita inteira (trilha completa, apagada). */
  fullPath: string
  /** `d` da fita percorrida (nós `0..atual`); vazio quando ainda no começo. */
  traveledPath: string
  gradientStops: CareerGradientStop[]
}

function pointAt(index: number): CareerPoint {
  const offset = CAREER_OFFSETS[index % CAREER_OFFSETS.length] ?? 0
  return { x: 50 + offset * CAREER_STEP, y: (index + 0.5) * CAREER_ROW }
}

/** Curva suave: bézier cúbica com os controles no meio vertical de cada segmento. */
function smoothPath(points: readonly CareerPoint[]): string {
  const first = points[0]
  if (!first) return ''
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < points.length; i += 1) {
    const p0 = points[i - 1]!
    const p1 = points[i]!
    const midY = (p0.y + p1.y) / 2
    d += ` C ${p0.x} ${midY} ${p1.x} ${midY} ${p1.x} ${p1.y}`
  }
  return d
}

/**
 * Monta a geometria da fita p/ `count` níveis, com o nível ATUAL em `currentIndex`
 * (a fita colorida vai de 0 até ele). `currentIndex` é fixado no intervalo válido.
 */
export function buildCareerGeometry(count: number, currentIndex: number): CareerGeometry {
  const points = Array.from({ length: Math.max(count, 0) }, (_, i) => pointAt(i))
  const current = Math.min(Math.max(currentIndex, 0), Math.max(points.length - 1, 0))
  const traveled = points.slice(0, current + 1)
  const start = traveled[0]
  const end = traveled.at(-1)
  const span = start && end ? end.y - start.y : 0
  const gradientStops: CareerGradientStop[] =
    traveled.length > 1 && start && span > 0
      ? traveled.map((point, index) => ({ offset: (point.y - start.y) / span, index }))
      : []
  return {
    points,
    viewWidth: 100,
    viewHeight: Math.max(points.length, 1) * CAREER_ROW,
    fullPath: smoothPath(points),
    traveledPath: current > 0 ? smoothPath(traveled) : '',
    gradientStops,
  }
}
