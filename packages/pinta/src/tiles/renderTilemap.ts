/**
 * O mapa ACHATADO (camadas visíveis) como imagem — o PNG do export e da ponte
 * "Usar no Estúdio" (o mapa viaja achatado na v1; a grade colável é o caminho
 * de verdade p/ o bloco). Reusa o compositor de folha do export (as células
 * não se sobrepõem depois do flatten).
 */
import type { PintaBitmap, TilemapAsset, TilesetAsset } from '../core/project'
import { composeSheetPngDataUrl } from '../export/png'
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
    paletteId: tileset.paletteId,
    scale,
  })
}
