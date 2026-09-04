/**
 * Miniatura ISOMÉTRICA de um modelo, PURA (sem WebGL): projeta os triângulos
 * de cada peça numa câmera ortográfica fixa (a mesma diagonal do palco), corta
 * as faces de costas, ordena do fundo para a frente (algoritmo do pintor) e
 * sombreia cada triângulo pela normal. Sai como polígonos prontos para um
 * `<svg>`.
 *
 * É a miniatura dos MODELOS PRONTOS (o "Criar novo" não tem palco) e a reserva
 * de um modelo sem foto: o `thumb` só nasce quando o editor abre com WebGL,
 * então um modelo que desceu da nuvem e nunca foi aberto aqui não tem foto.
 * Cor = a cor base da peça (a pele pintada não aparece: é uma miniatura).
 */
import { hexToRgb, rgbToHex } from '../core/color'
import type { MoldaModelAsset, MoldaPaletteFields, Vec3 } from '../core/model'
import { resolvePaletteColors } from '../core/sanitize'
import { cross, dot, normalize } from './frame'
import { buildPartGeometry, modelTriangleCount } from './geometry'
import { partMatrix, transformDirection, transformPoint } from './transform'

export interface ThumbPolygon {
  /** `x,y x,y x,y`, pronto para o atributo `points`. */
  points: string
  fill: string
}

export interface ModelThumbProjection {
  viewBox: string
  /** Do fundo para a frente: desenhar na ordem. */
  polygons: ThumbPolygon[]
}

export type ThumbModel = Pick<MoldaModelAsset, 'parts'> & MoldaPaletteFields

/** Acima disto a miniatura pura fica cara para uma galeria inteira: o emoji assume. */
export const ISO_THUMB_MAX_TRIANGLES = 6_000

/** A diagonal do palco (`MoldaViewport` nasce em (16, 12, 20) olhando a origem). */
const EYE: Vec3 = normalize([16, 12, 20])
const RIGHT: Vec3 = normalize(cross([0, 1, 0], EYE))
const VIEW_UP: Vec3 = cross(EYE, RIGHT)
/** O sol do palco. */
const LIGHT: Vec3 = normalize([12, 24, 10])
const FALLBACK_COLOR = '#9ca3af'

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function shade(hex: string, level: number, cache: Map<string, string>): string {
  const key = `${hex}:${level}`
  const cached = cache.get(key)
  if (cached) return cached
  const [r, g, b] = hexToRgb(hex)
  const result = rgbToHex(
    Math.round(Math.min(255, r * level)),
    Math.round(Math.min(255, g * level)),
    Math.round(Math.min(255, b * level)),
  )
  cache.set(key, result)
  return result
}

interface ProjectedTriangle {
  depth: number
  points: string
  fill: string
}

export function projectModelThumb(
  model: ThumbModel,
  options: { maxTriangles?: number } = {},
): ModelThumbProjection | null {
  if (model.parts.length === 0) return null
  if (modelTriangleCount(model) > (options.maxTriangles ?? ISO_THUMB_MAX_TRIANGLES)) return null
  const colors = resolvePaletteColors(model)
  const byId = new Map(model.parts.map((part) => [part.id, part]))
  const cache = new Map<string, string>()
  const triangles: ProjectedTriangle[] = []
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const part of model.parts) {
    const source = (part.mirrorOf ? byId.get(part.mirrorOf) : undefined) ?? part
    const hex = colors[source.color] || colors[part.color] || FALLBACK_COLOR
    const built = buildPartGeometry(part)
    const matrix = partMatrix(part)
    for (let t = 0; t < built.triangleCount; t += 1) {
      const o = t * 9
      const normal = normalize(
        transformDirection(matrix, [
          built.normals[o] as number,
          built.normals[o + 1] as number,
          built.normals[o + 2] as number,
        ]),
      )
      // Face de costas para a câmera: não aparece.
      if (dot(normal, EYE) <= 0) continue
      let depth = 0
      const points: string[] = []
      for (let v = 0; v < 3; v += 1) {
        const p = o + v * 3
        const point = transformPoint(matrix, [
          built.positions[p] as number,
          built.positions[p + 1] as number,
          built.positions[p + 2] as number,
        ])
        const x = dot(point, RIGHT)
        const y = -dot(point, VIEW_UP)
        depth += dot(point, EYE)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        points.push(`${fmt(x)},${fmt(y)}`)
      }
      // Quantizado em 5%: poucas cores distintas por peça (cache e SVG menores).
      const level = Math.round((0.55 + 0.45 * Math.max(0, dot(normal, LIGHT))) * 20) / 20
      triangles.push({ depth: depth / 3, points: points.join(' '), fill: shade(hex, level, cache) })
    }
  }
  if (triangles.length === 0) return null
  triangles.sort((a, b) => a.depth - b.depth)
  const width = maxX - minX
  const height = maxY - minY
  const pad = Math.max(width, height, 1) * 0.06
  return {
    viewBox: `${fmt(minX - pad)} ${fmt(minY - pad)} ${fmt(width + pad * 2)} ${fmt(height + pad * 2)}`,
    polygons: triangles.map(({ points, fill }) => ({ points, fill })),
  }
}
