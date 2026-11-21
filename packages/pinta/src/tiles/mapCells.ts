import {
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_LIMITS,
  type PintaRegionBounds,
  parsePintaRegionBounds,
} from '@sistemazero/core/creations'
import type { TilemapCells } from '../core/project'
import { EMPTY_CELL } from './cell'
import { createRegionCellReader } from './regionCells'

export interface TileCellReader {
  readonly allocatedCellCount: number
  readonly allocatedCellBytes: number
  at(col: number, row: number): number
  visitOccupied(
    rect: PintaRegionBounds,
    visit: (cell: number, col: number, row: number) => void,
  ): void
}

function inside(bounds: PintaRegionBounds, col: number, row: number): boolean {
  return (
    Number.isInteger(col) &&
    Number.isInteger(row) &&
    col >= bounds.col &&
    row >= bounds.row &&
    col < bounds.col + bounds.cols &&
    row < bounds.row + bounds.rows
  )
}

/** Allocation-free dense lookup for existing single-cell consumers. */
export function readDenseTileCell(
  cells: Int16Array,
  cols: number,
  rows: number,
  col: number,
  row: number,
  originCol = 0,
  originRow = 0,
): number {
  if (
    !Number.isInteger(col) ||
    !Number.isInteger(row) ||
    col < originCol ||
    row < originRow ||
    col >= originCol + cols ||
    row >= originRow + rows
  )
    return EMPTY_CELL
  return cells[(row - originRow) * cols + col - originCol] ?? EMPTY_CELL
}

function denseReader(cells: Int16Array, bounds: PintaRegionBounds) {
  return {
    at: (col: number, row: number) =>
      readDenseTileCell(cells, bounds.cols, bounds.rows, col, row, bounds.col, bounds.row),
    visitOccupied(
      rect: PintaRegionBounds,
      visit: (cell: number, col: number, row: number) => void,
    ) {
      for (let y = rect.row; y < rect.row + rect.rows; y++)
        for (let x = rect.col; x < rect.col + rect.cols; x++) {
          const cell = cells[(y - bounds.row) * bounds.cols + x - bounds.col] ?? EMPTY_CELL
          if (cell !== EMPTY_CELL) visit(cell, x, y)
        }
    },
  }
}

/**
 * A bounded view of an immutable, boundary-validated grid. Keep one reader per
 * gesture/frame; its sparse index retains only this snapshot, never global history.
 * Viewports may exceed the logical map; visitation clips before scanning cells.
 * Sparse visitation uses deterministic chunk order, not global row-major order.
 */
export function createTileCellReader(
  cells: TilemapCells,
  rawBounds: PintaRegionBounds,
): TileCellReader {
  const bounds = parsePintaRegionBounds(rawBounds)
  if (!bounds) throw new RangeError('Invalid tile grid bounds')
  const allocatedCellCount =
    cells instanceof Int16Array ? cells.length : cells.chunks.length * PINTA_REGION_CELL_COUNT
  if (
    allocatedCellCount > PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CELL_COUNT ||
    (cells instanceof Int16Array && cells.length !== bounds.cols * bounds.rows)
  )
    throw new RangeError('Tile grid storage exceeds its bounds or budget')
  const storage =
    cells instanceof Int16Array ? denseReader(cells, bounds) : createRegionCellReader(cells)
  const right = bounds.col + bounds.cols,
    bottom = bounds.row + bounds.rows
  return {
    allocatedCellCount,
    allocatedCellBytes: allocatedCellCount * Int16Array.BYTES_PER_ELEMENT,
    at(col, row) {
      if (!inside(bounds, col, row)) return EMPTY_CELL
      return storage.at(col, row)
    },
    visitOccupied(rect, visit) {
      if (
        ![rect.col, rect.row, rect.cols, rect.rows].every(Number.isSafeInteger) ||
        rect.cols < 1 ||
        rect.rows < 1 ||
        !Number.isSafeInteger(rect.col + rect.cols) ||
        !Number.isSafeInteger(rect.row + rect.rows)
      )
        return
      const col = Math.max(bounds.col, rect.col),
        row = Math.max(bounds.row, rect.row),
        endCol = Math.min(right, rect.col + rect.cols),
        endRow = Math.min(bottom, rect.row + rect.rows)
      if (endCol <= col || endRow <= row) return
      storage.visitOccupied({ col, row, cols: endCol - col, rows: endRow - row }, visit)
    },
  }
}
