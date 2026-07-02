/**
 * Única camada canvas do motor pixel. Duas partes:
 * - `bitmapToRGBA` — PURA (índices → RGBA pela paleta), testável sem DOM.
 * - `paintBitmapScaled` — pinta um bitmap num canvas com upscale
 *   nearest-neighbor via canvas OFFSCREEN 1:1 + drawImage escalado
 *   (`imageSmoothingEnabled=false`). O checkerboard de transparência é CSS do
 *   contêiner (`.pin-checkerboard`), não pintado aqui.
 *
 * Contexto injetável: happy-dom devolve `getContext() === null` — quem chama
 * guarda contra null e a suíte de componente nunca depende do render real.
 */
import { getPalette, type PaletteId, TRANSPARENT_INDEX } from '../core/palette'
import type { PintaBitmap } from '../core/project'

/** `#rrggbb` → [r,g,b] (0–255). Entrada inválida vira magenta de debug. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match?.[1]) return [255, 0, 255]
  const value = Number.parseInt(match[1], 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

/**
 * Converte o bitmap indexado em pixels RGBA (row-major, 4 bytes/pixel).
 * Índice 0 (e qualquer índice fora da paleta) sai TRANSPARENTE.
 */
export function bitmapToRGBA(
  bitmap: PintaBitmap,
  paletteId: PaletteId,
): Uint8ClampedArray<ArrayBuffer> {
  const palette = getPalette(paletteId)
  // Tabela por índice (16 entradas) resolvida UMA vez fora do loop de pixels.
  const table: Array<[number, number, number] | null> = palette.colors.map((hex, index) =>
    index === TRANSPARENT_INDEX || !hex ? null : hexToRgb(hex),
  )
  const out = new Uint8ClampedArray(bitmap.width * bitmap.height * 4)
  for (let i = 0; i < bitmap.data.length; i += 1) {
    const rgb = table[bitmap.data[i] ?? TRANSPARENT_INDEX] ?? null
    if (!rgb) continue // já nasce 0,0,0,0
    const o = i * 4
    out[o] = rgb[0]
    out[o + 1] = rgb[1]
    out[o + 2] = rgb[2]
    out[o + 3] = 255
  }
  return out
}

/**
 * Pinta o bitmap 1:1 num canvas (redimensiona o canvas para o bitmap).
 * Devolve false se o ambiente não tem contexto 2D (happy-dom).
 */
export function paintBitmap(
  canvas: HTMLCanvasElement,
  bitmap: PintaBitmap,
  paletteId: PaletteId,
): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  if (canvas.width !== bitmap.width) canvas.width = bitmap.width
  if (canvas.height !== bitmap.height) canvas.height = bitmap.height
  const rgba = bitmapToRGBA(bitmap, paletteId)
  ctx.putImageData(new ImageData(rgba, bitmap.width, bitmap.height), 0, 0)
  return true
}

export interface ScaledPainter {
  /**
   * Repinta (offscreen 1:1 + blit escalado). Chamar a cada mudança de
   * bitmap/zoom. `under` desenha um bitmap FANTASMA por baixo (onion skin).
   */
  paint(
    bitmap: PintaBitmap,
    paletteId: PaletteId,
    scale: number,
    under?: { bitmap: PintaBitmap; alpha: number },
  ): void
  dispose(): void
}

/**
 * Cria o pintor escalado de um canvas VISÍVEL: mantém um offscreen 1:1 e
 * blita com `imageSmoothingEnabled=false` (pixel nítido). `null` quando o
 * ambiente não tem canvas 2D — o chamador simplesmente não pinta.
 */
export function createScaledPainter(canvas: HTMLCanvasElement): ScaledPainter | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const offscreen = document.createElement('canvas')
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return null

  function blit1to1(bitmap: PintaBitmap, paletteId: PaletteId): void {
    if (offscreen.width !== bitmap.width) offscreen.width = bitmap.width
    if (offscreen.height !== bitmap.height) offscreen.height = bitmap.height
    const rgba = bitmapToRGBA(bitmap, paletteId)
    offCtx?.putImageData(new ImageData(rgba, bitmap.width, bitmap.height), 0, 0)
  }

  return {
    paint(bitmap, paletteId, scale, under) {
      const w = Math.max(Math.round(bitmap.width * scale), 1)
      const h = Math.max(Math.round(bitmap.height * scale), 1)
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)
      if (under) {
        blit1to1(under.bitmap, paletteId)
        ctx.globalAlpha = under.alpha
        ctx.drawImage(offscreen, 0, 0, w, h)
        ctx.globalAlpha = 1
      }
      blit1to1(bitmap, paletteId)
      ctx.drawImage(offscreen, 0, 0, w, h)
    },
    dispose() {
      offscreen.width = 0
      offscreen.height = 0
    },
  }
}

/**
 * Desenha uma grade de pixels por cima do canvas escalado (1 linha por pixel).
 * Só chamar em zoom ≥ 6 — abaixo disso a grade vira ruído.
 */
export function paintPixelGrid(
  canvas: HTMLCanvasElement,
  bitmap: PintaBitmap,
  scale: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx || scale < 6) return
  ctx.strokeStyle = 'rgba(127, 127, 127, 0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < bitmap.width; x += 1) {
    ctx.moveTo(x * scale + 0.5, 0)
    ctx.lineTo(x * scale + 0.5, bitmap.height * scale)
  }
  for (let y = 1; y < bitmap.height; y += 1) {
    ctx.moveTo(0, y * scale + 0.5)
    ctx.lineTo(bitmap.width * scale, y * scale + 0.5)
  }
  ctx.stroke()
}
