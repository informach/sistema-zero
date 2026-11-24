import type { PintaMapProjection } from './pinta-map-projection'
import type { PintaRegionBounds } from './pinta-regions'

export type PintaGridPoint = { col: number; row: number }
export type PintaWorldPoint = { x: number; y: number }
export type PintaWorldRect = PintaWorldPoint & { width: number; height: number }

function inBounds(bounds: PintaRegionBounds, col: number, row: number): boolean {
  return (
    col >= bounds.col &&
    row >= bounds.row &&
    col < bounds.col + bounds.cols &&
    row < bounds.row + bounds.rows
  )
}

/** One geometry per admitted snapshot. Cell (0,0) is fixed when map bounds expand. */
export function createPintaProjectionGeometry(projection: PintaMapProjection) {
  const hex = projection.kind === 'hexagonal'
  const iso = projection.kind === 'isometric'
  const axisX = hex && projection.staggerAxis === 'x'
  const axisY = hex && projection.staggerAxis === 'y'
  const sideX = axisX ? projection.hexSideLength : 0
  const sideY = axisY ? projection.hexSideLength : 0
  const halfSideX = (projection.tileWidth - sideX) / 2
  const halfSideY = (projection.tileHeight - sideY) / 2
  // Tiled rounds its hex side offsets down, including on the unstaggered axis.
  const offsetX = hex ? Math.floor(halfSideX) : halfSideX
  const offsetY = hex ? Math.floor(halfSideY) : halfSideY
  const width = 2 * offsetX + sideX
  const height = 2 * offsetY + sideY
  const halfWidth = width / 2
  const halfHeight = height / 2
  const stepX = axisX ? offsetX + sideX : width
  const stepY = axisY ? offsetY + sideY : height
  const staggerParity = hex && projection.staggerIndex === 'odd' ? 1 : 0
  const stagger = (index: number) => (index & 1) === staggerParity

  function center(col: number, row: number): PintaWorldPoint {
    if (iso) return { x: (col - row) * halfWidth, y: (col + row + 1) * halfHeight }
    return {
      x: col * stepX + halfWidth + (axisY && stagger(row) ? halfWidth : 0),
      y: row * stepY + halfHeight + (axisX && stagger(col) ? halfHeight : 0),
    }
  }

  const outline = iso
    ? [
        [0, -halfHeight],
        [halfWidth, 0],
        [0, halfHeight],
        [-halfWidth, 0],
      ]
    : axisX
      ? [
          [-halfWidth, 0],
          [-sideX / 2, -halfHeight],
          [sideX / 2, -halfHeight],
          [halfWidth, 0],
          [sideX / 2, halfHeight],
          [-sideX / 2, halfHeight],
        ]
      : axisY
        ? [
            [0, -halfHeight],
            [halfWidth, -sideY / 2],
            [halfWidth, sideY / 2],
            [0, halfHeight],
            [-halfWidth, sideY / 2],
            [-halfWidth, -sideY / 2],
          ]
        : [
            [-halfWidth, -halfHeight],
            [halfWidth, -halfHeight],
            [halfWidth, halfHeight],
            [-halfWidth, halfHeight],
          ]

  function containsHex(x: number, y: number, col: number, row: number): boolean {
    const origin = center(col, row)
    const dx = Math.abs(x - origin.x)
    const dy = Math.abs(y - origin.y)
    if (dx > halfWidth || dy > halfHeight) return false
    if (axisX) return (dx - sideX / 2) * halfHeight + dy * offsetX <= offsetX * halfHeight
    return (dy - sideY / 2) * halfWidth + dx * offsetY <= offsetY * halfWidth
  }

  return {
    cellWidth: width,
    cellHeight: height,
    center,
    /** Clockwise world-pixel footprint, also used for narrow-phase collision. */
    polygon(col: number, row: number): PintaWorldPoint[] {
      const origin = center(col, row)
      return outline.map(([x, y]) => ({ x: origin.x + x!, y: origin.y + y! }))
    },
    pick(x: number, y: number, bounds?: PintaRegionBounds): PintaGridPoint | null {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null
      const col = Math.floor(iso ? x / width + y / height : x / stepX)
      const row = Math.floor(iso ? y / height - x / width : y / stepY)
      if (!Number.isSafeInteger(col) || !Number.isSafeInteger(row)) return null
      if (!hex) return bounds && !inBounds(bounds, col, row) ? null : { col, row }
      // At most two stagger steps can contain the point on either axis.
      // On a shared edge the earlier signed row/column wins.
      for (let r = row - 1; r <= row; r++)
        for (let c = col - 1; c <= col; c++)
          if ((!bounds || inBounds(bounds, c, r)) && containsHex(x, y, c, r))
            return { col: c, row: r }
      return null
    },
    /** Conservative cell rectangle for sparse traversal. Sprite overhang is caller padding. */
    visibleCells(bounds: PintaRegionBounds, rect: PintaWorldRect): PintaRegionBounds | null {
      const endX = rect.x + rect.width
      const endY = rect.y + rect.height
      if (
        ![rect.x, rect.y, endX, endY].every(Number.isFinite) ||
        rect.width <= 0 ||
        rect.height <= 0
      )
        return null
      const startCol = iso
        ? Math.floor(rect.x / width + rect.y / height)
        : hex
          ? Math.floor((rect.x - width - (axisY ? halfWidth : 0)) / stepX) + 1
          : Math.floor(rect.x / width)
      const startRow = iso
        ? Math.floor(rect.y / height - endX / width)
        : hex
          ? Math.floor((rect.y - height - (axisX ? halfHeight : 0)) / stepY) + 1
          : Math.floor(rect.y / height)
      const endCol = iso ? Math.ceil(endX / width + endY / height) : Math.ceil(endX / stepX)
      const endRow = iso ? Math.ceil(endY / height - rect.x / width) : Math.ceil(endY / stepY)
      const col = Math.max(bounds.col, startCol)
      const row = Math.max(bounds.row, startRow)
      const cols = Math.min(bounds.col + bounds.cols, endCol) - col
      const rows = Math.min(bounds.row + bounds.rows, endRow) - row
      return cols > 0 && rows > 0 ? { col, row, cols, rows } : null
    },
    /** World bounds in constant time, including both parities along a staggered edge. */
    worldBounds(bounds: PintaRegionBounds): PintaWorldRect {
      const lastCol = bounds.col + bounds.cols - 1
      const lastRow = bounds.row + bounds.rows - 1
      const first = center(bounds.col, bounds.row)
      const last = center(lastCol, lastRow)
      let x = first.x
      let y = first.y
      let right = last.x
      let bottom = last.y
      if (iso) {
        x = center(bounds.col, lastRow).x
        right = center(lastCol, bounds.row).x
      }
      if (axisY && bounds.rows > 1) {
        x = bounds.col * width + halfWidth
        right = (lastCol + 1) * width
      }
      if (axisX && bounds.cols > 1) {
        y = bounds.row * height + halfHeight
        bottom = (lastRow + 1) * height
      }
      return {
        x: x - halfWidth,
        y: y - halfHeight,
        width: right - x + width,
        height: bottom - y + height,
      }
    },
    /** Adjacent cell edges, clockwise from the first footprint edge. */
    neighbors(col: number, row: number): PintaGridPoint[] {
      const across = axisX ? row + (stagger(col) ? 1 : -1) : col + (stagger(row) ? 1 : -1)
      if (axisX) {
        const top = Math.min(row, across),
          bottom = Math.max(row, across)
        return [
          { col: col - 1, row: top },
          { col, row: row - 1 },
          { col: col + 1, row: top },
          { col: col + 1, row: bottom },
          { col, row: row + 1 },
          { col: col - 1, row: bottom },
        ]
      }
      if (axisY) {
        const left = Math.min(col, across),
          right = Math.max(col, across)
        return [
          { col: right, row: row - 1 },
          { col: col + 1, row },
          { col: right, row: row + 1 },
          { col: left, row: row + 1 },
          { col: col - 1, row },
          { col: left, row: row - 1 },
        ]
      }
      return [
        { col, row: row - 1 },
        { col: col + 1, row },
        { col, row: row + 1 },
        { col: col - 1, row },
      ]
    },
    drawOrder(a: PintaGridPoint, b: PintaGridPoint): number {
      const left = center(a.col, a.row)
      const right = center(b.col, b.row)
      return left.y - right.y || left.x - right.x
    },
  }
}
