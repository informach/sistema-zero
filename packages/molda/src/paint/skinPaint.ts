/**
 * Pintura numa PELE (bitmap indexado), pura: carimbo do lápis (1, 2 ou 3
 * texels), linha de Bresenham entre dois texels (o gesto interpolado) e o
 * balde (preenchimento 4-conectado). Toda função devolve uma pele nova, ou a
 * MESMA referência quando nada mudou (o palco usa isso para pular o
 * re-raster).
 */
import type { MoldaSkin } from '../core/model'
import { cloneSkin } from '../model/skinOps'

export type BrushSize = 1 | 2 | 3
export type Texel = [number, number]

/** Os texels de um carimbo: 1 = o próprio; 2 = 2×2 a partir dele; 3 = 3×3 centrado. */
export function stampTexels(x: number, y: number, size: BrushSize): Texel[] {
  if (size === 1) return [[x, y]]
  const out: Texel[] = []
  const start = size === 3 ? -1 : 0
  const end = size === 3 ? 1 : 1
  for (let dy = start; dy <= end; dy += 1) {
    for (let dx = start; dx <= end; dx += 1) out.push([x + dx, y + dy])
  }
  return out
}

/** Bresenham inclusivo entre dois texels. */
export function lineTexels(x0: number, y0: number, x1: number, y1: number): Texel[] {
  const out: Texel[] = []
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let error = dx + dy
  for (;;) {
    out.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = error * 2
    if (e2 >= dy) {
      error += dy
      x += sx
    }
    if (e2 <= dx) {
      error += dx
      y += sy
    }
  }
  return out
}

/** Pinta os texels (fora da pele são ignorados). */
export function paintSkin(
  skin: MoldaSkin,
  texels: readonly Texel[],
  color: number,
  size: BrushSize = 1,
): MoldaSkin {
  let out: MoldaSkin | null = null
  for (const [tx, ty] of texels) {
    for (const [x, y] of stampTexels(tx, ty, size)) {
      if (x < 0 || y < 0 || x >= skin.width || y >= skin.height) continue
      const index = y * skin.width + x
      const current = (out ?? skin).data[index]
      if (current === color) continue
      if (!out) out = cloneSkin(skin)
      out.data[index] = color
    }
  }
  return out ?? skin
}

/** Balde: a região 4-conectada da cor sob o texel vira `color`. */
export function floodFillSkin(skin: MoldaSkin, x: number, y: number, color: number): MoldaSkin {
  if (x < 0 || y < 0 || x >= skin.width || y >= skin.height) return skin
  const target = skin.data[y * skin.width + x] ?? 0
  if (target === color) return skin
  const out = cloneSkin(skin)
  const stack: Texel[] = [[x, y]]
  while (stack.length > 0) {
    const next = stack.pop()
    if (!next) break
    const [cx, cy] = next
    if (cx < 0 || cy < 0 || cx >= out.width || cy >= out.height) continue
    const index = cy * out.width + cx
    if (out.data[index] !== target) continue
    out.data[index] = color
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return out
}
