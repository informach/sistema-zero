/**
 * `TileStamp` — um bloco retangular de índices de tile (`-1` = buraco, não
 * apaga o que está por baixo). É o conceito único que serve o carimbo
 * multi-tile do picker, o pincel/retângulo/linha e o "copiar pedaço" da
 * seleção. Ops PURAS sobre o tilemap (mesmo contrato mesma-ref das ops de
 * `tilemapOps.ts`).
 */
import { PINTA_MAP_FORMAT_LIMITS } from '../core/project'
import { cellTile, isValidCellForTiles } from './cell'
import type { CellPos, CellRect } from './cellGeometry'
import {
  type AuthorMap,
  isBoundedCellRect,
  isCellPosition,
  type MapCellEditResult,
  tryEditMapCellBatch,
} from './mapCellEdits'
import { REGION_EDIT_LIMIT, type RegionCellEdit } from './regionCells'

export interface TileStamp {
  cols: number
  rows: number
  /** row-major, `-1` = buraco (posição sem tile). */
  tiles: Int16Array
}

export function emptyTileStamp(): TileStamp {
  return { cols: 0, rows: 0, tiles: new Int16Array() }
}

export function isValidTileStamp(stamp: TileStamp): boolean {
  return (
    isBoundedCellRect({ col: 0, row: 0, cols: stamp.cols, rows: stamp.rows }) &&
    stamp.tiles instanceof Int16Array &&
    stamp.tiles.length === stamp.cols * stamp.rows &&
    stamp.tiles.every((cell) => isValidCellForTiles(cell, PINTA_MAP_FORMAT_LIMITS.maxTiles))
  )
}

/** Carimbo de uma peça só (o caso comum: a criança escolheu 1 tile). */
export function singleTileStamp(index: number): TileStamp {
  if (!isValidCellForTiles(index, PINTA_MAP_FORMAT_LIMITS.maxTiles)) return emptyTileStamp()
  return { cols: 1, rows: 1, tiles: Int16Array.of(index) }
}

/**
 * Retângulo de peças ARRASTADO no picker → carimbo. O picker desenha a folha
 * numa grade de `columns` colunas (a MESMA de `packTileset`), então o tile na
 * posição (col,row) da grade tem índice `row*columns + col`; posições além de
 * `tileCount` viram buraco (`-1`).
 */
export function stampFromTileset(tileCount: number, columns: number, rect: CellRect): TileStamp {
  if (
    !isBoundedCellRect(rect) ||
    !Number.isInteger(columns) ||
    columns < 1 ||
    !Number.isInteger(tileCount) ||
    tileCount < 0 ||
    tileCount > PINTA_MAP_FORMAT_LIMITS.maxTiles
  )
    return emptyTileStamp()
  const cols = Math.max(1, rect.cols)
  const rows = Math.max(1, rect.rows)
  const tiles = new Int16Array(cols * rows).fill(-1)
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const index = (rect.row + r) * columns + (rect.col + c)
      tiles[r * cols + c] =
        rect.col + c >= 0 && rect.col + c < columns && rect.row + r >= 0 && index < tileCount
          ? index
          : -1
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
  if (
    !isCellPosition(anchor) ||
    !isCellPosition({ col, row }) ||
    !isBoundedCellRect({ col: 0, row: 0, cols: stamp.cols, rows: stamp.rows })
  )
    return -1
  const sc = mod(col - anchor.col, stamp.cols)
  const sr = mod(row - anchor.row, stamp.rows)
  return stamp.tiles[sr * stamp.cols + sc] ?? -1
}

/**
 * As células do BLOCO encaixado (alinhado ao padrão ancorado em `anchor`) que
 * contém `visited` — é o que o pincel-com-carimbo pinta a cada célula visitada
 * (o bloco inteiro sob o cursor, encaixando com os vizinhos).
 */
export function stampBlockRect(
  visited: CellPos,
  anchor: CellPos,
  stamp: TileStamp,
): CellRect | null {
  if (
    !isCellPosition(visited) ||
    !isCellPosition(anchor) ||
    !isBoundedCellRect({ col: 0, row: 0, cols: stamp.cols, rows: stamp.rows })
  )
    return null
  const startCol = anchor.col + Math.floor((visited.col - anchor.col) / stamp.cols) * stamp.cols
  const startRow = anchor.row + Math.floor((visited.row - anchor.row) / stamp.rows) * stamp.rows
  const rect = { col: startCol, row: startRow, cols: stamp.cols, rows: stamp.rows }
  return isBoundedCellRect(rect) ? rect : null
}

export function blockCells(visited: CellPos, anchor: CellPos, stamp: TileStamp): CellPos[] {
  if (!isValidTileStamp(stamp)) return []
  const rect = stampBlockRect(visited, anchor, stamp)
  if (!rect) return []
  const out: CellPos[] = []
  for (let r = 0; r < stamp.rows; r += 1) {
    for (let c = 0; c < stamp.cols; c += 1) {
      out.push({ col: rect.col + c, row: rect.row + r })
    }
  }
  return out
}

/**
 * Aplica o padrão do carimbo (ancorado em `anchor`) nas `cells` da camada.
 * Buraco (`-1`) do carimbo PULA (não apaga) e índice ≥ `tileCount` também pula
 * (cinturão contra carimbo obsoleto após remap do tileset). Fora da grade é
 * ignorado. Devolve o MESMO asset quando nada muda.
 */
export function stampCells<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  cells: readonly CellPos[],
  stamp: TileStamp,
  anchor: CellPos,
  tileCount: number,
): Map {
  return tryStampCells(tilemap, layerId, cells, stamp, anchor, tileCount).map
}

export function tryStampCells<Map extends AuthorMap>(
  tilemap: Map,
  layerId: string,
  cells: readonly CellPos[],
  stamp: TileStamp,
  anchor: CellPos,
  tileCount: number,
): MapCellEditResult<Map> {
  if (cells.length > REGION_EDIT_LIMIT) return { map: tilemap, failure: 'work-budget' }
  if (
    !isCellPosition(anchor) ||
    !isValidTileStamp(stamp) ||
    !Number.isInteger(tileCount) ||
    tileCount < 0 ||
    tileCount > PINTA_MAP_FORMAT_LIMITS.maxTiles ||
    !cells.every(isCellPosition)
  )
    return { map: tilemap, failure: 'invalid-edit' }
  const edits: RegionCellEdit[] = []
  for (const { col, row } of cells) {
    const cell = stampTileAt(stamp, anchor, col, row)
    if (cell >= 0 && cellTile(cell) < tileCount) edits.push({ col, row, cell })
  }
  return tryEditMapCellBatch(tilemap, layerId, edits)
}
