import {
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
  type PintaRegionBounds,
  type PintaRegionCells,
  parsePintaRegionBounds,
  parsePintaRegionLayers,
} from '@sistemazero/core/creations'
import { EMPTY_CELL, isValidCell } from './cell'

/** A gesture may inspect at most the previous maximum dense map's area. */
export const REGION_EDIT_LIMIT = 256 * 256
export interface RegionCellEdit {
  col: number
  row: number
  cell: number
}
type RegionChunk = PintaRegionCells['chunks'][number]
export type RegionEditResult =
  | { ok: true; cells: PintaRegionCells }
  | { ok: false; reason: 'invalid-edit' | 'outside-map' | 'work-budget' | 'cell-budget' }

const keyOf = (col: number, row: number) => `${col},${row}`
const order = (a: RegionChunk, b: RegionChunk) => a.row - b.row || a.col - b.col
const validBudget = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= PINTA_REGION_LIMITS.maxChunks
const indexOf = (grid: PintaRegionCells) =>
  new Map(grid.chunks.map((chunk) => [keyOf(chunk.col, chunk.row), chunk]))

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
    ): void {
      if (
        ![rect.col, rect.row, rect.cols, rect.rows].every(Number.isSafeInteger) ||
        rect.cols < 1 ||
        rect.rows < 1
      )
        return
      for (const chunk of [...grid.chunks].sort(order)) {
        const originCol = chunk.col * PINTA_REGION_SIDE,
          originRow = chunk.row * PINTA_REGION_SIDE
        const left = Math.max(rect.col, originCol),
          top = Math.max(rect.row, originRow)
        const right = Math.min(rect.col + rect.cols, originCol + PINTA_REGION_SIDE)
        const bottom = Math.min(rect.row + rect.rows, originRow + PINTA_REGION_SIDE)
        for (let row = top; row < bottom; row++)
          for (let col = left; col < right; col++) {
            const cell = chunk.cells[(row - originRow) * PINTA_REGION_SIDE + col - originCol]!
            if (cell !== EMPTY_CELL) visit(cell, col, row)
          }
      }
    },
  }
}

/** Atomic admission, last edit wins, one clone per changed chunk. */
export function editRegionCells(
  grid: PintaRegionCells,
  rawBounds: PintaRegionBounds,
  edits: readonly RegionCellEdit[],
  maxChunks: number = PINTA_REGION_LIMITS.maxChunks,
): RegionEditResult {
  if (edits.length > REGION_EDIT_LIMIT) return { ok: false, reason: 'work-budget' }
  const bounds = parsePintaRegionBounds(rawBounds)
  if (!bounds || !validBudget(maxChunks)) return { ok: false, reason: 'invalid-edit' }
  const original = indexOf(grid)
  const patches = new Map<string, { col: number; row: number; values: Map<number, number> }>()
  for (const point of edits) {
    if (
      !point ||
      !Number.isInteger(point.col) ||
      !Number.isInteger(point.row) ||
      !isValidCell(point.cell)
    )
      return { ok: false, reason: 'invalid-edit' }
    if (
      point.col < bounds.col ||
      point.row < bounds.row ||
      point.col >= bounds.col + bounds.cols ||
      point.row >= bounds.row + bounds.rows
    )
      return { ok: false, reason: 'outside-map' }
    const col = Math.floor(point.col / PINTA_REGION_SIDE),
      row = Math.floor(point.row / PINTA_REGION_SIDE)
    const key = keyOf(col, row)
    let patch = patches.get(key)
    if (!patch) {
      patch = { col, row, values: new Map() }
      patches.set(key, patch)
    }
    patch.values.set(
      (point.row - row * PINTA_REGION_SIDE) * PINTA_REGION_SIDE +
        point.col -
        col * PINTA_REGION_SIDE,
      point.cell,
    )
  }
  const changes: Array<{
    key: string
    patch: NonNullable<ReturnType<typeof patches.get>>
    occupied: boolean
  }> = []
  let count = original.size
  for (const [key, patch] of patches) {
    const previous = original.get(key)
    if (!previous) {
      // A large gesture can touch many empty world regions. Inspect its edits,
      // never 1024 nonexistent cells per region, before deciding admission.
      if ([...patch.values.values()].some((cell) => cell !== EMPTY_CELL)) {
        count++
        changes.push({ key, patch, occupied: true })
      }
      continue
    }
    let occupied = false,
      changed = false
    for (let index = 0; index < PINTA_REGION_CELL_COUNT; index++) {
      const before = previous?.cells[index] ?? EMPTY_CELL
      const after = patch.values.get(index) ?? before
      occupied ||= after !== EMPTY_CELL
      changed ||= before !== after
    }
    if (!changed) continue
    count += Number(occupied) - Number(previous !== undefined)
    changes.push({ key, patch, occupied })
  }
  if (count > maxChunks) return { ok: false, reason: 'cell-budget' }
  if (!changes.length) return { ok: true, cells: grid }
  const next = new Map(original)
  for (const { key, patch, occupied } of changes) {
    if (!occupied) {
      next.delete(key)
      continue
    }
    const cells =
      original.get(key)?.cells.slice() ?? new Int16Array(PINTA_REGION_CELL_COUNT).fill(EMPTY_CELL)
    for (const [index, value] of patch.values) cells[index] = value
    next.set(key, { col: patch.col, row: patch.row, cells })
  }
  return { ok: true, cells: { ...grid, chunks: [...next.values()].sort(order) } }
}

