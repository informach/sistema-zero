/**
 * Modelo do desenho VETORIAL (asset `vector`). Só tipos + helpers puros de
 * validação — o editor/geometria/SVG vivem nos módulos irmãos (Fase 5).
 *
 * Os shapes são serializáveis (structured clone + JSON) e renderizam 1:1 como
 * elementos SVG reais, tanto no editor quanto no export.
 */
export interface Vec2 {
  x: number
  y: number
}

export interface VectorStroke {
  /** Cor hex `#rrggbb`. */
  color: string
  width: number
}

/** Degradê de 2 cores (linear com ângulo, ou radial). Cores hex, sem `'none'`. */
export interface VectorGradient {
  type: 'linear' | 'radial'
  /** Cor hex `#rrggbb` do começo (0%). */
  from: string
  /** Cor hex `#rrggbb` do fim (100%). */
  to: string
  /** Graus (só `linear`): 0 = →, 90 = ↓. Ignorado no radial. */
  angle: number
}

/** Preenchimento: cor sólida (hex ou `'none'`) OU degradê. */
export type VectorFill = string | VectorGradient

interface VectorShapeBase {
  id: string
  /** Cor sólida (`#rrggbb`/`'none'`) ou degradê. */
  fill: VectorFill
  /** `null` = sem contorno. */
  stroke: VectorStroke | null
  /** 0–1. */
  opacity: number
  /** Graus, em torno do centro do bounding box. */
  rotation: number
  /** Grupo: shapes com o MESMO id se movem/selecionam juntos. Ausente = solto. */
  groupId?: string
}

/** id do `<linearGradient>/<radialGradient>` de um shape (único = id do shape). */
export function gradientId(shapeId: string): string {
  return `pin-grad-${shapeId}`
}

export type VectorShape = VectorShapeBase &
  (
    | { type: 'rect'; x: number; y: number; w: number; h: number; rx: number }
    | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
    | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
    | { type: 'polygon'; points: Vec2[] }
    /** Pincel suavizado — o `d` já vem resolvido pelo smoothing. */
    | { type: 'path'; d: string }
    | { type: 'text'; x: number; y: number; text: string; fontSize: number }
  )

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function isVectorColor(value: unknown): value is string {
  return value === 'none' || (typeof value === 'string' && HEX_COLOR.test(value))
}

function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

export function isVectorGradient(value: unknown): value is VectorGradient {
  if (!value || typeof value !== 'object') return false
  const g = value as Record<string, unknown>
  return (g.type === 'linear' || g.type === 'radial') && isHex(g.from) && isHex(g.to)
}

/** Normaliza um preenchimento vindo de fonte não confiável; `null` = inválido. */
function sanitizeFill(raw: unknown): VectorFill | null {
  if (isVectorGradient(raw)) {
    return {
      type: raw.type,
      from: raw.from,
      to: raw.to,
      angle: isFiniteNumber(raw.angle) ? ((raw.angle % 360) + 360) % 360 : 90,
    }
  }
  return isVectorColor(raw) ? raw : null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isVec2(value: unknown): value is Vec2 {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return isFiniteNumber(v.x) && isFiniteNumber(v.y)
}

const MAX_TEXT_CHARS = 200
/** Teto do `d` do pincel — o sanitize DESCARTA acima disso; a criação (smoothing) capa antes. */
export const MAX_PATH_CHARS = 20_000
const MAX_POLYGON_POINTS = 64

/**
 * Valida um shape vindo de fonte não confiável (disco/import). Retorna o shape
 * normalizado ou `null` (descartar). Nunca lança.
 */
export function sanitizeVectorShape(raw: unknown): VectorShape | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (typeof s.id !== 'string' || !s.id) return null
  const fill = sanitizeFill(s.fill)
  if (fill === null) return null
  let stroke: VectorStroke | null = null
  if (s.stroke != null) {
    const st = s.stroke as Record<string, unknown>
    if (!isVectorColor(st.color) || st.color === 'none' || !isFiniteNumber(st.width)) return null
    stroke = { color: st.color, width: Math.min(Math.max(st.width, 0.5), 64) }
  }
  const opacity = isFiniteNumber(s.opacity) ? Math.min(Math.max(s.opacity, 0), 1) : 1
  const rotation = isFiniteNumber(s.rotation) ? s.rotation % 360 : 0
  const groupId = typeof s.groupId === 'string' && s.groupId ? s.groupId : undefined
  const base = { id: s.id, fill, stroke, opacity, rotation, ...(groupId ? { groupId } : {}) }

  switch (s.type) {
    case 'rect':
      if (![s.x, s.y, s.w, s.h, s.rx].every(isFiniteNumber)) return null
      return { ...base, type: 'rect', x: s.x, y: s.y, w: s.w, h: s.h, rx: s.rx } as VectorShape
    case 'ellipse':
      if (![s.cx, s.cy, s.rx, s.ry].every(isFiniteNumber)) return null
      return { ...base, type: 'ellipse', cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry } as VectorShape
    case 'line':
      if (![s.x1, s.y1, s.x2, s.y2].every(isFiniteNumber)) return null
      return { ...base, type: 'line', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 } as VectorShape
    case 'polygon': {
      if (!Array.isArray(s.points) || s.points.length < 3) return null
      const points = s.points.slice(0, MAX_POLYGON_POINTS).filter(isVec2)
      if (points.length < 3) return null
      return { ...base, type: 'polygon', points } as VectorShape
    }
    case 'path':
      if (typeof s.d !== 'string' || !s.d || s.d.length > MAX_PATH_CHARS) return null
      return { ...base, type: 'path', d: s.d } as VectorShape
    case 'text': {
      if (![s.x, s.y].every(isFiniteNumber)) return null
      if (typeof s.text !== 'string' || !s.text.trim()) return null
      const fontSize = isFiniteNumber(s.fontSize) ? Math.min(Math.max(s.fontSize, 6), 200) : 24
      const text = s.text.slice(0, MAX_TEXT_CHARS)
      return { ...base, type: 'text', x: s.x, y: s.y, text, fontSize } as VectorShape
    }
    default:
      return null
  }
}
