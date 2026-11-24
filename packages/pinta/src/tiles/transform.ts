import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, cellTile, makeCell } from './cell'
import { cellMatrix } from './chunks'
import type { TileStamp } from './stamp'
export type TileTransform = 'horizontal' | 'vertical' | 'rotate'
export function transformCell(cell: number, operation: TileTransform): number {
  if (cell < 0) return -1
  const [a, b, c, d] = cellMatrix(cell)
  const next =
    operation === 'horizontal'
      ? [-a, b, -c, d]
      : operation === 'vertical'
        ? [a, -b, c, -d]
        : [-b, a, -d, c]
  for (let i = 0; i < 8; i++) {
    const flags = (i & 1 ? CELL_FLIP_H : 0) | (i & 2 ? CELL_FLIP_V : 0) | (i & 4 ? CELL_FLIP_D : 0)
    if (cellMatrix(flags).every((v, n) => v === next[n])) return makeCell(cellTile(cell), flags)
  }
  return cell
}
export function transformStamp(stamp: TileStamp, operation: TileTransform): TileStamp {
  const cols = operation === 'rotate' ? stamp.rows : stamp.cols,
    rows = operation === 'rotate' ? stamp.cols : stamp.rows
  const tiles = new Int16Array(cols * rows).fill(-1)
  for (let r = 0; r < stamp.rows; r++)
    for (let c = 0; c < stamp.cols; c++) {
      const x =
        operation === 'horizontal'
          ? stamp.cols - 1 - c
          : operation === 'rotate'
            ? stamp.rows - 1 - r
            : c
      const y = operation === 'vertical' ? stamp.rows - 1 - r : operation === 'rotate' ? c : r
      tiles[y * cols + x] = transformCell(stamp.tiles[r * stamp.cols + c] ?? -1, operation)
    }
  return { cols, rows, tiles }
}
