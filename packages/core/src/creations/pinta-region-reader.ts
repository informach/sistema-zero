/** Queries on boundary-admitted immutable region grids. No document writer is activated here. */
import { PINTA_REGION_SIDE, type PintaRegionBounds, type PintaRegionCells } from './pinta-regions'

type RegionChunk = PintaRegionCells['chunks'][number]
const EMPTY_CELL = -1
/** Memory-index key only, independent of account/storage authority keys. */
export const regionChunkKey = (col: number, row: number) => `${col},${row}`
export const compareRegionChunks = (a: RegionChunk, b: RegionChunk) =>
  a.row - b.row || a.col - b.col
export const indexRegionChunks = (grid: PintaRegionCells) =>
  new Map(grid.chunks.map((chunk) => [regionChunkKey(chunk.col, chunk.row), chunk]))

const keyOf = regionChunkKey
const order = compareRegionChunks
const indexOf = indexRegionChunks

function readChunkCell(chunk: RegionChunk | undefined, col: number, row: number): number {
  if (!chunk) return EMPTY_CELL
  return (
    chunk.cells[
      (row - chunk.row * PINTA_REGION_SIDE) * PINTA_REGION_SIDE +
        col -
        chunk.col * PINTA_REGION_SIDE
    ] ?? EMPTY_CELL
  )
}

/** Allocation-free point lookup. Reuse an indexed reader for a gesture/frame. */
export function regionCellAt(grid: PintaRegionCells, col: number, row: number): number {
  if (!Number.isInteger(col) || !Number.isInteger(row)) return EMPTY_CELL
  const chunkCol = Math.floor(col / PINTA_REGION_SIDE),
    chunkRow = Math.floor(row / PINTA_REGION_SIDE)
  return readChunkCell(
    grid.chunks.find((chunk) => chunk.col === chunkCol && chunk.row === chunkRow),
    col,
    row,
  )
}

/**
 * Reuse this reader throughout a gesture/frame. Its bounded index belongs to
 * the caller; no global cache retains documents or their undo history.
 * The input is an immutable grid already validated at the document boundary.
 */
export function createRegionCellReader(grid: PintaRegionCells) {
  const chunks = indexOf(grid)
  return {
    at(col: number, row: number): number {
      if (!Number.isInteger(col) || !Number.isInteger(row)) return EMPTY_CELL
      const chunkCol = Math.floor(col / PINTA_REGION_SIDE),
        chunkRow = Math.floor(row / PINTA_REGION_SIDE)
      const chunk = chunks.get(keyOf(chunkCol, chunkRow))
      return readChunkCell(chunk, col, row)
    },
    /** Visits occupied cells in deterministic chunk order; never scans world gaps. */
    visitOccupied(
      rect: PintaRegionBounds,
      visit: (cell: number, col: number, row: number) => void,
      traversal?: 'row-major',
    ): void {
      if (
        ![rect.col, rect.row, rect.cols, rect.rows].every(Number.isSafeInteger) ||
        rect.cols < 1 ||
        rect.rows < 1
      )
        return
      const ordered = [...grid.chunks].sort(order)
      const visitChunk = (chunk: RegionChunk, firstRow: number, endRow: number): void => {
        const originCol = chunk.col * PINTA_REGION_SIDE,
          originRow = chunk.row * PINTA_REGION_SIDE
        const left = Math.max(rect.col, originCol),
          top = Math.max(firstRow, originRow)
        const right = Math.min(rect.col + rect.cols, originCol + PINTA_REGION_SIDE)
        const bottom = Math.min(endRow, originRow + PINTA_REGION_SIDE)
        for (let row = top; row < bottom; row++)
          for (let col = left; col < right; col++) {
            const cell = chunk.cells[(row - originRow) * PINTA_REGION_SIDE + col - originCol]!
            if (cell !== EMPTY_CELL) visit(cell, col, row)
          }
      }
      if (traversal !== 'row-major') {
        for (const chunk of ordered) visitChunk(chunk, rect.row, rect.row + rect.rows)
        return
      }
      // Interleave only chunks in the same stored row band. Empty world gaps
      // and per-cell sorting/collections never enter the image compositor.
      for (let first = 0; first < ordered.length; ) {
        const chunkRow = ordered[first]!.row
        let end = first + 1
        while (end < ordered.length && ordered[end]!.row === chunkRow) end++
        const top = Math.max(rect.row, chunkRow * PINTA_REGION_SIDE),
          bottom = Math.min(rect.row + rect.rows, (chunkRow + 1) * PINTA_REGION_SIDE)
        for (let row = top; row < bottom; row++)
          for (let index = first; index < end; index++) visitChunk(ordered[index]!, row, row + 1)
        first = end
      }
    },
  }
}
