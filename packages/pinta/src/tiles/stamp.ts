/**
 * `TileStamp` — um bloco retangular de índices de tile (`-1` = buraco, não
 * apaga o que está por baixo). É o conceito único que serve o carimbo
 * multi-tile do picker, o pincel/retângulo/linha e o "copiar pedaço" da
 * seleção. Ops PURAS sobre o tilemap (mesmo contrato mesma-ref das ops de
 * `tilemapOps.ts`).
 */
import type { TilemapAsset, TilemapLayer } from '../core/project'
import type { CellPos, CellRect } from './cellGeometry'

export interface TileStamp {
  cols: number
  rows: number
  /** row-major, `-1` = buraco (posição sem tile). */
  tiles: Int16Array
}

/** Carimbo de uma peça só (o caso comum: a criança escolheu 1 tile). */
export function singleTileStamp(index: number): TileStamp {
  return { cols: 1, rows: 1, tiles: Int16Array.of(index) }
}

/**
 * Retângulo de peças ARRASTADO no picker → carimbo. O picker desenha a folha
 * numa grade de `columns` colunas (a MESMA de `packTileset`), então o tile na
 * posição (col,row) da grade tem índice `row*columns + col`; posições além de
 * `tileCount` viram buraco (`-1`).
 */
export function stampFromTileset(tileCount: number, columns: number, rect: CellRect): TileStamp {
  const cols = Math.max(1, rect.cols)
  const rows = Math.max(1, rect.rows)
  const tiles = new Int16Array(cols * rows).fill(-1)
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const index = (rect.row + r) * columns + (rect.col + c)
      tiles[r * cols + c] = index < tileCount ? index : -1
    }
  }
  return { cols, rows, tiles }
}

/** Módulo sempre não-negativo (ancoragem à frente da célula). */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/**
 * O índice do carimbo para a célula (col,row), com o padrão ANCORADO em
 * `anchor` (a célula inicial do gesto) e repetido em módulo — blocos
 * adjacentes se encaixam sem sobrepor. `-1` = buraco.
 */
export function stampTileAt(stamp: TileStamp, anchor: CellPos, col: number, row: number): number {
  const sc = mod(col - anchor.col, stamp.cols)
  const sr = mod(row - anchor.row, stamp.rows)
  return stamp.tiles[sr * stamp.cols + sc] ?? -1
}

/**
 * As células do BLOCO encaixado (alinhado ao padrão ancorado em `anchor`) que
 * contém `visited` — é o que o pincel-com-carimbo pinta a cada célula visitada
 * (o bloco inteiro sob o cursor, encaixando com os vizinhos).
 */
export function blockCells(visited: CellPos, anchor: CellPos, stamp: TileStamp): CellPos[] {
  const startCol = anchor.col + Math.floor((visited.col - anchor.col) / stamp.cols) * stamp.cols
  const startRow = anchor.row + Math.floor((visited.row - anchor.row) / stamp.rows) * stamp.rows
  const out: CellPos[] = []
  for (let r = 0; r < stamp.rows; r += 1) {
    for (let c = 0; c < stamp.cols; c += 1) {
      out.push({ col: startCol + c, row: startRow + r })
    }
  }
  return out
}

function withLayer(
  tilemap: TilemapAsset,
  layerId: string,
  update: (layer: TilemapLayer) => TilemapLayer,
): TilemapAsset {
  const index = tilemap.layers.findIndex((l) => l.id === layerId)
  const layer = tilemap.layers[index]
  if (!layer) return tilemap
  const next = update(layer)
  if (next === layer) return tilemap
  return { ...tilemap, layers: tilemap.layers.map((l, i) => (i === index ? next : l)) }
}

/**
 * Aplica o padrão do carimbo (ancorado em `anchor`) nas `cells` da camada.
 * Buraco (`-1`) do carimbo PULA (não apaga) e índice ≥ `tileCount` também pula
 * (cinturão contra carimbo obsoleto após remap do tileset). Fora da grade é
 * ignorado. Devolve o MESMO asset quando nada muda.
 */
export function stampCells(
  tilemap: TilemapAsset,
  layerId: string,
  cells: readonly CellPos[],
  stamp: TileStamp,
  anchor: CellPos,
  tileCount: number,
): TilemapAsset {
  return withLayer(tilemap, layerId, (layer) => {
    let cells2: Int16Array | null = null
    for (const { col, row } of cells) {
      if (col < 0 || row < 0 || col >= tilemap.cols || row >= tilemap.rows) continue
      const tile = stampTileAt(stamp, anchor, col, row)
      if (tile < 0 || tile >= tileCount) continue
      const at = row * tilemap.cols + col
      if ((cells2 ?? layer.cells)[at] === tile) continue
      if (!cells2) cells2 = new Int16Array(layer.cells)
      cells2[at] = tile
    }
    return cells2 ? { ...layer, cells: cells2 } : layer
  })
}
