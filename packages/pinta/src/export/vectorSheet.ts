/**
 * Folhas VETORIAIS (spritesheet do vector-sprite, tiras por animação): a MESMA
 * geometria do pixel (`packAnimationsGeometry` — uma linha por animação,
 * columns = max(frames)), com as células como `<svg>` ANINHADOS num único
 * documento. O `<svg>` aninhado CLIPA o conteúdo por padrão = paridade com o
 * bitmap (shape fora do quadro não vaza pra célula vizinha), e a folha inteira
 * rasteriza com UM Blob URL/Image/canvas (`rasterize.ts`).
 *
 * Upscale ×2/×4 aqui é re-render vetorial: SEM perda, nada de nearest-neighbor.
 */
import type { PintaVectorAnimation, VectorSpriteAsset } from '../core/project'
import type { VectorShape } from '../vector/model'
import { svgToPngDataUrl } from '../vector/rasterize'
import { shapesToMarkup } from '../vector/svg'
import { packAnimationsGeometry, type SheetGeometry } from './spritesheet'

export interface VectorSheetCell {
  shapes: VectorShape[]
  col: number
  row: number
}

export interface VectorSheetPack extends SheetGeometry {
  cells: VectorSheetCell[]
}

export function packVectorSpritesheet(asset: VectorSpriteAsset): VectorSheetPack {
  const geometry = packAnimationsGeometry(
    asset.frameWidth,
    asset.frameHeight,
    asset.animations.map((a) => ({
      name: a.name,
      fps: a.fps,
      loop: a.loop,
      frameCount: a.frames.length,
    })),
  )
  const cells: VectorSheetCell[] = []
  asset.animations.forEach((animation, row) => {
    animation.frames.forEach((shapes, col) => {
      cells.push({ shapes, col, row })
    })
  })
  return { ...geometry, cells }
}

/**
 * Um documento SVG com cada célula como `<svg>` aninhado (clipa por padrão).
 * PURO e testável (posições x/y, contagem, viewBox) — a rasterização fica no
 * chamador.
 */
export function cellsToSheetSvg(options: {
  cells: VectorSheetCell[]
  cellWidth: number
  cellHeight: number
  columns: number
  rows: number
}): string {
  const { cells, cellWidth, cellHeight, columns, rows } = options
  const width = columns * cellWidth
  const height = rows * cellHeight
  const parts = cells.map(
    (cell) =>
      `  <svg x="${cell.col * cellWidth}" y="${cell.row * cellHeight}" width="${cellWidth}" height="${cellHeight}" viewBox="0 0 ${cellWidth} ${cellHeight}">\n${shapesToMarkup(cell.shapes, '    ')}\n  </svg>`,
  )
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...parts,
    '</svg>',
  ].join('\n')
}

/** A folha inteira como SVG (mesmo layout que o PNG rasterizado). */
export function vectorSheetSvg(pack: VectorSheetPack): string {
  return cellsToSheetSvg({
    cells: pack.cells,
    cellWidth: pack.frameWidth,
    cellHeight: pack.frameHeight,
    columns: pack.columns,
    rows: pack.rows,
  })
}

/** Rasteriza a folha. `null` sem canvas/Image (happy-dom). */
export async function vectorSheetPngDataUrl(
  pack: VectorSheetPack,
  scale = 1,
): Promise<string | null> {
  return svgToPngDataUrl(
    vectorSheetSvg(pack),
    pack.columns * pack.frameWidth,
    pack.rows * pack.frameHeight,
    scale,
  )
}

/** A tira de UMA animação (1 linha), para o `animacoes/<nome>.png` do ZIP. */
export function vectorStripSvg(asset: VectorSpriteAsset, animation: PintaVectorAnimation): string {
  return cellsToSheetSvg({
    cells: animation.frames.map((shapes, col) => ({ shapes, col, row: 0 })),
    cellWidth: asset.frameWidth,
    cellHeight: asset.frameHeight,
    columns: Math.max(animation.frames.length, 1),
    rows: 1,
  })
}

export async function vectorStripPngDataUrl(
  asset: VectorSpriteAsset,
  animation: PintaVectorAnimation,
  scale = 1,
): Promise<string | null> {
  return svgToPngDataUrl(
    vectorStripSvg(asset, animation),
    Math.max(animation.frames.length, 1) * asset.frameWidth,
    asset.frameHeight,
    scale,
  )
}
