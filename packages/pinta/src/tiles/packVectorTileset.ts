/**
 * Folha do tileset VETORIAL — a MESMA fórmula do pixel (`packTileset`):
 * `columns = min(count, 8)`, índice do tile no array = índice row-major na
 * imagem (é o que o runtime do Studio resolve com `cols = floor(sheetW/tile)`).
 * As células viram `<svg>` aninhados e a folha rasteriza de uma vez.
 */
import type { VectorTilesetAsset } from '../core/project'
import { cellsToSheetSvg, type VectorSheetCell } from '../export/vectorSheet'
import { svgToPngDataUrl } from '../vector/rasterize'
import { tilesetGridGeometry } from './packGeometry'

export interface VectorTilesetPack {
  tileSize: number
  columns: number
  rows: number
  cells: VectorSheetCell[]
}

export function packVectorTileset(asset: VectorTilesetAsset): VectorTilesetPack {
  const { columns, rows } = tilesetGridGeometry(asset.tiles.length)
  const cells = asset.tiles.map((shapes, index) => ({
    shapes,
    col: index % columns,
    row: Math.floor(index / columns),
  }))
  return { tileSize: asset.tileSize, columns, rows, cells }
}

/** A folha de peças como SVG (mesmo layout que o PNG rasterizado). */
export function vectorTilesetSvg(asset: VectorTilesetAsset): string {
  const pack = packVectorTileset(asset)
  return cellsToSheetSvg({
    cells: pack.cells,
    cellWidth: pack.tileSize,
    cellHeight: pack.tileSize,
    columns: pack.columns,
    rows: pack.rows,
  })
}

/** Rasteriza a folha de peças. `null` sem canvas/Image (happy-dom). */
export async function vectorTilesetPngDataUrl(
  asset: VectorTilesetAsset,
  scale = 1,
): Promise<string | null> {
  const pack = packVectorTileset(asset)
  return svgToPngDataUrl(
    vectorTilesetSvg(asset),
    pack.columns * pack.tileSize,
    pack.rows * pack.tileSize,
    scale,
  )
}
