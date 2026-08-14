/**
 * Mudar o TAMANHO de um desenho que já existe, sem perder o que foi feito.
 *
 * Antes, perceber no meio do desenho que 32x32 era pouco custava apagar e
 * começar de novo. Aqui o tamanho vira uma edição comum: uma op PURA, um commit
 * só, desfazível.
 *
 * ⚠️⚠️ Por que isto precisa ser uma operação ÚNICA, e não a UI mexendo campo a
 * campo: `frameWidth`/`frameHeight` e TODOS os bitmaps têm que andar juntos. Um
 * quadro que diz 128x32 com bitmap 128x128 é DESCARTADO pelo `sanitizePintaAsset`
 * e o desenho some da galeria sem uma linha de erro — foi exatamente o que
 * aconteceu ao destravar o quadro deitado na fábrica. O round-trip pelo sanitize
 * está travado em teste.
 */

import { translateShape } from '../vector/geometry'
import type { VectorShape } from '../vector/model'
import type { PintaAsset, PintaBitmap, PintaPixelFrame } from './project'
import { createBitmap, PINTA_LIMITS } from './projectConfig'

/** Onde a arte antiga cai dentro do tamanho novo. */
export type ResizeAnchor = 'center' | 'top-left'

/** O que dá para redimensionar, e em que unidade. */
export type ResizeUnit = 'pixels' | 'cells'

export interface ResizeTarget {
  width: number
  height: number
  unit: ResizeUnit
  min: number
  max: number
}

/**
 * Tamanho atual + limites do kind, ou `null` quando ele não pode mudar de
 * tamanho. PEÇAS ficam de fora de propósito: o tamanho do tile é whitelist dura
 * do motor (16/32/48) e mexer nele quebraria os mapas que apontam para elas.
 */
export function resizeTargetOf(asset: PintaAsset): ResizeTarget | null {
  const pixels = (width: number, height: number): ResizeTarget => ({
    width,
    height,
    unit: 'pixels',
    min: PINTA_LIMITS.minFrameSize,
    max: PINTA_LIMITS.maxFrameSize,
  })
  switch (asset.kind) {
    case 'pixel-sprite':
    case 'vector-sprite':
      return pixels(asset.frameWidth, asset.frameHeight)
    case 'pixel-background': {
      const first = asset.cels[0]
      return {
        width: first?.width ?? 1,
        height: first?.height ?? 1,
        unit: 'pixels',
        min: 1,
        max: PINTA_LIMITS.maxBitmapSize,
      }
    }
    case 'vector-background':
      return { width: asset.width, height: asset.height, unit: 'pixels', min: 1, max: 2048 }
    case 'tilemap':
      return {
        width: asset.cols,
        height: asset.rows,
        unit: 'cells',
        min: 1,
        max: PINTA_LIMITS.maxTilemapCols,
      }
    case 'tileset':
    case 'vector-tileset':
      return null
  }
}

/** Deslocamento da arte antiga dentro do quadro novo. */
function offsetFor(anchor: ResizeAnchor, antigo: number, novo: number): number {
  return anchor === 'center' ? Math.floor((novo - antigo) / 2) : 0
}

/**
 * O mesmo desenho num quadro de outro tamanho. Cresce com transparente em volta;
 * encolhendo, o que fica de fora É PERDIDO (a UI avisa antes, e o desfazer cobre).
 */
export function resizeBitmapCanvas(
  bitmap: PintaBitmap,
  width: number,
  height: number,
  anchor: ResizeAnchor = 'center',
): PintaBitmap {
  if (bitmap.width === width && bitmap.height === height) return bitmap
  const out = createBitmap(width, height)
  const dx = offsetFor(anchor, bitmap.width, width)
  const dy = offsetFor(anchor, bitmap.height, height)
  for (let y = 0; y < bitmap.height; y += 1) {
    const destinoY = y + dy
    if (destinoY < 0 || destinoY >= height) continue
    for (let x = 0; x < bitmap.width; x += 1) {
      const destinoX = x + dx
      if (destinoX < 0 || destinoX >= width) continue
      out.data[destinoY * width + destinoX] = bitmap.data[y * bitmap.width + x] ?? 0
    }
  }
  return out
}

