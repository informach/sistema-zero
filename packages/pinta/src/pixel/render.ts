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
import { TRANSPARENT_INDEX } from '../core/palette'
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
 * `colors` é a paleta EFETIVA já resolvida (`resolveAssetPalette` — base +
 * extras). Índice 0 (e qualquer índice fora da paleta) sai TRANSPARENTE.
 */
export function bitmapToRGBA(
  bitmap: PintaBitmap,
  colors: readonly string[],
): Uint8ClampedArray<ArrayBuffer> {
  // Tabela por índice resolvida UMA vez fora do loop de pixels.
  const table: Array<[number, number, number] | null> = colors.map((hex, index) =>
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
 * Tamanho de pintura de uma MINIATURA: o bitmap inteiro quando cabe em `maxPx` (1:1,
 * nítido), senão reduzido proporcionalmente para caber (um cenário 512×512 virava um
 * canvas de 1 MiB por card; com 192 px no maior lado são ~147 KB). Puro (testável).
 */
export function thumbTargetSize(
  width: number,
  height: number,
  maxPx: number,
): { width: number; height: number; scale: number } {
  const longest = Math.max(width, height)
  if (longest <= maxPx || longest === 0) return { width, height, scale: 1 }
  const scale = maxPx / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  }
}

/** Canvas auxiliar de módulo para reduzir miniaturas (um só, reaproveitado). */
let thumbScratch: HTMLCanvasElement | null = null

/**
 * Pinta o bitmap num canvas de MINIATURA: 1:1 quando cabe em `maxPx`, senão reduzido
 * (suavização alta — na galeria, reconhecer o cenário vale mais que a nitidez do pixel;
 * o CSS `pixelated` continua). Devolve false sem contexto 2D (happy-dom).
 */
export function paintBitmapCapped(
  canvas: HTMLCanvasElement,
  bitmap: PintaBitmap,
  colors: readonly string[],
  maxPx: number,
): boolean {
  const target = thumbTargetSize(bitmap.width, bitmap.height, maxPx)
  if (target.scale === 1) return paintBitmap(canvas, bitmap, colors)
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  if (typeof document === 'undefined') return false
  thumbScratch ??= document.createElement('canvas')
  if (!paintBitmap(thumbScratch, bitmap, colors)) return false
  if (canvas.width !== target.width) canvas.width = target.width
  if (canvas.height !== target.height) canvas.height = target.height
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, target.width, target.height)
  ctx.drawImage(thumbScratch, 0, 0, bitmap.width, bitmap.height, 0, 0, target.width, target.height)
  return true
}

/**
 * Pinta o bitmap 1:1 num canvas (redimensiona o canvas para o bitmap).
 * Devolve false se o ambiente não tem contexto 2D (happy-dom).
 */
export function paintBitmap(
  canvas: HTMLCanvasElement,
  bitmap: PintaBitmap,
  colors: readonly string[],
): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  if (canvas.width !== bitmap.width) canvas.width = bitmap.width
  if (canvas.height !== bitmap.height) canvas.height = bitmap.height
  const rgba = bitmapToRGBA(bitmap, colors)
  ctx.putImageData(new ImageData(rgba, bitmap.width, bitmap.height), 0, 0)
  return true
}

/**
 * Camadas ao redor do bitmap em edição, na ordem de pintura:
 * `ghost` (quadro anterior, translúcido) → `under` (camadas de baixo, opacas) →
 * o bitmap ativo → `over` (camadas de cima, opacas).
 *
 * Vêm PRÉ-ACHATADAS: durante um gesto só o bitmap ativo muda, então o pintor
 * blita 3 imagens por movimento em vez de recompor a pilha inteira.
 */
export interface PaintLayers {
  ghost?: { bitmap: PintaBitmap; alpha: number }
  under?: PintaBitmap | null
  over?: PintaBitmap | null
  /**
   * A camada em edição está ESCONDIDA (olho fechado): o palco mostra só as
   * outras. Sem isso, esconder a camada ativa não tirava nada da tela.
   */
  hideActive?: boolean
}

export interface ScaledPainter {
  /**
   * Repinta (offscreen 1:1 + blit escalado). Chamar a cada mudança de
   * bitmap/zoom.
   */
  paint(bitmap: PintaBitmap, colors: readonly string[], scale: number, layers?: PaintLayers): void
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

