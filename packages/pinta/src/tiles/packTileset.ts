/**
 * Empacota o tileset numa FOLHA compatível com o Studio por construção: o
 * runtime cria o tilemap com `loadSpriteSheet(image, tile, tile)` e resolve o
 * índice `i` por `cols = floor(sheetW/tile)`, `sx = (i%cols)*tile`,
 * `sy = floor(i/cols)*tile` — então o índice do tile NO ARRAY precisa ser o
 * índice row-major NA IMAGEM. `columns = min(count, 8)` (folha larga demais é
 * ruim de olhar; 8 é o padrão confortável).
 */
import type { PintaBitmap, TilesetAsset } from '../core/project'
import { composeSheetPngDataUrl } from '../export/png'

export interface TilesetPack {
  tileSize: number
  columns: number
  rows: number
  cells: Array<{ bitmap: PintaBitmap; col: number; row: number }>
}

export function packTileset(asset: TilesetAsset): TilesetPack {
  const columns = Math.min(Math.max(asset.tiles.length, 1), 8)
  const rows = Math.max(Math.ceil(asset.tiles.length / columns), 1)
  const cells = asset.tiles.map((bitmap, index) => ({
    bitmap,
    col: index % columns,
    row: Math.floor(index / columns),
  }))
  return { tileSize: asset.tileSize, columns, rows, cells }
}

/** Rasteriza a folha do tileset. `null` sem canvas 2D (happy-dom). */
export function tilesetPngDataUrl(asset: TilesetAsset, scale = 1): string | null {
  const pack = packTileset(asset)
  return composeSheetPngDataUrl({
    cells: pack.cells,
    cellWidth: pack.tileSize,
    cellHeight: pack.tileSize,
    columns: pack.columns,
    rows: pack.rows,
    paletteId: asset.paletteId,
    scale,
  })
}
