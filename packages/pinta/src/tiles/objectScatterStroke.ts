import { type CellPos, cellInRect, lineCells } from './cellGeometry'
import { type AuthorMap, isCellPosition } from './mapCellEdits'
import { mapCellBounds } from './mapCells'
import { REGION_EDIT_LIMIT } from './regionCells'

/** Distinct world cells in first-visit order, bounded before expanding a segment. */
export class ObjectScatterStroke {
  private readonly bounds
  private readonly radius: number
  private readonly cells = new Map<number, CellPos>()
  private failure: 'invalid-edit' | 'work-budget' | null = null

  constructor(map: AuthorMap, width: number) {
    this.bounds = mapCellBounds(map)
    this.radius = Math.floor(Math.max(1, Math.min(9, width)) / 2)
    if (!Number.isFinite(width)) this.failure = 'invalid-edit'
  }

  get size(): number {
    return this.cells.size
  }

  positions(): CellPos[] {
    return [...this.cells.values()]
  }

  private refuse(reason: 'invalid-edit' | 'work-budget') {
    this.failure = reason
    return reason
  }

  add(from: CellPos, to: CellPos): 'invalid-edit' | 'work-budget' | null {
    if (this.failure) return this.failure
    if (!isCellPosition(from) || !isCellPosition(to)) return this.refuse('invalid-edit')
    if (Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row)) + 1 > REGION_EDIT_LIMIT)
      return this.refuse('work-budget')
    const pending = new Map<number, CellPos>()
    for (const center of lineCells(from, to))
      for (let dy = -this.radius; dy <= this.radius; dy++)
        for (let dx = -this.radius; dx <= this.radius; dx++) {
          if (dx * dx + dy * dy > this.radius * this.radius) continue
          const cell = { col: center.col + dx, row: center.row + dy }
          if (!cellInRect(this.bounds, cell)) continue
          const key = (cell.row - this.bounds.row) * this.bounds.cols + cell.col - this.bounds.col
          if (this.cells.has(key) || pending.has(key)) continue
          if (this.cells.size + pending.size >= REGION_EDIT_LIMIT) return this.refuse('work-budget')
          pending.set(key, cell)
        }
    for (const [key, cell] of pending) this.cells.set(key, cell)
    return null
  }
}
