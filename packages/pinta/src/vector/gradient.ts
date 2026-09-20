/** Geometria compartilhada entre palco, exportação e conta-gotas do degradê. */
import { shapeBounds } from './geometry'
import type { Vec2, VectorGradient, VectorShape } from './model'

export type GradientHandle = 'start' | 'end' | 'center' | 'radius'
export type GradientGeometry =
  | { type: 'linear'; start: Vec2; end: Vec2 }
  | { type: 'radial'; center: Vec2; radius: number }

const round2 = (value: number) => Math.round(value * 100) / 100
const round6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const validPoint = (point: unknown): point is Vec2 => {
  if (!point || typeof point !== 'object') return false
  const candidate = point as Record<string, unknown>
  return (
    typeof candidate.x === 'number' &&
    Number.isFinite(candidate.x) &&
    candidate.x >= 0 &&
    candidate.x <= 1 &&
    typeof candidate.y === 'number' &&
    Number.isFinite(candidate.y) &&
    candidate.y >= 0 &&
    candidate.y <= 1
  )
}

/** O eixo antigo derivado do ângulo; permanece igual para desenhos já salvos. */
export function linearGradientVector(angle: number): {
  x1: number
  y1: number
  x2: number
  y2: number
} {
  const rad = ((Number.isFinite(angle) ? angle : 90) * Math.PI) / 180
  const dx = Math.cos(rad) / 2
  const dy = Math.sin(rad) / 2
  return {
    x1: round2(0.5 - dx),
    y1: round2(0.5 - dy),
    x2: round2(0.5 + dx),
    y2: round2(0.5 + dy),
  }
}

export function gradientGeometry(gradient: VectorGradient): GradientGeometry {
  if (gradient.type === 'radial') {
    return {
      type: 'radial',
      center: validPoint(gradient.center) ? gradient.center : { x: 0.5, y: 0.5 },
      radius:
        Number.isFinite(gradient.radius) &&
        gradient.radius !== undefined &&
        gradient.radius >= 0.05 &&
        gradient.radius <= 1.5
          ? gradient.radius
          : 0.5,
    }
  }
  const axis = linearGradientVector(gradient.angle)
  const start = validPoint(gradient.start) ? gradient.start : { x: axis.x1, y: axis.y1 }
  const end = validPoint(gradient.end) ? gradient.end : { x: axis.x2, y: axis.y2 }
  // Um arquivo importado pode trazer duas pontas coincidentes. Evita um eixo
  // invisível sem alterar o valor salvo, para que o editor ainda possa corrigi-lo.
  if (Math.hypot(start.x - end.x, start.y - end.y) < 0.02) {
    return { type: 'linear', start: { x: axis.x1, y: axis.y1 }, end: { x: axis.x2, y: axis.y2 } }
  }
  return {
    type: 'linear',
    start,
    end,
  }
}

export function moveGradientHandle(
  gradient: VectorGradient,
  handle: GradientHandle,
  point: Vec2,
): VectorGradient {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return gradient
  const normalized = { x: round6(clamp(point.x, 0, 1)), y: round6(clamp(point.y, 0, 1)) }
  if (gradient.type === 'linear') {
    const geometry = gradientGeometry(gradient)
    if (geometry.type !== 'linear') return gradient
    if (handle === 'start') {
      if (Math.hypot(normalized.x - geometry.end.x, normalized.y - geometry.end.y) < 0.02)
        return gradient
      if (Math.hypot(normalized.x - geometry.start.x, normalized.y - geometry.start.y) < 1e-9)
        return gradient
      return { ...gradient, start: normalized }
    }
    if (handle === 'end') {
      if (Math.hypot(normalized.x - geometry.start.x, normalized.y - geometry.start.y) < 0.02)
        return gradient
      if (Math.hypot(normalized.x - geometry.end.x, normalized.y - geometry.end.y) < 1e-9)
        return gradient
      return { ...gradient, end: normalized }
    }
    return gradient
  }
  if (handle === 'center') {
    const geometry = gradientGeometry(gradient)
    if (geometry.type !== 'radial') return gradient
    if (Math.hypot(normalized.x - geometry.center.x, normalized.y - geometry.center.y) < 1e-9)
      return gradient
    return { ...gradient, center: normalized }
  }
  if (handle === 'radius') {
    const geometry = gradientGeometry(gradient)
    if (geometry.type !== 'radial') return gradient
    const radius = round6(
      clamp(Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y), 0.05, 1.5),
    )
    if (Math.abs(radius - geometry.radius) < 1e-9) return gradient
    return { ...gradient, radius }
  }
  return gradient
}

/** Um ponto da página vira coordenada 0–1 na caixa não girada da forma. */
export function gradientPointForShape(shape: VectorShape, documentPoint: Vec2): Vec2 {
  const bounds = shapeBounds(shape)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const radians = (-shape.rotation * Math.PI) / 180
  const dx = documentPoint.x - centerX
  const dy = documentPoint.y - centerY
  const x = centerX + dx * Math.cos(radians) - dy * Math.sin(radians)
  const y = centerY + dx * Math.sin(radians) + dy * Math.cos(radians)
  return {
    x: bounds.width === 0 ? 0.5 : (x - bounds.x) / bounds.width,
    y: bounds.height === 0 ? 0.5 : (y - bounds.y) / bounds.height,
  }
}

/** Posição de uma alça na página, inclusive quando a forma está girada. */
export function gradientDocumentPointForShape(shape: VectorShape, point: Vec2): Vec2 {
  const bounds = shapeBounds(shape)
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  const x = bounds.x + point.x * bounds.width
  const y = bounds.y + point.y * bounds.height
  const radians = (shape.rotation * Math.PI) / 180
  const dx = x - centerX
  const dy = y - centerY
  return {
    x: centerX + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: centerY + dx * Math.sin(radians) + dy * Math.cos(radians),
  }
}
