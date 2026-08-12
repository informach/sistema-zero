/**
 * Geometria PURA do editor vetorial: bounding box, mover, redimensionar (pelas
 * 8 alças) e girar. O hit-testing fino é do BROWSER (os shapes são elementos
 * SVG reais); aqui só a matemática de manipulação.
 *
 * Paths (`d`) são os que NÓS geramos (comandos M/L/C/Z com coordenadas
 * ABSOLUTAS em pares x,y) — `translate`/`scale` reescrevem os números; um `d`
 * fora desse formato fica INTACTO (defensivo, não quebra).
 */
import type { Vec2, VectorShape } from './model'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

// ── Path `d` (nosso formato: M/L/C/Z absolutos) ─────────────────────────────

interface ParsedPath {
  commands: Array<{ op: string; coords: number[] }>
}

/** Parse do NOSSO subconjunto de `d`. `null` = formato estranho (deixar quieto). */
export function parsePathD(d: string): ParsedPath | null {
  const commands: ParsedPath['commands'] = []
  const tokens = d
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  let current: { op: string; coords: number[] } | null = null
  for (const token of tokens) {
    if (/^[MLCZ]$/i.test(token)) {
      if (token.toUpperCase() !== token) return null // relativos: fora do formato
      current = { op: token, coords: [] }
      commands.push(current)
    } else {
      const value = Number(token)
      if (!Number.isFinite(value) || !current) return null
      current.coords.push(value)
    }
  }
  return commands.length > 0 ? { commands } : null
}

function serializePath(parsed: ParsedPath): string {
  return parsed.commands
    .map((c) => (c.coords.length > 0 ? `${c.op} ${c.coords.join(' ')}` : c.op))
    .join(' ')
}

function mapPathPoints(d: string, fn: (x: number, y: number) => Vec2): string {
  const parsed = parsePathD(d)
  if (!parsed) return d
  for (const command of parsed.commands) {
    for (let i = 0; i + 1 < command.coords.length; i += 2) {
      const mapped = fn(command.coords[i] ?? 0, command.coords[i + 1] ?? 0)
      command.coords[i] = round2(mapped.x)
      command.coords[i + 1] = round2(mapped.y)
    }
  }
  return serializePath(parsed)
}

function pathPoints(d: string): Vec2[] {
  const parsed = parsePathD(d)
  if (!parsed) return []
  const points: Vec2[] = []
  for (const command of parsed.commands) {
    for (let i = 0; i + 1 < command.coords.length; i += 2) {
      points.push({ x: command.coords[i] ?? 0, y: command.coords[i + 1] ?? 0 })
    }
  }
  return points
}

/** Toda coordenada escrita num `d` ou num ponto passa por aqui (2 casas). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// ── Bounds ──────────────────────────────────────────────────────────────────

/** Caixa SEM considerar a rotação (as alças giram junto com o shape). */
export function shapeBounds(shape: VectorShape): Bounds {
  switch (shape.type) {
    case 'rect':
      return normalize(shape.x, shape.y, shape.w, shape.h)
    case 'ellipse':
      return normalize(shape.cx - shape.rx, shape.cy - shape.ry, shape.rx * 2, shape.ry * 2)
    case 'line':
      return fromPoints([
        { x: shape.x1, y: shape.y1 },
        { x: shape.x2, y: shape.y2 },
      ])
    case 'polygon':
      return fromPoints(shape.points)
    case 'path':
      return fromPoints(pathPoints(shape.d))
    case 'text': {
      // Aproximação (sem medir texto no DOM): ~0.6em por caractere.
      const width = Math.max(shape.text.length * shape.fontSize * 0.6, shape.fontSize)
      return normalize(shape.x, shape.y - shape.fontSize, width, shape.fontSize * 1.2)
    }
  }
}

function normalize(x: number, y: number, w: number, h: number): Bounds {
  return {
    x: Math.min(x, x + w),
    y: Math.min(y, y + h),
    width: Math.abs(w),
    height: Math.abs(h),
  }
}

