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
import { embedVectorFonts } from '../vector/portableSvg'
import { svgToPngDataUrl } from '../vector/rasterize'
import { gradientDefsMarkup, shapesToMarkup } from '../vector/svg'
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
  // Um `<defs>` no topo da folha serve TODAS as células (ids de shape únicos).
  const defs = gradientDefsMarkup(cells.flatMap((cell) => cell.shapes))
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  ]
  if (defs) lines.push(defs)
  lines.push(...parts, '</svg>')
  return lines.join('\n')
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

export async function vectorSheetPortableSvg(pack: VectorSheetPack): Promise<string> {
  return embedVectorFonts(
    vectorSheetSvg(pack),
    pack.cells.flatMap((cell) => cell.shapes),
  )
}

/** Rasteriza a folha. `null` sem canvas/Image (happy-dom). */
export async function vectorSheetPngDataUrl(
  pack: VectorSheetPack,
  scale = 1,
): Promise<string | null> {
  return svgToPngDataUrl(
    await vectorSheetPortableSvg(pack),
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

export async function vectorStripPortableSvg(
  asset: VectorSpriteAsset,
  animation: PintaVectorAnimation,
): Promise<string> {
  return embedVectorFonts(vectorStripSvg(asset, animation), animation.frames.flat())
}

export async function vectorStripPngDataUrl(
  asset: VectorSpriteAsset,
  animation: PintaVectorAnimation,
  scale = 1,
): Promise<string | null> {
  return svgToPngDataUrl(
    await vectorStripPortableSvg(asset, animation),
    Math.max(animation.frames.length, 1) * asset.frameWidth,
    asset.frameHeight,
    scale,
  )
}
