import { type PintaRegionBounds, parsePintaRegionBounds } from '@sistemazero/core/creations'
import { isValidCell } from './cell'
import type { TileCellReader } from './mapCells'
import { REGION_EDIT_LIMIT, type RegionCellEdit } from './regionCells'

export type TileFloodFillResult =
  | { ok: true; edits: RegionCellEdit[] }
  | { ok: false; reason: 'invalid-edit' | 'outside-map' | 'work-budget' }

/** Collect before committing: a refused gesture never leaves a partial flood. */
export function collectTileFloodFill(
  reader: TileCellReader,
  rawBounds: PintaRegionBounds,
  col: number,
  row: number,
  cell: number,
  maxWork = REGION_EDIT_LIMIT,
): TileFloodFillResult {
  const bounds = parsePintaRegionBounds(rawBounds)
  if (
    !bounds ||
    !Number.isInteger(col) ||
    !Number.isInteger(row) ||
    !isValidCell(cell) ||
    !Number.isInteger(maxWork) ||
    maxWork < 1 ||
    maxWork > REGION_EDIT_LIMIT
  )
    return { ok: false, reason: 'invalid-edit' }
  if (
    col < bounds.col ||
    row < bounds.row ||
    col >= bounds.col + bounds.cols ||
    row >= bounds.row + bounds.rows
  )
    return { ok: false, reason: 'outside-map' }
  const target = reader.at(col, row)
  if (!isValidCell(target)) return { ok: false, reason: 'invalid-edit' }
  if (target === cell) return { ok: true, edits: [] }
  const first = (row - bounds.row) * bounds.cols + col - bounds.col
  const queue = [first],
    seen = new Set<number>(),
    edits: RegionCellEdit[] = []
  // Small bounds use at most 64 KiB for visitation. Large sparse worlds keep
  // only the bounded visited set; never allocate their logical rectangle.
  const area = bounds.cols * bounds.rows
  const denseSeen = area <= maxWork ? new Uint8Array(area) : null
  if (denseSeen) denseSeen[first] = 1
  else seen.add(first)
  let visited = 1
  function enqueue(index: number): boolean {
    if (denseSeen ? denseSeen[index] !== 0 : seen.has(index)) return true
    if (visited >= maxWork) return false
    if (denseSeen) denseSeen[index] = 1
    else seen.add(index)
    visited++
    queue.push(index)
    return true
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head]!,
      x = index % bounds.cols,
      y = Math.floor(index / bounds.cols)
    const nextCol = bounds.col + x,
      nextRow = bounds.row + y
    if (reader.at(nextCol, nextRow) !== target) continue
    edits.push({ col: nextCol, row: nextRow, cell })
    if (
      (x > 0 && !enqueue(index - 1)) ||
      (x + 1 < bounds.cols && !enqueue(index + 1)) ||
      (y > 0 && !enqueue(index - bounds.cols)) ||
      (y + 1 < bounds.rows && !enqueue(index + bounds.cols))
    )
      return { ok: false, reason: 'work-budget' }
  }
  return { ok: true, edits }
}