function fromPoints(points: Vec2[]): Bounds {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function boundsCenter(bounds: Bounds): Vec2 {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

/** Caixa que envolve TODAS as caixas (bbox da seleção múltipla). */
export function boundsUnion(list: Bounds[]): Bounds {
  if (list.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const b of list) {
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** As duas caixas se tocam/sobrepõem? (borda encostada conta — laço generoso). */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  )
}

/** Borda/centro alvo do alinhamento. */
export type AlignEdge = 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom'

/**
 * Alinha os shapes `ids` à caixa `target` (a bbox da seleção com 2+, ou a tela
 * inteira com 1). Ciente de GRUPOS: cada cluster (grupo ou shape solto) é
 * transladado INTEIRO — alinhar não amassa o desenho de um grupo.
 */
export function alignShapes(
  shapes: VectorShape[],
  ids: string[],
  edge: AlignEdge,
  target: Bounds,
): VectorShape[] {
  const selectedSet = new Set(ids)
  const clusters = new Map<string, VectorShape[]>()
  for (const s of shapes) {
    if (!selectedSet.has(s.id)) continue
    const key = s.groupId ?? s.id
    const list = clusters.get(key)
    if (list) list.push(s)
    else clusters.set(key, [s])
  }
  const deltas = new Map<string, Vec2>()
  for (const [key, members] of clusters) {
    const b = boundsUnion(members.map(shapeBounds))
    let dx = 0
    let dy = 0
    switch (edge) {
      case 'left':
        dx = target.x - b.x
        break
      case 'centerH':
        dx = target.x + target.width / 2 - (b.x + b.width / 2)
        break
      case 'right':
        dx = target.x + target.width - (b.x + b.width)
        break
      case 'top':
        dy = target.y - b.y
        break
      case 'middleV':
        dy = target.y + target.height / 2 - (b.y + b.height / 2)
        break
      case 'bottom':
        dy = target.y + target.height - (b.y + b.height)
        break
    }
    deltas.set(key, { x: dx, y: dy })
  }
  return shapes.map((s) => {
    if (!selectedSet.has(s.id)) return s
    const d = deltas.get(s.groupId ?? s.id)
    return d && (d.x !== 0 || d.y !== 0) ? translateShape(s, d.x, d.y) : s
  })
}

// ── Manipulação ─────────────────────────────────────────────────────────────

export function translateShape(shape: VectorShape, dx: number, dy: number): VectorShape {
  switch (shape.type) {
    case 'rect':
      return { ...shape, x: shape.x + dx, y: shape.y + dy }
    case 'ellipse':
      return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy }
    case 'line':
      return {
        ...shape,
        x1: shape.x1 + dx,
        y1: shape.y1 + dy,
        x2: shape.x2 + dx,
        y2: shape.y2 + dy,
      }
    case 'polygon':
      return { ...shape, points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
    case 'path':
      return { ...shape, d: mapPathPoints(shape.d, (x, y) => ({ x: x + dx, y: y + dy })) }
    case 'text':
      return { ...shape, x: shape.x + dx, y: shape.y + dy }
  }
}

/**
 * Redimensiona escalando em torno da ÂNCORA (o canto/lado oposto à alça
 * arrastada). Fatores ≤ 0 são clampados a um mínimo (não deixa "virar do
 * avesso" nem colapsar a zero).
 */
export function scaleShape(
  shape: VectorShape,
  anchor: Vec2,
  factorX: number,
  factorY: number,
): VectorShape {
  const fx = clampFactor(factorX)
  const fy = clampFactor(factorY)
  const sx = (x: number) => anchor.x + (x - anchor.x) * fx
  const sy = (y: number) => anchor.y + (y - anchor.y) * fy
  switch (shape.type) {
    case 'rect':
      return {
        ...shape,
        x: sx(shape.x),
        y: sy(shape.y),
        w: shape.w * fx,
        h: shape.h * fy,
        rx: shape.rx * Math.min(fx, fy),
      }
    case 'ellipse':
      return {
        ...shape,
        cx: sx(shape.cx),
        cy: sy(shape.cy),
        rx: shape.rx * fx,
        ry: shape.ry * fy,
      }
    case 'line':
      return {
        ...shape,
        x1: sx(shape.x1),
        y1: sy(shape.y1),
        x2: sx(shape.x2),
        y2: sy(shape.y2),
      }
    case 'polygon':
      return { ...shape, points: shape.points.map((p) => ({ x: sx(p.x), y: sy(p.y) })) }
    case 'path':
      return { ...shape, d: mapPathPoints(shape.d, (x, y) => ({ x: sx(x), y: sy(y) })) }
    case 'text':
      return {
        ...shape,
        x: sx(shape.x),
        y: sy(shape.y),
        fontSize: Math.min(Math.max(shape.fontSize * Math.max(fx, fy), 6), 200),
      }
  }
}

function clampFactor(factor: number): number {
  if (!Number.isFinite(factor)) return 1
  const magnitude = Math.max(Math.abs(factor), 0.05)
  return factor < 0 ? magnitude : magnitude
}

/** Gira em torno do centro do bounding box (a semântica do `rotation`). */
export function rotateShapeTo(shape: VectorShape, degrees: number): VectorShape {
  const normalized = ((degrees % 360) + 360) % 360
  return { ...shape, rotation: Math.round(normalized * 10) / 10 }
}

/** Gira um ponto em torno de um centro (graus). `0` devolve cópia sem conta. */
export function rotatePoint(p: Vec2, center: Vec2, degrees: number): Vec2 {
  if (degrees === 0) return { x: p.x, y: p.y }
  const rad = (degrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = p.x - center.x
  const dy = p.y - center.y
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos }
}

// ── Nós editáveis ─────────────────────────────────────────────────
// `shapeNodes`/`setShapeNode` viviam aqui e saíram para `pathNodes.ts`: lá o
// nó é âncora + alças (`toEditablePath`), o que o editor de pontos precisa para
// acrescentar, apagar, fechar e curvar. Mover um nó continua arrastando as
// alças DELE junto, que era o comportamento do `setShapeNode`.

/**
 * Espelha o shape em torno de um centro (horizontal ou vertical) — o
 * `scaleShape` clampa fatores negativos de propósito, então o flip é uma
 * operação própria. Espelhar inverte o sentido da rotação.
 */
export function flipShape(shape: VectorShape, axis: 'h' | 'v', center: Vec2): VectorShape {
  const mx = (x: number) => (axis === 'h' ? round2(2 * center.x - x) : x)
  const my = (y: number) => (axis === 'v' ? round2(2 * center.y - y) : y)
  const flip = (): VectorShape => {
    switch (shape.type) {
      case 'rect':
        return {
          ...shape,
          x: axis === 'h' ? round2(2 * center.x - shape.x - shape.w) : shape.x,
          y: axis === 'v' ? round2(2 * center.y - shape.y - shape.h) : shape.y,
        }
      case 'ellipse':
        return { ...shape, cx: mx(shape.cx), cy: my(shape.cy) }
      case 'line':
        return { ...shape, x1: mx(shape.x1), y1: my(shape.y1), x2: mx(shape.x2), y2: my(shape.y2) }
      case 'polygon':
        return { ...shape, points: shape.points.map((p) => ({ x: mx(p.x), y: my(p.y) })) }
      case 'path':
        return { ...shape, d: mapPathPoints(shape.d, (x, y) => ({ x: mx(x), y: my(y) })) }
      case 'text': {
        // Texto não espelha de verdade (ficaria ilegível): move o box espelhado.
        const bounds = shapeBounds(shape)
        return {
          ...shape,
          x: axis === 'h' ? round2(2 * center.x - shape.x - bounds.width) : shape.x,
          y: my(shape.y),
        }
      }
    }
  }
  const flipped = flip()
  return shape.rotation !== 0
    ? { ...flipped, rotation: Math.round(((360 - shape.rotation) % 360) * 10) / 10 }
    : flipped
}
