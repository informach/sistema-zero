/**
 * O mapa ACHATADO (camadas visíveis) como imagem — o PNG do export e da ponte
 * "Usar no Estúdio" (o mapa viaja achatado na v1; a grade colável é o caminho
 * de verdade p/ o bloco). Reusa o compositor de folha do export (as células
 * não se sobrepõem depois do flatten).
 */
import {
  type PintaBitmap,
  resolveAssetPalette,
  type TilemapAsset,
  type TilesetAsset,
} from '../core/project'
import { composeSheetPngDataUrl } from '../export/png'
import { bitmapToRGBA } from '../pixel/render'
import { packTileset } from './packTileset'
import { flattenLayers } from './tilemapOps'

export function tilemapPngDataUrl(
  tilemap: TilemapAsset,
  tileset: TilesetAsset,
  scale = 1,
): string | null {
  const flat = flattenLayers(tilemap)
  const cells: Array<{ bitmap: PintaBitmap; col: number; row: number }> = []
  for (let row = 0; row < tilemap.rows; row += 1) {
    for (let col = 0; col < tilemap.cols; col += 1) {
      const index = flat[row * tilemap.cols + col] ?? -1
      const bitmap = index >= 0 ? tileset.tiles[index] : undefined
      if (bitmap) cells.push({ bitmap, col, row })
    }
  }
  return composeSheetPngDataUrl({
    cells,
    cellWidth: tileset.tileSize,
    cellHeight: tileset.tileSize,
    columns: tilemap.cols,
    rows: tilemap.rows,
    colors: resolveAssetPalette(tileset),
    scale,
  })
}

/**
 * Miniatura do mapa CAPADA num tamanho fixo (`maxPx` no maior lado). Desenha as
 * peças JÁ ESCALADAS num canvas pequeno — NUNCA compõe o mapa inteiro em
 * resolução nativa (um 128×96 com peças de 48px daria 6144×4608, acima do teto
 * de área de canvas do Safari, além de estourar a cota de chars do Estúdio). O
 * runtime NÃO usa esta imagem (só grade + folha) — é só o thumbnail da
 * biblioteca. Devolve `{ dataUrl, width, height }` ou `null` sem canvas.
 */
export function tilemapThumbnail(
  tilemap: TilemapAsset,
  tileset: TilesetAsset,
  maxPx = 512,
): { dataUrl: string; width: number; height: number } | null {
  const native = Math.max(tilemap.cols, tilemap.rows) * tileset.tileSize
  const scale = native > maxPx ? maxPx / native : 1
  const cell = tileset.tileSize * scale
  const width = Math.max(1, Math.round(tilemap.cols * cell))
  const height = Math.max(1, Math.round(tilemap.rows * cell))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // Folha empacotada (pequena: ≤8 colunas × tileSize) como fonte do drawImage.
  const pack = packTileset(tileset)
  const colors = resolveAssetPalette(tileset)
  const sheet = document.createElement('canvas')
  sheet.width = pack.columns * pack.tileSize
  sheet.height = pack.rows * pack.tileSize
  const sheetCtx = sheet.getContext('2d')
  if (!sheetCtx) return null
  for (const c of pack.cells) {
    sheetCtx.putImageData(
      new ImageData(bitmapToRGBA(c.bitmap, colors), c.bitmap.width, c.bitmap.height),
      c.col * pack.tileSize,
      c.row * pack.tileSize,
    )
  }
  ctx.imageSmoothingEnabled = false
  const ts = tileset.tileSize
  const sheetCols = Math.max(1, Math.floor(sheet.width / ts))
  const flat = flattenLayers(tilemap)
  for (let row = 0; row < tilemap.rows; row += 1) {
    for (let col = 0; col < tilemap.cols; col += 1) {
      const index = flat[row * tilemap.cols + col] ?? -1
      if (index < 0) continue
      const sx = (index % sheetCols) * ts
      const sy = Math.floor(index / sheetCols) * ts
      ctx.drawImage(sheet, sx, sy, ts, ts, col * cell, row * cell, cell, cell)
    }
  }
  const dataUrl = canvas.toDataURL('image/png')
  if (!dataUrl.startsWith('data:image/png')) return null
  return { dataUrl, width, height }
}