  function blit1to1(bitmap: PintaBitmap, colors: readonly string[]): void {
    if (offscreen.width !== bitmap.width) offscreen.width = bitmap.width
    if (offscreen.height !== bitmap.height) offscreen.height = bitmap.height
    const rgba = bitmapToRGBA(bitmap, colors)
    offCtx?.putImageData(new ImageData(rgba, bitmap.width, bitmap.height), 0, 0)
  }

  return {
    paint(bitmap, colors, scale, layers) {
      const w = Math.max(Math.round(bitmap.width * scale), 1)
      const h = Math.max(Math.round(bitmap.height * scale), 1)
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, w, h)
      const draw = (source: PintaBitmap, alpha = 1): void => {
        blit1to1(source, colors)
        if (alpha !== 1) ctx.globalAlpha = alpha
        ctx.drawImage(offscreen, 0, 0, w, h)
        if (alpha !== 1) ctx.globalAlpha = 1
      }
      // Ordem: fantasma → camadas de baixo → camada em edição → de cima.
      if (layers?.ghost) draw(layers.ghost.bitmap, layers.ghost.alpha)
      if (layers?.under) draw(layers.under)
      if (!layers?.hideActive) draw(bitmap)
      if (layers?.over) draw(layers.over)
    },
    dispose() {
      offscreen.width = 0
      offscreen.height = 0
    },
  }
}

/**
 * Desenha uma grade de pixels por cima do canvas escalado (1 linha por pixel).
 * `show` é o toggle da criança; abaixo de zoom 6 a grade vira ruído e some
 * sozinha (independente do toggle).
 */
export function paintPixelGrid(
  canvas: HTMLCanvasElement,
  bitmap: PintaBitmap,
  scale: number,
  show = true,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx || !show || scale < 6) return
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

export interface MirrorGuideSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Geometria das guias do espelho em coordenadas do canvas escalado.
 * `mirrorX` reflete esquerda/direita, portanto ganha uma guia vertical;
 * `mirrorY` reflete cima/baixo e ganha uma guia horizontal.
 */
export function mirrorGuideSegments(
  bitmap: PintaBitmap,
  scale: number,
  mirrorX: boolean,
  mirrorY: boolean,
): MirrorGuideSegment[] {
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  const segments: MirrorGuideSegment[] = []
  if (mirrorX) segments.push({ x1: width / 2, y1: 0, x2: width / 2, y2: height })
  if (mirrorY) segments.push({ x1: 0, y1: height / 2, x2: width, y2: height / 2 })
  return segments
}

/**
 * Guias puramente visuais do espelho. Duas passadas tracejadas mantêm a linha
 * azul legível sobre cores claras e escuras sem alterar o bitmap exportado.
 */
export function paintMirrorGuides(
  canvas: HTMLCanvasElement,
  bitmap: PintaBitmap,
  scale: number,
  mirrorX: boolean,
  mirrorY: boolean,
): void {
  const segments = mirrorGuideSegments(bitmap, scale, mirrorX, mirrorY)
  if (segments.length === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.save()
  ctx.beginPath()
  for (const segment of segments) {
    ctx.moveTo(segment.x1, segment.y1)
    ctx.lineTo(segment.x2, segment.y2)
  }
  ctx.lineCap = 'butt'
  ctx.setLineDash([6, 4])
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(37,99,235,0.98)'
  ctx.stroke()
  ctx.restore()
}

/**
 * Contorno tracejado da SELEÇÃO retangular (marquee/recorte flutuante). Em px de
 * pixel × escala; visível em qualquer zoom (ao contrário da grade).
 */
export function paintSelectionOverlay(
  canvas: HTMLCanvasElement | null,
  rect: { x: number; y: number; width: number; height: number },
  scale: number,
): void {
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  const x = rect.x * scale
  const y = rect.y * scale
  const w = rect.width * scale
  const h = rect.height * scale
  ctx.save()
  ctx.lineWidth = 2
  // Duas passadas (branco por baixo, preto tracejado por cima) p/ contrastar
  // sobre qualquer cor do desenho.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.setLineDash([])
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.9)'
  ctx.setLineDash([4, 3])
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
  ctx.restore()
}
