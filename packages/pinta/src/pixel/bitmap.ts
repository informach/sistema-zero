/**
 * Acessores básicos do bitmap indexado. As OPERAÇÕES de desenho (ops.ts) são
 * puras: clonam e devolvem bitmap novo — a mutação via `setPixel` só acontece
 * dentro delas, sobre o clone.
 */
import type { PintaBitmap } from '../core/project'

export interface Vec2 {
  x: number
  y: number
}

export function cloneBitmap(bitmap: PintaBitmap): PintaBitmap {
  return { width: bitmap.width, height: bitmap.height, data: new Uint8Array(bitmap.data) }
}

export function inBounds(bitmap: PintaBitmap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < bitmap.width && y < bitmap.height
}

/** Índice de paleta em (x,y); -1 fora dos limites. */
export function getPixel(bitmap: PintaBitmap, x: number, y: number): number {
  if (!inBounds(bitmap, x, y)) return -1
  return bitmap.data[y * bitmap.width + x] ?? 0
}

/** Escreve com bounds-check (no-op fora). MUTA — só usar sobre clones. */
export function setPixel(bitmap: PintaBitmap, x: number, y: number, color: number): void {
  if (!inBounds(bitmap, x, y)) return
  bitmap.data[y * bitmap.width + x] = color
}

export function bitmapsEqual(a: PintaBitmap, b: PintaBitmap): boolean {
  if (a.width !== b.width || a.height !== b.height) return false
  if (a.data === b.data) return true
  for (let i = 0; i < a.data.length; i += 1) {
    if (a.data[i] !== b.data[i]) return false
  }
  return true
}

/** Limita a posição ao retângulo do bitmap (gesto arrastado para fora). */
export function clampToBitmap(bitmap: PintaBitmap, pos: Vec2): Vec2 {
  return {
    x: Math.min(Math.max(Math.round(pos.x), 0), bitmap.width - 1),
    y: Math.min(Math.max(Math.round(pos.y), 0), bitmap.height - 1),
  }
}
