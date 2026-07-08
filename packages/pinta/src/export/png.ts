/**
 * Rasterização de bitmap indexado → PNG (data URL / Blob). Depende de canvas
 * 2D real — em happy-dom `getContext()` é null e as funções devolvem null (a
 * UI desabilita o download em vez de quebrar).
 *
 * ⚠️ NUNCA `fetch('data:')` para virar Blob — o `connect-src` da CSP do kids
 * bloqueia. A conversão é `atob` → bytes (dataUrlToBlob).
 */
import { TRANSPARENT_INDEX } from '../core/palette'
import type { PintaBitmap } from '../core/project'
import { bitmapToRGBA } from '../pixel/render'

export const PNG_SCALES = [1, 2, 4] as const

/**
 * `toDataURL` acima do teto de canvas do device devolve "data:," SEM lançar —
 * valida o prefixo para a falha virar `null` (toast de erro, não PNG vazio).
 */
function pngOrNull(dataUrl: string): string | null {
  return dataUrl.startsWith('data:image/png') ? dataUrl : null
}

/**
 * Bitmap → `data:image/png;base64,...` com upscale nearest-neighbor.
 * `null` sem canvas 2D no ambiente.
 */
export function bitmapToPngDataUrl(
  bitmap: PintaBitmap,
  colors: readonly string[],
  scale = 1,
): string | null {
  const base = document.createElement('canvas')
  base.width = bitmap.width
  base.height = bitmap.height
  const baseCtx = base.getContext('2d')
  if (!baseCtx) return null
  const rgba = bitmapToRGBA(bitmap, colors)
  baseCtx.putImageData(new ImageData(rgba, bitmap.width, bitmap.height), 0, 0)
  if (scale === 1) return pngOrNull(base.toDataURL('image/png'))

  const scaled = document.createElement('canvas')
  scaled.width = bitmap.width * scale
  scaled.height = bitmap.height * scale
  const scaledCtx = scaled.getContext('2d')
  if (!scaledCtx) return null
  scaledCtx.imageSmoothingEnabled = false
  scaledCtx.drawImage(base, 0, 0, scaled.width, scaled.height)
  return pngOrNull(scaled.toDataURL('image/png'))
}

/**
 * Compõe VÁRIOS bitmaps numa folha única (spritesheet/tileset) e rasteriza.
 * `cells` posiciona cada bitmap por célula (col/row) numa grade fixa
 * `cellWidth`×`cellHeight`. `null` sem canvas 2D.
 */
export function composeSheetPngDataUrl(input: {
  cells: Array<{ bitmap: PintaBitmap; col: number; row: number }>
  cellWidth: number
  cellHeight: number
  columns: number
  rows: number
  colors: readonly string[]
  scale?: number
}): string | null {
  const scale = input.scale ?? 1
  const canvas = document.createElement('canvas')
  canvas.width = input.columns * input.cellWidth
  canvas.height = input.rows * input.cellHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  for (const cell of input.cells) {
    const rgba = bitmapToRGBA(cell.bitmap, input.colors)
    ctx.putImageData(
      new ImageData(rgba, cell.bitmap.width, cell.bitmap.height),
      cell.col * input.cellWidth,
      cell.row * input.cellHeight,
    )
  }
  if (scale === 1) return pngOrNull(canvas.toDataURL('image/png'))

  const scaled = document.createElement('canvas')
  scaled.width = canvas.width * scale
  scaled.height = canvas.height * scale
  const scaledCtx = scaled.getContext('2d')
  if (!scaledCtx) return null
  scaledCtx.imageSmoothingEnabled = false
  scaledCtx.drawImage(canvas, 0, 0, scaled.width, scaled.height)
  return pngOrNull(scaled.toDataURL('image/png'))
}

/** data URL → Blob via atob (CSP-safe; nunca fetch). `null` se malformada. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl)
  if (!match) return null
  const [, mime = 'application/octet-stream', isBase64, payload = ''] = match
  try {
    if (!isBase64) {
      return new Blob([decodeURIComponent(payload)], { type: mime })
    }
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

/**
 * Cor média VISÍVEL do bitmap (thumb/fallbacks). `null` = tudo transparente.
 * Pura (sem canvas) — útil para cards no happy-dom.
 */
export function bitmapDominantColor(bitmap: PintaBitmap, colors: readonly string[]): string | null {
  const counts = new Array<number>(colors.length).fill(0)
  for (const index of bitmap.data) {
    if (index !== TRANSPARENT_INDEX && index < counts.length) {
      counts[index] = (counts[index] ?? 0) + 1
    }
  }
  let best = -1
  let bestCount = 0
  for (let i = 0; i < counts.length; i += 1) {
    const count = counts[i] ?? 0
    if (count > bestCount) {
      best = i
      bestCount = count
    }
  }
  return best >= 1 ? (colors[best] ?? null) : null
}
