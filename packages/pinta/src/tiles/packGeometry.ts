/**
 * Geometria da FOLHA de um tileset — fonte ÚNICA compartilhada pelo packer de
 * PIXEL (`packTileset`) e o de VETOR (`packVectorTileset`). `columns = min(count,
 * 8)`, row-major (folha larga demais é ruim de olhar; 8 é o padrão confortável).
 * O Studio resolve o índice por `cols = floor(sheetW/tile)`, então o índice NO
 * ARRAY tem de ser o índice row-major NA IMAGEM. Separar isso num só lugar evita
 * o drift pixel×vetor (mudar um layout sem o outro desincronizaria as folhas).
 */
export interface TilesetGeometry {
  columns: number
  rows: number
}

export function tilesetGridGeometry(count: number): TilesetGeometry {
  const columns = Math.min(Math.max(count, 1), 8)
  const rows = Math.max(Math.ceil(count / columns), 1)
  return { columns, rows }
}
