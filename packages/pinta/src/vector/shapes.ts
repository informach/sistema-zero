/**
 * Fábricas PURAS dos shapes vetoriais (defaults amigáveis) — o editor cria por
 * aqui e o sanitize do modelo valida o resto do caminho.
 */
import { newId } from '../core/id'
import type { Vec2, VectorShape, VectorStroke } from './model'

export interface ShapeStyle {
  fill: string
  stroke: VectorStroke | null
  opacity: number
}

export const DEFAULT_STYLE: ShapeStyle = {
  fill: '#78dc52',
  stroke: { color: '#000000', width: 2 },
  opacity: 1,
}

const base = (style: ShapeStyle) => ({
  id: newId(),
  fill: style.fill,
  stroke: style.stroke,
  opacity: style.opacity,
  rotation: 0,
})

export function makeRect(a: Vec2, b: Vec2, style: ShapeStyle): VectorShape {
  return {
    ...base(style),
    type: 'rect',
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
    rx: 0,
  }
}

export function makeEllipse(a: Vec2, b: Vec2, style: ShapeStyle): VectorShape {
  return {
    ...base(style),
    type: 'ellipse',
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    rx: Math.abs(b.x - a.x) / 2,
    ry: Math.abs(b.y - a.y) / 2,
  }
}

export function makeLine(a: Vec2, b: Vec2, style: ShapeStyle): VectorShape {
  // Linha sem stroke seria invisível — garante um traço.
  const stroke = style.stroke ?? { color: style.fill === 'none' ? '#000000' : style.fill, width: 2 }
  return { ...base({ ...style, stroke }), type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

/** Polígono REGULAR de N lados inscrito no arrasto (a→b define o círculo). */
export function makePolygon(a: Vec2, b: Vec2, sides: number, style: ShapeStyle): VectorShape {
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  const r = Math.max(Math.hypot(b.x - a.x, b.y - a.y) / 2, 1)
  const n = Math.min(Math.max(Math.round(sides), 3), 12)
  const points: Vec2[] = []
  for (let i = 0; i < n; i += 1) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
  }
  return { ...base(style), type: 'polygon', points }
}

/** Estrela de N pontas (raio interno = 45% do externo). */
export function makeStar(a: Vec2, b: Vec2, tips: number, style: ShapeStyle): VectorShape {
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  const outer = Math.max(Math.hypot(b.x - a.x, b.y - a.y) / 2, 1)
  const inner = outer * 0.45
  const n = Math.min(Math.max(Math.round(tips), 3), 12)
  const points: Vec2[] = []
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / n
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
  }
  return { ...base(style), type: 'polygon', points }
}

export function makePath(d: string, style: ShapeStyle): VectorShape {
  // Pincel: traço aberto — SEM preenchimento por default (o `d` não fecha).
  const stroke = style.stroke ?? { color: '#000000', width: 3 }
  return { ...base({ fill: 'none', stroke, opacity: style.opacity }), type: 'path', d }
}

export function makeText(at: Vec2, text: string, style: ShapeStyle): VectorShape {
  const fill = style.fill === 'none' ? '#000000' : style.fill
  return {
    ...base({ ...style, fill, stroke: null }),
    type: 'text',
    x: at.x,
    y: at.y,
    text,
    fontSize: 24,
  }
}
