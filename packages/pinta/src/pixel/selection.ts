/**
 * Seleção RETANGULAR (corte v1): extract → floating → stamp. A seleção vira um
 * recorte "flutuante" que a criança arrasta; soltar carimba de volta. Tudo
 * puro — o estado da seleção vive na sessão do editor.
 */

import { TRANSPARENT_INDEX } from '../core/palette'
import type { PintaBitmap } from '../core/project'
import { cloneBitmap, type Vec2 } from './bitmap'

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export interface FloatingSelection {
  /** Recorte extraído (bitmap próprio, com transparência preservada). */
  bitmap: PintaBitmap
  /** Posição atual do canto superior esquerdo no bitmap de destino. */
  x: number
  y: number
}

/** Normaliza dois cantos de arrasto num retângulo CLAMPADO ao bitmap. */
export function normalizeRect(bitmap: PintaBitmap, a: Vec2, b: Vec2): SelectionRect | null {
  const x0 = Math.max(Math.min(Math.round(a.x), Math.round(b.x)), 0)
  const y0 = Math.max(Math.min(Math.round(a.y), Math.round(b.y)), 0)
  const x1 = Math.min(Math.max(Math.round(a.x), Math.round(b.x)), bitmap.width - 1)
  const y1 = Math.min(Math.max(Math.round(a.y), Math.round(b.y)), bitmap.height - 1)
  if (x1 < x0 || y1 < y0) return null
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

/**
 * Extrai o retângulo como seleção flutuante e devolve o bitmap de origem com o
 * buraco (transparente) no lugar.
 */
export function extractSelection(
  bitmap: PintaBitmap,
  rect: SelectionRect,
): { remaining: PintaBitmap; floating: FloatingSelection } {
  const remaining = cloneBitmap(bitmap)
  const cut: PintaBitmap = {
    width: rect.width,
    height: rect.height,
    data: new Uint8Array(rect.width * rect.height),
  }
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const src = (rect.y + y) * bitmap.width + (rect.x + x)
      cut.data[y * rect.width + x] = bitmap.data[src] ?? TRANSPARENT_INDEX
      remaining.data[src] = TRANSPARENT_INDEX
    }
  }
  return { remaining, floating: { bitmap: cut, x: rect.x, y: rect.y } }
}

/**
 * Carimba a seleção flutuante no destino (pixels TRANSPARENTES do recorte não
 * apagam o que está por baixo). Posições fora dos limites são cortadas.
 */
export function stampSelection(bitmap: PintaBitmap, floating: FloatingSelection): PintaBitmap {
  const next = cloneBitmap(bitmap)
  const { bitmap: cut } = floating
  for (let y = 0; y < cut.height; y += 1) {
    const ty = floating.y + y
    if (ty < 0 || ty >= next.height) continue
    for (let x = 0; x < cut.width; x += 1) {
      const tx = floating.x + x
      if (tx < 0 || tx >= next.width) continue
      const value = cut.data[y * cut.width + x] ?? TRANSPARENT_INDEX
      if (value !== TRANSPARENT_INDEX) next.data[ty * next.width + tx] = value
    }
  }
  return next
}
