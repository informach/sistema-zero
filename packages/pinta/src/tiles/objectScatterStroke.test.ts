import { expect, test } from 'bun:test'
import { createTilemapAsset } from '../core/project'
import { lineCells } from './cellGeometry'
import { ObjectScatterStroke } from './objectScatterStroke'
import { expandRegionMap, prepareMapRegions } from './regionMap'

function region(cols = 12, rows = 10) {
  const p = prepareMapRegions(
    createTilemapAsset({ name: 'mundo', tilesetId: 'tiles', cols: 2, rows: 2 }),
  )
  if (!p.ok) throw Error(p.reason)
  const e = expandRegionMap(p.map, { col: -4, row: -4, cols, rows })
  if (!e.ok) throw Error(e.reason)
  return e.map
}

test('amostras assinadas não colidem entre linhas e mantêm revisitas gratuitas', () => {
  const stroke = new ObjectScatterStroke(region(), 1)
  expect(stroke.add({ col: -4, row: -4 }, { col: 7, row: 5 })).toBeNull()
  expect(stroke.positions()).toEqual(lineCells({ col: -4, row: -4 }, { col: 7, row: 5 }))
  const previous = stroke.positions()
  expect(stroke.add({ col: 7, row: 5 }, { col: -4, row: -4 })).toBeNull()
  expect(stroke.positions()).toEqual(previous)
  expect(stroke.add({ col: 7, row: -4 }, { col: -4, row: -3 })).toBeNull()
  expect(stroke.positions()).toContainEqual({ col: -4, row: -3 })
})

test('círculo e ordem densos conservam as amostras do coletor anterior', () => {
  const map = createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 8, rows: 6 })
  for (const width of [1, 3, 5, 9]) {
    const stroke = new ObjectScatterStroke(map, width),
      expected = new Map<number, { col: number; row: number }>(),
      radius = Math.floor(width / 2)
    for (const [from, to] of [
      [
        { col: 0, row: 0 },
        { col: 7, row: 5 },
      ],
      [
        { col: 7, row: 5 },
        { col: 0, row: 4 },
      ],
    ] as const) {
      for (const center of lineCells(from, to))
        for (let dy = -radius; dy <= radius; dy++)
          for (let dx = -radius; dx <= radius; dx++) {
            const col = center.col + dx,
              row = center.row + dy
            if (
              dx * dx + dy * dy <= radius * radius &&
              col >= 0 &&
              row >= 0 &&
              col < map.cols &&
              row < map.rows
            )
              expected.set(row * map.cols + col, { col, row })
          }
      expect(stroke.add(from, to)).toBeNull()
      expect(stroke.positions()).toEqual([...expected.values()])
    }
  }
})

test('excesso recusa o segmento inteiro, torna o traço terminal e não aloca sua linha', () => {
  const stroke = new ObjectScatterStroke(region(10000, 10000), 1)
  expect(stroke.add({ col: -4, row: -4 }, { col: 1e12, row: -4 })).toBe('work-budget')
  expect(stroke.size).toBe(0)
  expect(stroke.add({ col: 0, row: 0 }, { col: 0, row: 0 })).toBe('work-budget')
  const invalid = new ObjectScatterStroke(region(), NaN)
  expect(invalid.add({ col: 0, row: 0 }, { col: 0, row: 0 })).toBe('invalid-edit')
  const invalidPoint = new ObjectScatterStroke(region(), 1)
  expect(invalidPoint.add({ col: 0.5, row: 0 }, { col: 0, row: 0 })).toBe('invalid-edit')
})

test('teto de destinos distintos é acumulado por gesto sem admissão parcial', () => {
  const stroke = new ObjectScatterStroke(region(10000, 10000), 1)
  for (let row = 0; row < 6; row++)
    expect(stroke.add({ col: 0, row }, { col: 9995, row })).toBeNull()
  const before = stroke.positions()
  expect(stroke.add({ col: 0, row: 6 }, { col: 9995, row: 6 })).toBe('work-budget')
  expect(stroke.positions()).toEqual(before)
})