/** Explicit migration; counts occupied chunks before allocating their buffers. */
export function denseToRegionCells(
  cells: Int16Array,
  rawBounds: PintaRegionBounds,
  maxChunks: number = PINTA_REGION_LIMITS.maxChunks,
): PintaRegionCells | null {
  const bounds = parsePintaRegionBounds(rawBounds)
  if (
    !bounds ||
    !validBudget(maxChunks) ||
    cells.length !== bounds.cols * bounds.rows ||
    cells.length > PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CELL_COUNT
  )
    return null
  const headers = new Map<string, { col: number; row: number }>()
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index]!
    if (!isValidCell(cell)) return null
    if (cell === EMPTY_CELL) continue
    const col = Math.floor((bounds.col + (index % bounds.cols)) / PINTA_REGION_SIDE)
    const row = Math.floor((bounds.row + Math.floor(index / bounds.cols)) / PINTA_REGION_SIDE)
    headers.set(keyOf(col, row), { col, row })
    if (headers.size > maxChunks) return null
  }
  const chunks = new Map<string, RegionChunk>()
  for (const [key, header] of headers)
    chunks.set(key, { ...header, cells: new Int16Array(PINTA_REGION_CELL_COUNT).fill(EMPTY_CELL) })
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index]!
    if (cell === EMPTY_CELL) continue
    const col = bounds.col + (index % bounds.cols),
      row = bounds.row + Math.floor(index / bounds.cols)
    const chunkCol = Math.floor(col / PINTA_REGION_SIDE),
      chunkRow = Math.floor(row / PINTA_REGION_SIDE)
    chunks.get(keyOf(chunkCol, chunkRow))!.cells[
      (row - chunkRow * PINTA_REGION_SIDE) * PINTA_REGION_SIDE + col - chunkCol * PINTA_REGION_SIDE
    ] = cell
  }
  return { kind: 'regions', version: 1, side: 32, chunks: [...chunks.values()].sort(order) }
}

/** A caller must explicitly budget a dense selection/consumer; large gaps stay sparse. */
export function regionCellsToDense(
  grid: PintaRegionCells,
  rawBounds: PintaRegionBounds,
  maxCells: number,
): Int16Array | null {
  const bounds = parsePintaRegionBounds(rawBounds)
  if (
    !bounds ||
    !Number.isInteger(maxCells) ||
    maxCells < 0 ||
    maxCells > PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CELL_COUNT ||
    bounds.cols * bounds.rows > maxCells
  )
    return null
  if (!parsePintaRegionLayers([grid], bounds)) return null
  const cells = new Int16Array(bounds.cols * bounds.rows).fill(EMPTY_CELL)
  createRegionCellReader(grid).visitOccupied(bounds, (cell, col, row) => {
    cells[(row - bounds.row) * bounds.cols + col - bounds.col] = cell
  })
  return cells
}