function resizeFrame(
  frame: PintaPixelFrame,
  width: number,
  height: number,
  anchor: ResizeAnchor,
): PintaPixelFrame {
  return frame.map((cel) => resizeBitmapCanvas(cel, width, height, anchor))
}

/** As formas acompanham a âncora, como os pixels acompanham (via `resizeFrame`). */
function moverFormas(
  shapes: readonly VectorShape[],
  anchor: ResizeAnchor,
  larguraAntiga: number,
  alturaAntiga: number,
  largura: number,
  altura: number,
): VectorShape[] {
  const dx = offsetFor(anchor, larguraAntiga, largura)
  const dy = offsetFor(anchor, alturaAntiga, altura)
  if (dx === 0 && dy === 0) return [...shapes]
  return shapes.map((shape) => translateShape(shape, dx, dy))
}

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(valor)))
}

/**
 * O asset inteiro num tamanho novo. Devolve o MESMO objeto quando nada muda (é
 * assim que a UI sabe que não há o que commitar) e `null` quando o kind não
 * aceita redimensionar.
 *
 * ⚠️ No personagem isto tem que alcançar TODAS as animações × TODOS os quadros ×
 * TODAS as camadas. Deixar um cel para trás faz o sanitize descartar o asset.
 */
export function resizeAsset(
  asset: PintaAsset,
  width: number,
  height: number,
  anchor: ResizeAnchor = 'center',
): PintaAsset | null {
  const alvo = resizeTargetOf(asset)
  if (!alvo) return null
  const w = clamp(width, alvo.min, alvo.max)
  const h = clamp(height, alvo.min, alvo.max)
  if (w === alvo.width && h === alvo.height) return asset

  switch (asset.kind) {
    case 'pixel-sprite':
      return {
        ...asset,
        frameWidth: w,
        frameHeight: h,
        animations: asset.animations.map((animation) => ({
          ...animation,
          frames: animation.frames.map((frame) => resizeFrame(frame, w, h, anchor)),
        })),
      }
    case 'pixel-background':
      return { ...asset, cels: resizeFrame(asset.cels, w, h, anchor) }
    case 'vector-sprite':
      // ⚠️ Mudar só o quadro NÃO basta, embora o <svg> aninhado já clipe: as formas
      // guardam coordenadas próprias, então crescer deixaria o desenho colado no
      // canto enquanto o pixel, no MESMO diálogo, centraliza. Medido: 32→128 punha
      // a forma em x=8 com o quadro novo centrado em 64.
      return {
        ...asset,
        frameWidth: w,
        frameHeight: h,
        animations: asset.animations.map((animation) => ({
          ...animation,
          frames: animation.frames.map((frame) =>
            moverFormas(frame, anchor, asset.frameWidth, asset.frameHeight, w, h),
          ),
        })),
      }
    case 'vector-background':
      return {
        ...asset,
        width: w,
        height: h,
        shapes: moverFormas(asset.shapes, anchor, asset.width, asset.height, w, h),
      }
    case 'tilemap':
      return {
        ...asset,
        cols: w,
        rows: h,
        layers: asset.layers.map((layer) => {
          const cells = new Int16Array(w * h).fill(-1)
          const dx = offsetFor(anchor, asset.cols, w)
          const dy = offsetFor(anchor, asset.rows, h)
          for (let r = 0; r < asset.rows; r += 1) {
            const destinoR = r + dy
            if (destinoR < 0 || destinoR >= h) continue
            for (let c = 0; c < asset.cols; c += 1) {
              const destinoC = c + dx
              if (destinoC < 0 || destinoC >= w) continue
              cells[destinoR * w + destinoC] = layer.cells[r * asset.cols + c] ?? -1
            }
          }
          return { ...layer, cells }
        }),
      }
    case 'tileset':
    case 'vector-tileset':
      return null
  }
}

/** Encolher CORTA: a UI avisa antes de commitar. */
export function resizeCuts(asset: PintaAsset, width: number, height: number): boolean {
  const alvo = resizeTargetOf(asset)
  if (!alvo) return false
  return width < alvo.width || height < alvo.height
}
