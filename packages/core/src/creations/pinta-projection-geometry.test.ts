import { describe, expect, test } from 'bun:test'
import { type PintaMapProjection, PintaMapProjectionSchema } from './pinta-map-projection'
import { createPintaProjectionGeometry } from './pinta-projection-geometry'

function hex(staggerAxis: 'x' | 'y', staggerIndex: 'even' | 'odd'): PintaMapProjection {
  return {
    kind: 'hexagonal',
    tileWidth: 33,
    tileHeight: 35,
    hexSideLength: 16,
    staggerAxis,
    staggerIndex,
  }
}

const candidates = [
  { kind: 'orthogonal', tileWidth: 32, tileHeight: 16 },
  { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
  hex('x', 'even'),
  hex('x', 'odd'),
  hex('y', 'even'),
  hex('y', 'odd'),
] satisfies PintaMapProjection[]

test('closed projection descriptor refuses fields and dimensions that the footprint cannot represent', () => {
  for (const descriptor of candidates)
    expect(PintaMapProjectionSchema.parse(descriptor)).toEqual(descriptor)
  expect(PintaMapProjectionSchema.safeParse({ ...candidates[0], staggerAxis: 'x' }).success).toBe(
    false,
  )
  expect(PintaMapProjectionSchema.safeParse({ ...candidates[1], tileHeight: 0 }).success).toBe(
    false,
  )
  expect(
    PintaMapProjectionSchema.safeParse({ ...hex('x', 'odd'), hexSideLength: 32 }).success,
  ).toBe(false)
  expect(PintaMapProjectionSchema.safeParse({ ...hex('y', 'even'), tileWidth: 1 }).success).toBe(
    false,
  )
})

test('fixed signed origins, including Tiled rounding on odd hex pixel dimensions', () => {
  const diamond = createPintaProjectionGeometry(candidates[1]!)
  expect(diamond.center(0, 0)).toEqual({ x: 0, y: 8 })
  expect(diamond.center(-2, 3)).toEqual({ x: -80, y: 16 })
  expect(diamond.pick(-80, 16)).toEqual({ col: -2, row: 3 })
  const columns = createPintaProjectionGeometry(hex('x', 'odd'))
  expect(columns.center(-1, 0)).toEqual({ x: -8, y: 34 })
  expect(columns.center(-2, 0)).toEqual({ x: -32, y: 17 })
  const rows = createPintaProjectionGeometry(hex('y', 'even'))
  expect(rows.center(0, -1)).toEqual({ x: 16, y: -8 })
  expect(rows.center(0, -2)).toEqual({ x: 32, y: -33 })
})

for (const projection of candidates) {
  const label =
    projection.kind === 'hexagonal'
      ? `hex ${projection.staggerAxis} ${projection.staggerIndex}`
      : projection.kind
  describe(label, () => {
    const geometry = createPintaProjectionGeometry(projection)
    const map = { col: -35, row: -36, cols: 69, rows: 72 }
    test('signed cells round trip across both parity and region boundaries', () => {
      for (const row of [-33, -32, -31, -2, -1, 0, 1, 2, 31, 32, 33])
        for (const col of [-33, -32, -31, -2, -1, 0, 1, 2, 31, 32, 33]) {
          const { x, y } = geometry.center(col, row)
          expect(geometry.pick(x, y, map)).toEqual({ col, row })
        }
      const outside = geometry.center(map.col - 1, map.row)
      expect(geometry.pick(outside.x, outside.y, map)).toBeNull()
      expect(geometry.pick(Infinity, 0, map)).toBeNull()
    })

    test('adjacent terrain edges touch, with reciprocal neighbors in signed space', () => {
      for (const col of [-2, -1, 0, 1])
        for (const row of [-2, -1, 0, 1]) {
          const origin = geometry.polygon(col, row)
          const adjacent = geometry.neighbors(col, row)
          expect(adjacent).toHaveLength(origin.length)
          for (const [index, neighbor] of adjacent.entries()) {
            const polygon = geometry.polygon(neighbor.col, neighbor.row)
            expect(polygon).toContainEqual(origin[index]!)
            expect(polygon).toContainEqual(origin[(index + 1) % origin.length]!)
            expect(geometry.neighbors(neighbor.col, neighbor.row)).toContainEqual({ col, row })
          }
        }
    })

    test('world extent and viewport include all intersecting cells without iterating world gaps', () => {
      const region = { col: -2, row: -3, cols: 5, rows: 6 }
      const rect = { x: -11, y: -20, width: 52, height: 39 }
      const visible = geometry.visibleCells(region, rect)!
      const polygon = []
      for (let row = region.row; row < region.row + region.rows; row++)
        for (let col = region.col; col < region.col + region.cols; col++) {
          const points = geometry.polygon(col, row)
          polygon.push(...points)
          const center = geometry.center(col, row)
          if (
            center.x >= rect.x &&
            center.y >= rect.y &&
            center.x < rect.x + rect.width &&
            center.y < rect.y + rect.height
          ) {
            expect(col).toBeGreaterThanOrEqual(visible.col)
            expect(col).toBeLessThan(visible.col + visible.cols)
            expect(row).toBeGreaterThanOrEqual(visible.row)
            expect(row).toBeLessThan(visible.row + visible.rows)
          }
        }
      const xs = polygon.map((p) => p.x)
      const ys = polygon.map((p) => p.y)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      expect(geometry.worldBounds(region)).toEqual({
        x,
        y,
        width: Math.max(...xs) - x,
        height: Math.max(...ys) - y,
      })
      expect(geometry.visibleCells(region, { ...rect, x: 1e7 })).toBeNull()
      expect(geometry.visibleCells(region, { ...rect, height: 0 })).toBeNull()
    })
  })
}
